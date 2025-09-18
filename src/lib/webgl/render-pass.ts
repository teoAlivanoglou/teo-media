import { createProgram } from './shader-utils';
import { UniformManager } from './uniform-manager';

import vertexSrc from '$lib/webgl/shaders/basic-vertex.glsl?raw';
import blitFragment from '$lib/webgl/shaders/sample-fragment.glsl?raw';

export class RenderPass {
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject | null = null;
	public uniforms: UniformManager;

	private fbo: WebGLFramebuffer | null = null;
	private outputTexture: WebGLTexture | null = null;
	public width: number;
	public height: number;

	constructor(
		gl: WebGL2RenderingContext,
		vertexSource: string,
		fragmentSource: string,
		width: number,
		height: number
	) {
		this.gl = gl;
		this.width = width;
		this.height = height;

		this.program = createProgram(gl, vertexSource, fragmentSource);
		this.uniforms = new UniformManager(gl, this.program);

		this.initFramebuffer();
		this.initQuad();
	}

	private initFramebuffer(): void {
		const gl = this.gl;

		this.fbo = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

		this.outputTexture = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			this.width,
			this.height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.outputTexture,
			0
		);

		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (status !== gl.FRAMEBUFFER_COMPLETE) console.warn('Framebuffer incomplete', status);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	private initQuad(): void {
		const gl = this.gl;
		const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		const vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		const posLoc = gl.getAttribLocation(this.program, 'a_position');
		gl.enableVertexAttribArray(posLoc);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

		gl.bindVertexArray(null);
	}

	bindFramebuffer(): void {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
	}

	getOutputTexture(): WebGLTexture {
		if (this.outputTexture) return this.outputTexture;
		throw new Error('Could not get output texture');
	}

	use(): void {
		this.gl.useProgram(this.program);
		if (this.vao) {
			this.gl.bindVertexArray(this.vao);
		}
	}

	draw(): void {
		this.gl.viewport(0, 0, this.width, this.height);
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
		console.timeLog('Pass drawn');
	}

	static finalBlitPass: RenderPass | null = null;
	static initFinalBlit(gl: WebGL2RenderingContext, canvasWidth: number, canvasHeight: number) {
		if (!RenderPass.finalBlitPass) {
			RenderPass.finalBlitPass = new RenderPass(
				gl,
				vertexSrc,
				blitFragment,
				canvasWidth,
				canvasHeight
			);
		}
	}
}
