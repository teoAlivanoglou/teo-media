import type { IDebuggable, IService } from './container';
import type { IImageService } from './images';
import type { ICompositionService } from './composition';
import type { ITextureService } from './textures';
import type { IRenderService } from './render';
import type { DrawItem, ImageId, Layer } from '../types/core';
import { get } from 'svelte/store';

export interface ISyncService extends IService, IDebuggable {
	start(): void;
	stop(): void;

	refreshTextures(imageIds?: ImageId[]): Promise<void>;
	rebuildDrawList(): void;
}

export class SyncService implements ISyncService {
	private debug = false;
	private unsub: Array<() => void> = [];

	constructor(
		private images: IImageService,
		private comp: ICompositionService,
		private textures: ITextureService,
		private render: IRenderService
	) {}

	setDebug(enabled: boolean): void {
		this.debug = !!enabled;
	}
	getDebug(): boolean {
		return this.debug;
	}

	start(): void {
		const u1 = this.comp.composition.subscribe(() => {
			this.rebuildDrawList();
		});
		const u2 = this.images.order.subscribe(() => {
			this.rebuildDrawList();
		});
		this.unsub.push(u1, u2);
		this.rebuildDrawList();
	}

	stop(): void {
		for (const u of this.unsub) {
			try {
				u();
			} catch (e) {
				if (this.debug) console.warn('[Sync] unsubscribe failed', e);
			}
		}
		this.unsub = [];
	}

	async refreshTextures(imageIds?: ImageId[]): Promise<void> {
		const compVal = get(this.comp.composition);
		const ids = new Set<ImageId>();
		for (const layer of compVal.layers) {
			if (imageIds && !imageIds.includes(layer.imageId)) continue;
			ids.add(layer.imageId);
		}

		const recMap = get(this.images.images);
		for (const id of ids) {
			const rec = recMap.get(id);
			if (!rec) continue;
			try {
				const dom = await this.images.acquireDomImage(id, rec.binary);
				await this.textures.ensureForImage(id, { domImage: dom });
			} catch (e) {
				if (this.debug) console.warn('[Sync] texture ensure failed', id, e);
			}
		}
	}

	rebuildDrawList(): void {
		const compVal = get(this.comp.composition);

		// Ensure textures asynchronously
		this.refreshTextures()
			.then(() => this.render.requestFrame())
			.catch((e) => {
				if (this.debug) console.warn('[Sync] refreshTextures error', e);
				this.render.requestFrame();
			});

		const items: DrawItem[] = [];
		for (const layer of compVal.layers) {
			if (!layer.visible) continue;
			items.push({
				layerId: layer.id,
				textureId: undefined, // will be bound once ensured
				visible: true,
				opacity: layer.opacity,
				blend: layer.blend
			});
		}

		this.render.setBackground(compVal.background);
		this.render.setDrawList(items);
		this.render.requestFrame();

		if (this.debug) console.info('[Sync] draw list rebuilt', items.length);
	}
}
