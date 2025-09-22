import { RenderPass } from './render-pass';
import { TextureFilter, TextureManager, TextureWrap } from './texture-manager';

import vertexSource from '$lib/webgl/shaders/basic-vertex.glsl?raw';
import fragmentSource from '$lib/webgl/shaders/sample-fragment.glsl?raw';
import fragmentMixSource from '$lib/webgl/shaders/mix-simple-fragment.glsl?raw';
// import aspectFragmentSource from '$lib/webgl/shaders/aspect-fragment.glsl?raw';
import { FBO } from './fbo';

export class WebGLRenderer {
	private gl: WebGL2RenderingContext | null = null;
	private canvas: HTMLCanvasElement;
	private passes: RenderPass[] = [];
	private textures: TextureManager | null = null;
	public initialized: boolean = false;
	private needsRender: boolean = true;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	async init(): Promise<void> {
		this.gl = this.canvas.getContext('webgl2');
		if (!this.gl) throw new Error('WebGL2 not supported');

		this.textures = new TextureManager(this.gl);

		this.textures.createPlaceholder(0, 1920, 1080, [200, 80, 20, 255]);
		this.textures.createPlaceholder(1, 1080, 1920, [50, 50, 50, 255]);

		const bgTex = this.textures.getTexture(0)!;
		const fgTex = this.textures.getTexture(1)!;

		const fboFull = new FBO(this.gl, this.canvas.width, this.canvas.height);

		// Pass 0;
		const pass0 = new RenderPass(this.gl, vertexSource, fragmentSource, [bgTex], fboFull);
		pass0.uniforms.setVec2('u_canvasResolution', this.canvas.width, this.canvas.height);

		const pass1 = new RenderPass(
			this.gl,
			vertexSource,
			fragmentMixSource,
			[fboFull.texture, fgTex],
			this.canvas
		);
		pass1.uniforms.setFloat('u_mixRatio', 0.5);

		this.passes.push(pass0);
		this.passes.push(pass1);

		console.log('Passes created');
		this.initialized = true;
		this.render();
	}

	setMixValue(value: number): void {
		for (const pass of this.passes) {
			if (pass.uniforms.has('u_mixRatio')) {
				pass.uniforms.setFloat('u_mixRatio', value);
			}
		}
		this.requestRender();
	}

	async updateTexture(index: number, url: string): Promise<void> {
		if (!this.textures) return;
		await this.textures.loadFromUrl(index, url, TextureWrap.REPEAT, TextureFilter.LINEAR);

		this.requestRender();
	}

	requestRender(): void {
		if (!this.needsRender) {
			this.needsRender = true;
			requestAnimationFrame(() => {
				this.render();
				this.needsRender = false;
			});
		}
	}

	private render = (): void => {
		if (!this.initialized || !this.gl || !this.needsRender) {
			// requestAnimationFrame(this.render);
			return;
		}

		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		for (const pass of this.passes) {
			pass.draw();
		}

		// requestAnimationFrame(this.render);
		this.needsRender = false;
	};

	destroy(): void {
		this.initialized = false;
		this.passes = [];
		// TODO: cleanup resources
	}
}

export type UniformValue =
	| number
	| [number, number]
	| [number, number, number]
	| [number, number, number, number]
	| WebGLTexture
	| HTMLImageElement;
