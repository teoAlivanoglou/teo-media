export class UniformManager {
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram;
	private locations: Map<string, WebGLUniformLocation | null> = new Map();

	constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
		this.gl = gl;
		this.program = program;
	}

	/**
	 * Fetch and cache uniform location
	 */
	getLocation(name: string): WebGLUniformLocation | null {
		if (this.locations.has(name)) {
			return this.locations.get(name) ?? null;
		}

		const loc = this.gl.getUniformLocation(this.program, name);
		this.locations.set(name, loc);
		return loc;
	}

	/**
	 * Set float uniform
	 */
	setFloat(name: string, value: number): void {
		const loc = this.getLocation(name);
		if (loc !== null) {
			this.gl.uniform1f(loc, value);
		}
	}

	/**
	 * Set 2-componen vector uniform
	 */
	setVec2(name: string, x: number, y: number): void {
		const loc = this.getLocation(name);
		if (loc !== null) {
			this.gl.uniform2f(loc, x, y);
		}
	}

	/**
	 * Set integer uniform (useful for texture samplers)
	 */
	setInt(name: string, value: number): void {
		const loc = this.getLocation(name);
		if (loc !== null) {
			this.gl.uniform1i(loc, value);
		}
	}
}
