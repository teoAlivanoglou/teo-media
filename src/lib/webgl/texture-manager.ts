export class TextureManager {
	private gl: WebGL2RenderingContext;
	private textures: (WebGLTexture | null)[] = [];

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.textures = [null, null];
	}

	/**
	 * Create a simple placeholder texture
	 */
	createPlaceholder(
		index: number,
		width: number,
		height: number,
		color: [number, number, number, number],
		wrap: TextureWrap = TextureWrap.CLAMP,
		filter: TextureFilter = TextureFilter.LINEAR
	): void {
		const gl = this.gl;
		const texture = gl.createTexture();
		if (!texture) return;

		gl.activeTexture(gl.TEXTURE0 + index);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		const data = new Uint8Array(width * height * 4);
		for (let i = 0; i < data.length; i += 4) {
			data[i + 0] = color[0];
			data[i + 1] = color[1];
			data[i + 2] = color[2];
			data[i + 3] = color[3];
		}

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

		this.textures[index] = texture;
	}

	/**
	 * Load a texture from URL
	 */
	async loadFromUrl(
		index: number,
		url: string,
		wrap: TextureWrap = TextureWrap.CLAMP,
		filter: TextureFilter = TextureFilter.LINEAR
	): Promise<void> {
		const gl = this.gl;

		const img = new Image();
		img.crossOrigin = 'anonymous';
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = reject;
			img.src = url;
		});

		let texture = this.textures[index];
		if (!texture) {
			texture = gl.createTexture();
			this.textures[index] = texture;
		}

		gl.activeTexture(gl.TEXTURE0 + index);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	}

	/**
	 * Get texture by index
	 */
	getTexture(index: number): WebGLTexture | null {
		return this.textures[index] ?? null;
	}
}

export enum TextureWrap {
	CLAMP = WebGL2RenderingContext.CLAMP_TO_EDGE,
	REPEAT = WebGL2RenderingContext.REPEAT,
	MIRRORED_REPEAT = WebGL2RenderingContext.MIRRORED_REPEAT
}

export enum TextureFilter {
	NEAREST = WebGL2RenderingContext.NEAREST,
	LINEAR = WebGL2RenderingContext.LINEAR
}
