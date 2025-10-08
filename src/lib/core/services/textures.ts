import { readable, type Readable } from 'svelte/store';
import type { IDebuggable, IService } from './container';
import type { ImageId, TextureRecord, TextureId } from '../types/core';
import { newTextureId, nowTs } from '../utils/id';

type GL = WebGLRenderingContext | WebGL2RenderingContext;

function isImageBitmap(x: HTMLImageElement | ImageBitmap): x is ImageBitmap {
	return typeof (x as ImageBitmap).close === 'function';
}

export interface ITextureService extends IService, IDebuggable {
	readonly texturesByImage: Readable<Map<ImageId, TextureRecord>>;

	ensureForImage(
		imageId: ImageId,
		source: { bitmap?: ImageBitmap; domImage?: HTMLImageElement }
	): Promise<TextureRecord>;
	updateForImage(
		imageId: ImageId,
		source: { bitmap?: ImageBitmap; domImage?: HTMLImageElement }
	): Promise<void>;
	disposeByImage(imageId: ImageId): void;

	setBudgetMB(mb: number): void;
	getStats(): { count: number; approxMB: number };

	setContext(gl: GL | undefined): void;
}

export class TextureService implements ITextureService {
	private debug = false;
	private gl?: GL;
	private byImage = new Map<ImageId, TextureRecord>();
	private sub = readable(this.byImage, (set) => {
		set(this.byImage);
		return () => {};
	});
	private budgetMB = 256;

	setContext(gl: GL | undefined): void {
		this.gl = gl;
	}

	setDebug(enabled: boolean): void {
		this.debug = !!enabled;
	}
	getDebug(): boolean {
		return this.debug;
	}

	get texturesByImage(): Readable<Map<ImageId, TextureRecord>> {
		return this.sub;
	}

	async ensureForImage(
		imageId: ImageId,
		source: { bitmap?: ImageBitmap; domImage?: HTMLImageElement }
	): Promise<TextureRecord> {
		const existing = this.byImage.get(imageId);
		if (existing) {
			existing.lastUsedAt = nowTs();
			return existing;
		}
		if (!this.gl) throw new Error('WebGL context not set');
		const gl = this.gl;

		const tex = gl.createTexture();
		if (!tex) throw new Error('Failed to create texture');
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

		const src: HTMLImageElement | ImageBitmap | undefined = source.bitmap ?? source.domImage;
		if (!src) throw new Error('No source image provided');

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		if (isImageBitmap(src)) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
		}

		const width = isImageBitmap(src) ? src.width : src.naturalWidth || src.width;
		const height = isImageBitmap(src) ? src.height : src.naturalHeight || src.height;

		const rec: TextureRecord = {
			id: newTextureId() as TextureId,
			imageId,
			width,
			height,
			glHandle: tex,
			lastUsedAt: nowTs()
		};
		this.byImage.set(imageId, rec);
		if (this.debug) console.info('[Textures] created', rec);
		return rec;
	}

	async updateForImage(
		imageId: ImageId,
		source: { bitmap?: ImageBitmap; domImage?: HTMLImageElement }
	): Promise<void> {
		const rec = this.byImage.get(imageId);
		if (!rec) {
			await this.ensureForImage(imageId, source);
			return;
		}
		if (!this.gl) throw new Error('WebGL context not set');
		const gl = this.gl;
		const src: HTMLImageElement | ImageBitmap | undefined = source.bitmap ?? source.domImage;
		if (!src) throw new Error('No source image');

		gl.bindTexture(gl.TEXTURE_2D, rec.glHandle);
		if (isImageBitmap(src)) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
		}
		rec.lastUsedAt = nowTs();
	}

	disposeByImage(imageId: ImageId): void {
		const rec = this.byImage.get(imageId);
		if (rec && this.gl) this.gl.deleteTexture(rec.glHandle);
		this.byImage.delete(imageId);
		if (this.debug) console.info('[Textures] disposed', imageId);
	}

	setBudgetMB(mb: number): void {
		this.budgetMB = mb;
	}
	getStats(): { count: number; approxMB: number } {
		let mb = 0;
		for (const t of this.byImage.values()) mb += (t.width * t.height * 4) / (1024 * 1024);
		return { count: this.byImage.size, approxMB: mb };
	}
}
