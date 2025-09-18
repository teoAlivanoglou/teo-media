export class WebGLCanvasRenderer {
	private gl: WebGL2RenderingContext | null = null;
	private program: WebGLProgram | null = null;
	private textures: (WebGLTexture | null)[] = [null, null];
	private mixRatioLocation: WebGLUniformLocation | null = null;
	private texture1Location: WebGLUniformLocation | null = null;
	private texture2Location: WebGLUniformLocation | null = null;
	private canvasResolutionLocation: WebGLUniformLocation | null = null;
	private tex1ResolutionLocation: WebGLUniformLocation | null = null;
	private tex2ResolutionLocation: WebGLUniformLocation | null = null;
	private mixRatio: number = 0.5;
	private canvas: HTMLCanvasElement;
	private initialized: boolean = false;
	private vao: WebGLVertexArrayObject | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	async init(): Promise<void> {
		this.gl = this.canvas.getContext('webgl2');
		if (!this.gl) throw new Error('WebGL2 not supported');

		const vertexShaderSource = `#version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = (a_position + 1.0) * 0.5;
        v_uv.y = 1.0 - v_uv.y;
      }
    `;

		// aspect-fit sampling using canvas + texture resolutions
		const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_mixRatio;
uniform sampler2D u_texture1; // background
uniform sampler2D u_texture2; // foreground
uniform vec2 u_canvasResolution;
uniform vec2 u_tex1Resolution;
uniform vec2 u_tex2Resolution;

vec2 aspectFillUV(vec2 uv, vec2 texRes, vec2 canvasRes) {
    float sx = canvasRes.x / texRes.x;
    float sy = canvasRes.y / texRes.y;
    float s = max(sx, sy);                // <-- max for cover
    vec2 displaySize = texRes * s;
    vec2 offset = (canvasRes - displaySize) * 0.5;
    return (uv * canvasRes - offset) / displaySize;
}

void main() {
    // Background (aspect-fill)
    vec2 uv1 = aspectFillUV(v_uv, u_tex1Resolution, u_canvasResolution);
    vec4 color1 = vec4(0.0);
    if (all(greaterThanEqual(uv1, vec2(0.0))) && all(lessThanEqual(uv1, vec2(1.0)))) {
        color1 = texture(u_texture1, uv1);
    }

    // Foreground, scaled around center by u_mixRatio
    vec2 centeredUV = v_uv - 0.5;
    vec2 scaledUV = centeredUV / u_mixRatio + 0.5;
    vec2 uv2 = (scaledUV * u_canvasResolution - (u_canvasResolution - u_tex2Resolution * min(u_canvasResolution.x / u_tex2Resolution.x, u_canvasResolution.y / u_tex2Resolution.y)) * 0.5)
               / (u_tex2Resolution * min(u_canvasResolution.x / u_tex2Resolution.x, u_canvasResolution.y / u_tex2Resolution.y));

    vec4 color2 = vec4(0.0);
    if (all(greaterThanEqual(uv2, vec2(0.0))) && all(lessThanEqual(uv2, vec2(1.0)))) {
        color2 = texture(u_texture2, uv2);
    }

    fragColor = mix(color1, color2, color2.a);
}


    `;

		// compile, link, create program (same as before)
		const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
		const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

		this.program = this.gl.createProgram()!;
		this.gl.attachShader(this.program, vertexShader);
		this.gl.attachShader(this.program, fragmentShader);
		this.gl.linkProgram(this.program);

		if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
			throw new Error('Program link error: ' + this.gl.getProgramInfoLog(this.program));
		}

		// grab uniform locations
		this.mixRatioLocation = this.gl.getUniformLocation(this.program, 'u_mixRatio');
		this.texture1Location = this.gl.getUniformLocation(this.program, 'u_texture1');
		this.texture2Location = this.gl.getUniformLocation(this.program, 'u_texture2');
		this.canvasResolutionLocation = this.gl.getUniformLocation(this.program, 'u_canvasResolution');
		this.tex1ResolutionLocation = this.gl.getUniformLocation(this.program, 'u_tex1Resolution');
		this.tex2ResolutionLocation = this.gl.getUniformLocation(this.program, 'u_tex2Resolution');

		// fullscreen quad
		const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

		this.vao = this.gl.createVertexArray()!;
		this.gl.bindVertexArray(this.vao);

		const vbo = this.gl.createBuffer()!;
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

		const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
		this.gl.enableVertexAttribArray(positionLocation);
		this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

		// placeholders and initial uniform setup
		await this.createPlaceholderTextures();

		this.gl.useProgram(this.program);
		this.gl.uniform1i(this.texture1Location, 0);
		this.gl.uniform1i(this.texture2Location, 1);
		this.updateUniforms(this.mixRatio);

		// initial viewport
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.gl.clearColor(0, 0, 0, 1);

		this.initialized = true;
		this.render();
	}

	private compileShader(source: string, type: number): WebGLShader {
		if (!this.gl) throw new Error('WebGL context not initialized');
		const shader = this.gl.createShader(type)!;
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);
		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			const error = this.gl.getShaderInfoLog(shader);
			this.gl.deleteShader(shader);
			throw new Error(`Shader compile error: ${error}`);
		}
		return shader;
	}

	private async createPlaceholderTextures(): Promise<void> {
		if (!this.gl) return;

		for (let i = 0; i < 2; i++) {
			const texture = this.gl.createTexture()!;
			this.gl.activeTexture(this.gl.TEXTURE0 + i);
			this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

			const color = i === 0 ? [100, 100, 100, 255] : [50, 50, 50, 255];
			const width = 512;
			const height = 512;
			const data = new Uint8Array(width * height * 4);
			for (let j = 0; j < data.length; j += 4) {
				data[j] = color[0];
				data[j + 1] = color[1];
				data[j + 2] = color[2];
				data[j + 3] = color[3];
			}

			this.gl.texImage2D(
				this.gl.TEXTURE_2D,
				0,
				this.gl.RGBA,
				width,
				height,
				0,
				this.gl.RGBA,
				this.gl.UNSIGNED_BYTE,
				data
			);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

			this.textures[i] = texture;

			// push resolution into shader for placeholders
			if (i === 0 && this.tex1ResolutionLocation) {
				this.gl.useProgram(this.program);
				this.gl.uniform2f(this.tex1ResolutionLocation, width, height);
			}
			if (i === 1 && this.tex2ResolutionLocation) {
				this.gl.useProgram(this.program);
				this.gl.uniform2f(this.tex2ResolutionLocation, width, height);
			}
		}
	}

	private updateUniforms(mixRatio: number): void {
		if (!this.gl || !this.program || !this.mixRatioLocation) return;
		this.gl.useProgram(this.program);
		this.gl.uniform1f(this.mixRatioLocation, mixRatio);
	}

	async updateTexture(index: number, url: string): Promise<void> {
		if (!this.initialized || !this.gl || index < 0 || index > 1) return;

		try {
			const img = new Image();
			img.crossOrigin = 'anonymous';

			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = reject;
				img.src = url;
			});

			if (!this.textures[index]) {
				this.textures[index] = this.gl.createTexture();
			}

			this.gl.activeTexture(this.gl.TEXTURE0 + index);
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[index]);

			// upload
			this.gl.texImage2D(
				this.gl.TEXTURE_2D,
				0,
				this.gl.RGBA,
				this.gl.RGBA,
				this.gl.UNSIGNED_BYTE,
				img
			);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

			// update shader with texture resolution
			if (index === 0 && this.tex1ResolutionLocation) {
				this.gl.useProgram(this.program);
				this.gl.uniform2f(this.tex1ResolutionLocation, img.width, img.height);
			}
			if (index === 1 && this.tex2ResolutionLocation) {
				this.gl.useProgram(this.program);
				this.gl.uniform2f(this.tex2ResolutionLocation, img.width, img.height);
			}
		} catch (error) {
			console.error(`Failed to update texture ${index}:`, error);
		}
	}

	setMixValue(value: number): void {
		if (!this.initialized) return;
		this.mixRatio = Math.max(0, Math.min(1, value));
		this.updateUniforms(this.mixRatio);
	}

	private render = (): void => {
		if (!this.initialized || !this.gl || !this.program || !this.vao) {
			requestAnimationFrame(this.render);
			return;
		}

		// update canvas resolution uniform (handle dynamic resizes)
		this.gl.useProgram(this.program);
		if (this.canvasResolutionLocation) {
			this.gl.uniform2f(this.canvasResolutionLocation, this.canvas.width, this.canvas.height);
		}

		// always set viewport in case canvas was resized externally
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

		// clear and draw
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.bindVertexArray(this.vao);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[1]);

		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

		requestAnimationFrame(this.render);
	};

	destroy(): void {
		this.initialized = false;
		if (this.gl) {
			this.textures.forEach((texture) => {
				if (texture) this.gl?.deleteTexture(texture);
			});
			if (this.program) this.gl.deleteProgram(this.program);
		}
	}
}
