export function compileShader(
	gl: WebGL2RenderingContext,
	source: string,
	type: number
): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error('Unable to create shader');
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const error = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
		gl.deleteShader(shader);
		throw new Error(`Shader compile error: ${error}`);
	}
	return shader;
}

export function createProgram(
	gl: WebGL2RenderingContext,
	vertexSource: string,
	fragmentSource: string
): WebGLProgram {
	const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
	const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

	const program = gl.createProgram();
	if (!program) {
		throw new Error('Unable to create program');
	}

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const error = gl.getProgramInfoLog(program) || 'Unknown program link error';
		gl.deleteProgram(program);
		throw new Error(`Program link error: ${error}`);
	}

	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);

	return program;
}
