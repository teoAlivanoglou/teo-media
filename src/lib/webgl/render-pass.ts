import { createProgram } from './shader-utils';
import { UniformManager } from './uniform-manager';
// import { TextureManager } from './texture-manager';
import { FBO } from './fbo';

// import vertexSrc from '$lib/webgl/shaders/basic-vertex.glsl?raw';
// import blitFragment from '$lib/webgl/shaders/sample-fragment.glsl?raw';

type Source = WebGLTexture | FBO;
type Destination = FBO | HTMLCanvasElement;

export class RenderPass {
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject | null = null;
	// public textureManager: TextureManager;
	private sources: Source[];
	private destination: Destination;

	public uniforms: UniformManager;

	constructor(
		gl: WebGL2RenderingContext,
		vertexSource: string,
		fragmentSource: string,
		sources: Source[], // input textures/FBOs/images
		destination: Destination // where to render
	) {
		this.gl = gl;
		this.program = createProgram(gl, vertexSource, fragmentSource);

		this.sources = sources;
		this.destination = destination;

		this.use();
		this.uniforms = new UniformManager(gl, this.program);

		this.initQuad();
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

	use(): void {
		this.gl.useProgram(this.program);
		if (this.vao) {
			this.gl.bindVertexArray(this.vao);
		}
	}

	draw(): void {
		if (this.destination instanceof FBO) {
			this.destination.bind();
		} else {
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		}

		if ('width' in this.destination && 'height' in this.destination) {
			this.gl.viewport(0, 0, this.destination.width, this.destination.height);
		} else {
			throw new Error('Destination does not contain width or height field');
		}
		// this.gl.viewport(0, 0, this.destination.width, this.destination.height);

		// Bind sources
		this.sources.forEach((src, i) => {
			this.gl.activeTexture(this.gl.TEXTURE0 + i);
			if (src instanceof FBO) {
				this.gl.bindTexture(this.gl.TEXTURE_2D, src.texture);
			} else {
				this.gl.bindTexture(this.gl.TEXTURE_2D, src);
			}
			this.uniforms.setInt(`u_texture${i}`, i);
		});

		this.use();
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

		// if (this.destination instanceof FBO) this.destination.unbind();
	}

	/** Convenience getter for the output texture */
	getOutputTexture(): WebGLTexture | null {
		if (this.destination instanceof FBO) return this.destination.texture;
		return null;
	}
}
