import { writable, type Readable, type Writable, get } from 'svelte/store';
import type { IDebuggable, IService } from './container';
import type { BinaryRef, ImageId, ImageMeta, ImageRecord, MimeType, Size } from '../types/core';
import { newImageId, nowTs } from '../utils/id';
import type { IStorageService } from './storage';

export interface IImageService extends IService, IDebuggable {
	readonly images: Readable<Map<ImageId, ImageRecord>>;
	readonly order: Writable<ImageId[]>;
	readonly selected: Writable<ImageId[]>;
	addFiles(
		files: File[],
		opts?: { generateThumb?: boolean; dedupeByName?: boolean }
	): Promise<ImageRecord[]>;
	addBinary(
		name: string,
		mimeType: MimeType,
		data: Blob | ArrayBuffer,
		opts?: { id?: ImageId; generateThumb?: boolean }
	): Promise<ImageRecord>;
	updateMeta(id: ImageId, patch: Partial<ImageMeta>): Promise<ImageRecord>;
	remove(id: ImageId): Promise<void>;
	reorder(newOrder: ImageId[]): void;
	move(fromIndex: number, toIndex: number): void;
	saveState(): Promise<void>;
	loadState(): Promise<void>;
	decodeToBitmap(
		ref: BinaryRef,
		opts?: { colorSpace?: PredefinedColorSpace; premultiplyAlpha?: 'none' | 'premultiply' }
	): Promise<ImageBitmap>;
	acquireDomImage(id: ImageId, ref: BinaryRef): Promise<HTMLImageElement>;
	releaseDomImage(id: ImageId): void;
	// New: preview URL helpers
	getPreviewUrl(id: ImageId): Promise<string>;
	releasePreviewUrl(id: ImageId): void;
	// New: clear everything (records + blobs + DOM URLs)
	clearAll(): Promise<void>;
	ensureThumbnail(id: ImageId, size?: Size): Promise<BinaryRef | undefined>;
}

const KV_IMAGES = 'images.v1';
const KV_ORDER = 'images.order.v1';

const SUPPORTED_MIME = new Set<string>([
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/gif',
	'image/avif',
	'image/svg+xml'
]);

export interface FileValidation {
	valid: boolean;
	reason?: string;
}

export class ImageService implements IImageService {
	private debug = false;
	private _images = writable<Map<ImageId, ImageRecord>>(new Map());
	private _order = writable<ImageId[]>([]);
	private _selected = writable<ImageId[]>([]);
	private domPool = new Map<ImageId, HTMLImageElement>();
	constructor(private readonly storage: IStorageService) {}
	setDebug(enabled: boolean): void {
		this.debug = Boolean(enabled);
	}
	getDebug(): boolean {
		return this.debug;
	}
	get images() {
		return { subscribe: this._images.subscribe };
	}
	get order() {
		return this._order;
	}
	get selected() {
		return this._selected;
	}

	validateImageFile(file: File): FileValidation {
		if (!SUPPORTED_MIME.has(file.type)) {
			return { valid: false, reason: `Unsupported type: ${file.type}` };
		}
		if (file.size === 0) {
			return { valid: false, reason: 'Empty file' };
		}
		return { valid: true };
	}

	async addFiles(
		files: File[],
		opts?: { generateThumb?: boolean; dedupeByName?: boolean }
	): Promise<ImageRecord[]> {
		const results: ImageRecord[] = [];
		for (const file of files) {
			const v = this.validateImageFile(file);
			if (!v.valid) {
				if (this.debug) console.log('[Images] Skipping file', file.name, v.reason);
				continue;
			}
			try {
				const rec = await this.addBinary(file.name, file.type, file, {
					generateThumb: opts?.generateThumb
				});
				results.push(rec);
			} catch (e: unknown) {
				if (this.debug) console.log('[Images] Failed to add file', file.name, e);
				// continue with the next file
			}
		}
		await this.saveState();
		return results;
	}

	async addBinary(
		name: string,
		mimeType: MimeType,
		data: Blob | ArrayBuffer,
		opts?: { id?: ImageId; generateThumb?: boolean }
	): Promise<ImageRecord> {
		const id: ImageId = opts?.id ?? newImageId();
		const blobRef = await this.storage.putBlob(`image/${id}`, data, mimeType);
		const { width, height } = await this.computeIntrinsicSize(blobRef);
		const meta: ImageMeta = {
			id,
			name,
			mimeType,
			width,
			height,
			bytes: blobRef.byteLength,
			createdAt: nowTs(),
			updatedAt: nowTs()
		};
		const record: ImageRecord = { meta, binary: blobRef };
		this._images.update((m) => {
			const next = new Map(m);
			next.set(id, record);
			return next;
		});
		this._order.update((arr) => arr.concat(id));

		if (opts?.generateThumb) {
			try {
				await this.ensureThumbnail(id, { width: 256, height: 256 });
			} catch (e) {
				if (this.debug) console.warn('[Images] thumb failed', e);
			}
		}
		if (this.debug) console.info('[Images] added', id, meta);
		return record;
	}

	async updateMeta(id: ImageId, patch: Partial<ImageMeta>): Promise<ImageRecord> {
		let updated: ImageRecord | undefined;
		this._images.update((m) => {
			const cur = m.get(id);
			if (!cur) return m;
			updated = { ...cur, meta: { ...cur.meta, ...patch, updatedAt: nowTs() } };
			const next = new Map(m);
			next.set(id, updated);
			return next;
		});
		if (!updated) throw new Error(`Image not found: ${id}`);
		await this.saveState();
		return updated;
	}

	async remove(id: ImageId): Promise<void> {
		const rec = get(this._images).get(id);
		this._images.update((m) => {
			const next = new Map(m);
			next.delete(id);
			return next;
		});
		this._order.update((arr) => arr.filter((x) => x !== id));
		if (rec) {
			try {
				await this.storage.removeBlob(rec.binary);
			} catch (e) {
				if (this.debug) console.warn('[Images] remove blob failed', e);
			}
		}
		this.releaseDomImage(id);
		await this.saveState();
		if (this.debug) console.info('[Images] removed', id);
	}

	reorder(newOrder: ImageId[]): void {
		this._order.set([...newOrder]);
		if (this.debug) console.info('[Images] reordered', newOrder);
	}

	move(fromIndex: number, toIndex: number): void {
		this._order.update((arr) => {
			const next = arr.slice();
			const [it] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, it);
			return next;
		});
	}

	async saveState(): Promise<void> {
		const imgs = Object.fromEntries(get(this._images)) as Record<ImageId, ImageRecord>;
		const ord = get(this._order);
		await this.storage.set(KV_IMAGES, imgs);
		await this.storage.set(KV_ORDER, ord);
	}

	async loadState(): Promise<void> {
		const imgs =
			(await this.storage.get<Record<ImageId, ImageRecord>>(KV_IMAGES)) ??
			({} as Record<ImageId, ImageRecord>);
		const ord = (await this.storage.get<ImageId[]>(KV_ORDER)) ?? [];
		this._images.set(new Map(Object.entries(imgs) as [ImageId, ImageRecord][]));
		this._order.set(ord);
	}

	async decodeToBitmap(
		ref: BinaryRef,
		opts?: { colorSpace?: PredefinedColorSpace; premultiplyAlpha?: 'none' | 'premultiply' }
	): Promise<ImageBitmap> {
		const blob = await this.storage.getBlob(ref);
		if (!blob) throw new Error('Blob missing');
		if (ref.mimeType === 'image/svg+xml') {
			// Load DOM image first, then rasterize
			const url = URL.createObjectURL(blob);
			try {
				const img = new Image();
				img.decoding = 'async';
				img.src = url;
				await img.decode().catch(() => undefined);
				// createImageBitmap accepts HTMLImageElement
				const bmp = await createImageBitmap(img, {
					// colorSpaceConversion is UA-defined for SVG; keep default
					// premultiplyAlpha affects upload later; expose if needed
					premultiplyAlpha: opts?.premultiplyAlpha ?? 'none'
				});
				return bmp;
			} finally {
				URL.revokeObjectURL(url);
			}
		}
		// Raster formats
		return createImageBitmap(blob, {
			colorSpaceConversion: 'default',
			premultiplyAlpha: opts?.premultiplyAlpha ?? 'none'
		});
	}

	async acquireDomImage(id: ImageId, ref: BinaryRef): Promise<HTMLImageElement> {
		const cached = this.domPool.get(id);
		if (cached) return cached;

		const blob = await this.storage.getBlob(ref);
		if (!blob) throw new Error('Blob missing');
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.decoding = 'async';
		img.src = url;
		try {
			await img.decode();
		} catch (e) {
			if (this.debug) console.warn('[Images] img.decode failed', e);
		}
		this.domPool.set(id, img);
		return img;
	}

	releaseDomImage(id: ImageId): void {
		const img = this.domPool.get(id);
		if (img && img.src.startsWith('blob:')) {
			URL.revokeObjectURL(img.src);
		}
		this.domPool.delete(id);
	}

	async ensureThumbnail(_id: ImageId, _size?: Size): Promise<BinaryRef | undefined> {
		// For now, defer thumbnail generation. Using the HTMLImageElement directly is fine
		// for in-session UI. If you later display many items or need fast reloads, generating
		// and persisting thumbnails (OffscreenCanvas) will reduce decode and memory costs.
		if (this.debug) {
			console.log('Create new thumbnail of ' + _id + ' with size ' + _size);
		}
		return undefined;
	}

	private measureWithImageElement(blob: Blob): Promise<Size> {
		return new Promise<Size>((resolve, reject) => {
			const url = URL.createObjectURL(blob);
			const img = new Image();
			img.decoding = 'async';
			img.onload = () => {
				const width = img.naturalWidth || img.width;
				const height = img.naturalHeight || img.height;
				URL.revokeObjectURL(url);
				resolve({ width, height });
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Failed to load image for size'));
			};
			img.src = url;
		});
	}

	private async computeIntrinsicSize(ref: BinaryRef): Promise<Size> {
		const blob = await this.storage.getBlob(ref);
		if (!blob) throw new Error('Blob missing');

		if (ref.mimeType === 'image/svg+xml') {
			// Prefer DOM measurement for SVG
			return this.measureWithImageElement(blob);
		}

		try {
			const bmp = await createImageBitmap(blob);
			const size = { width: bmp.width, height: bmp.height };
			bmp.close();
			return size;
		} catch {
			// Fallback via DOM for odd cases
			return this.measureWithImageElement(blob);
		}
	}

	async getPreviewUrl(id: ImageId): Promise<string> {
		const map = get(this._images);
		const rec = map.get(id);
		if (!rec) throw new Error(`Image not found: ${id}`);
		const cached = this.domPool.get(id);
		if (cached?.src) return cached.src;
		const img = await this.acquireDomImage(id, rec.binary);
		return img.src;
	}
	releasePreviewUrl(id: ImageId): void {
		this.releaseDomImage(id);
	}
	async clearAll(): Promise<void> {
		// revoke URLs
		for (const img of this.domPool.values()) {
			if (img.src.startsWith('blob:')) {
				URL.revokeObjectURL(img.src);
			}
		}
		this.domPool.clear();
		// remove blobs
		const map = get(this._images);
		for (const rec of map.values()) {
			try {
				await this.storage.removeBlob(rec.binary);
			} catch (e: unknown) {
				if (this.debug) {
					console.warn('[Images] removeBlob failed', e);
				}
			}
		}
		// clear records/order
		this._images.set(new Map<ImageId, ImageRecord>());
		this._order.set([]);
		await this.storage.remove(KV_IMAGES);
		await this.storage.remove(KV_ORDER);
	}
}
