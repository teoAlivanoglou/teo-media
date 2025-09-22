export class FBO {
	public fbo: WebGLFramebuffer;
	public texture: WebGLTexture;
	public width: number;
	public height: number;

	constructor(
		private gl: WebGL2RenderingContext,
		width: number,
		height: number
	) {
		this.width = width;
		this.height = height;

		this.fbo = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

		this.texture = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (status !== gl.FRAMEBUFFER_COMPLETE) console.warn('Framebuffer incomplete', status);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	bind() {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
		this.gl.viewport(0, 0, this.width, this.height);
	}

	unbind() {
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
	}

	resize(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA,
			width,
			height,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			null
		);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}

	destroy() {
		this.gl.deleteTexture(this.texture);
		this.gl.deleteFramebuffer(this.fbo);
	}
}
