import { writable, type Writable } from 'svelte/store';
import type { IDebuggable, IService } from './container';
import type { Composition, Layer, LayerId, Size, ImageId } from '../types/core';
import { newCompositionId, newLayerId, nowTs } from '../utils/id';

export interface ICompositionService extends IService, IDebuggable {
	readonly composition: Writable<Composition>;

	setOutputSize(size: Size): void;
	setBackground(bg: Composition['background']): void;

	addLayer(imageId: ImageId, init?: Partial<Layer>, index?: number): Layer;
	removeLayer(layerId: LayerId): void;
	reorderLayers(newOrder: LayerId[]): void;
	updateLayer(layerId: LayerId, patch: Partial<Layer>): Layer;

	setLayerEffects(layerId: LayerId, effects: Layer['effects']): void;
	updateEffect(layerId: LayerId, effectId: string, patch: Partial<Layer['effects'][number]>): void;

	save(): Promise<void>;
	loadLatest(): Promise<Composition | undefined>;
}

export class CompositionService implements ICompositionService {
	private debug = false;
	readonly composition: Writable<Composition>;

	constructor() {
		const comp: Composition = {
			id: newCompositionId(),
			name: 'Untitled',
			background: { transparent: true },
			outputSize: { width: 1920, height: 1080 },
			layers: [],
			createdAt: nowTs(),
			updatedAt: nowTs()
		};
		this.composition = writable<Composition>(comp);
	}

	setDebug(enabled: boolean): void {
		this.debug = !!enabled;
	}
	getDebug(): boolean {
		return this.debug;
	}

	setOutputSize(size: Size): void {
		this.composition.update((c) => ({ ...c, outputSize: size, updatedAt: nowTs() }));
	}

	setBackground(bg: Composition['background']): void {
		this.composition.update((c) => ({ ...c, background: bg, updatedAt: nowTs() }));
	}

	addLayer(imageId: ImageId, init?: Partial<Layer>, index?: number): Layer {
		const layer: Layer = {
			id: newLayerId(),
			imageId,
			name: init?.name ?? undefined,
			visible: init?.visible ?? true,
			opacity: init?.opacity ?? 1,
			blend: init?.blend ?? 'normal',
			effects: init?.effects ?? []
		};
		this.composition.update((c) => {
			const layers = [...c.layers];
			if (typeof index === 'number') layers.splice(index, 0, layer);
			else layers.push(layer);
			return { ...c, layers, updatedAt: nowTs() };
		});
		if (this.debug) console.info('[Composition] addLayer', layer);
		return layer;
	}

	removeLayer(layerId: LayerId): void {
		this.composition.update((c) => ({
			...c,
			layers: c.layers.filter((l) => l.id !== layerId),
			updatedAt: nowTs()
		}));
	}

	reorderLayers(newOrder: LayerId[]): void {
		this.composition.update((c) => {
			const map = new Map(c.layers.map((l) => [l.id, l] as const));
			const next: Layer[] = [];
			for (const id of newOrder) {
				const l = map.get(id);
				if (l) next.push(l);
			}
			return { ...c, layers: next, updatedAt: nowTs() };
		});
	}

	updateLayer(layerId: LayerId, patch: Partial<Layer>): Layer {
		let updated!: Layer;
		this.composition.update((c) => {
			const layers = c.layers.map((l) => {
				if (l.id !== layerId) return l;
				updated = { ...l, ...patch };
				return updated;
			});
			return { ...c, layers, updatedAt: nowTs() };
		});
		return updated;
	}

	setLayerEffects(layerId: LayerId, effects: Layer['effects']): void {
		this.updateLayer(layerId, { effects });
	}

	updateEffect(layerId: LayerId, effectId: string, patch: Partial<Layer['effects'][number]>): void {
		this.composition.update((c) => {
			const layers = c.layers.map((l) => {
				if (l.id !== layerId) return l;
				const effects = l.effects.map((e) => (e.id === effectId ? { ...e, ...patch } : e));
				return { ...l, effects };
			});
			return { ...c, layers, updatedAt: nowTs() };
		});
	}

	async save(): Promise<void> {
		// Wire to Storage when you want to persist composition state.
	}

	async loadLatest(): Promise<Composition | undefined> {
		// Wire to Storage to load saved composition.
		return undefined;
	}
}
