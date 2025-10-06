import { serviceContainer, Services } from './ServiceContainer';

/**
 * WebGL Context Service - Manages the WebGL context globally
 */
export class WebGLContextService {
	private gl: WebGL2RenderingContext | null = null;
	private canvas: HTMLCanvasElement | null = null;

	/**
	 * Initialize WebGL context with a canvas
	 */
	initialize(canvas: HTMLCanvasElement): WebGL2RenderingContext {
		// If already initialized, just update the canvas reference
		if (this.gl) {
			console.log('WebGL context already initialized, updating canvas reference');
			this.canvas = canvas;
			return this.gl;
		}

		this.canvas = canvas;
		this.gl = canvas.getContext('webgl2');

		if (!this.gl) {
			throw new Error('WebGL2 not supported');
		}

		// Register the context in the service container
		serviceContainer.registerInstance(Services.WEBGL_CONTEXT, this.gl);

		console.log('WebGL context initialized and registered');
		return this.gl;
	}

	/**
	 * Get the WebGL context
	 */
	getContext(): WebGL2RenderingContext {
		if (!this.gl) {
			throw new Error('WebGL context not initialized. Call initialize() first.');
		}
		return this.gl;
	}

	/**
	 * Get the canvas element
	 */
	getCanvas(): HTMLCanvasElement | null {
		return this.canvas;
	}

	/**
	 * Resize the canvas and viewport
	 */
	resize(width: number, height: number): void {
		if (!this.canvas || !this.gl) {
			throw new Error('WebGL context not initialized');
		}

		this.canvas.width = width;
		this.canvas.height = height;
		this.gl.viewport(0, 0, width, height);
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		this.gl = null;
		this.canvas = null;
	}
}

/**
 * Global WebGL context service instance
 */
export const webglContextService = new WebGLContextService();
