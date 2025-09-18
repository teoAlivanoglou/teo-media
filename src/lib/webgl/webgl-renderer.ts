import { RenderPass } from './render-pass';
import { TextureFilter, TextureManager, TextureWrap } from './texture-manager';

import vertexSource from '$lib/webgl/shaders/basic-vertex.glsl?raw';
import fragmentSource from '$lib/webgl/shaders/mix-fragment.glsl?raw';
import sampleFragmentSource from '$lib/webgl/shaders/sample-fragment.glsl?raw';
import aspectFragmentSource from '$lib/webgl/shaders/aspect-fragment.glsl?raw';

export class WebGLRenderer {
	private gl: WebGL2RenderingContext | null = null;
	private canvas: HTMLCanvasElement;
	private passes: RenderPass[] = [];
	private textures: TextureManager | null = null;
	private initialized: boolean = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	async init(): Promise<void> {
		this.gl = this.canvas.getContext('webgl2');
		if (!this.gl) throw new Error('WebGL2 not supported');

		this.textures = new TextureManager(this.gl);

		this.textures.createPlaceholder(0, 1920, 1080, [200, 80, 20, 255]);
		this.textures.createPlaceholder(1, 1080, 1920, [50, 50, 50, 255]);

		const pass = new RenderPass(
			this.gl,
			vertexSource,
			aspectFragmentSource,
			this.canvas.width,
			this.canvas.height
		);
		this.passes.push(pass);
		pass.use();
		pass.uniforms.setInt('u_texture', 0);
		pass.uniforms.setVec2('u_texResolution', 1080, 1920);
		pass.uniforms.setVec2('u_canvasResolution', this.canvas.width, this.canvas.height);

		// TODO REALLY IMPORTANT!!!!!!
		// chat gpt > Folder structure setup > last message
		// DO IT BROOOO

		// const pass = new RenderPass(
		// 	this.gl,
		// 	vertexSource,
		// 	fragmentSource,
		// 	this.canvas.width,
		// 	this.canvas.height
		// );
		// this.passes.push(pass);

		// pass.use();
		// const uniforms = pass.uniforms;
		// uniforms.setInt('u_texture1', 0);
		// uniforms.setInt('u_texture2', 1);
		// uniforms.setFloat('u_mixRatio', 0.5);
		// uniforms.setVec2('u_canvasResolution', this.canvas.width, this.canvas.height);
		// uniforms.setVec2('u_tex1Resolution', 1920, 1080);
		// uniforms.setVec2('u_tex2Resolution', 1080, 1920);

		// const halfResPass = new RenderPass(
		// 	this.gl,
		// 	vertexSource,
		// 	sampleFragmentSource,
		// 	this.canvas.width / 4,
		// 	this.canvas.height / 4
		// );
		// this.passes.push(halfResPass);

		// const doubleResPass = new RenderPass(
		// 	this.gl,
		// 	vertexSource,
		// 	sampleFragmentSource,
		// 	this.canvas.width,
		// 	this.canvas.height
		// );
		// this.passes.push(doubleResPass);

		console.log('Passes created');
		this.initialized = true;
		this.render();
	}

	setMixValue(value: number): void {
		if (!this.passes[0]) return;
		const uniforms = this.passes[0].uniforms;
		uniforms.setFloat('u_mixRatio', Math.max(0, Math.min(1, value)));
	}

	async updateTexture(index: number, url: string): Promise<void> {
		if (!this.textures) return;
		await this.textures.loadFromUrl(index, url, TextureWrap.REPEAT, TextureFilter.LINEAR);
	}

	private render = (): void => {
		if (!this.initialized || !this.gl) {
			requestAnimationFrame(this.render);
			return;
		}

		const lastPassIndex = this.passes.length - 1;

		for (let i = 0; i < this.passes.length; i++) {
			const pass = this.passes[i];

			const isLast = i === lastPassIndex;
			const renderToCanvas =
				isLast && pass.width === this.canvas.width && pass.height === this.canvas.height;

			if (renderToCanvas) this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
			else pass.bindFramebuffer();

			this.gl.viewport(0, 0, pass.width, pass.height);
			this.gl.clear(this.gl.COLOR_BUFFER_BIT);

			pass.use();

			if (i > 0) {
				const prevTexture = this.passes[i - 1].getOutputTexture();
				this.gl.activeTexture(this.gl.TEXTURE0);
				this.gl.bindTexture(this.gl.TEXTURE_2D, prevTexture);
				pass.uniforms.setInt('u_inputTexture', 0);
			}
			pass.draw();
		}

		requestAnimationFrame(this.render);
	};

	destroy(): void {
		this.initialized = false;
		// TODO: cleanup resources
	}
}
