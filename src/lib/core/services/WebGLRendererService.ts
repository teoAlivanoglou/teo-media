import { serviceContainer, Services } from './ServiceContainer';
import { WebGLRenderer } from '../../webgl/webgl-renderer';

/**
 * WebGL Renderer Service - Manages the WebGL renderer globally
 */
export class WebGLRendererService {
	private renderer: WebGLRenderer | null = null;

	/**
	 * Get or create the WebGL renderer
	 */
	async getRenderer(canvas: HTMLCanvasElement): Promise<WebGLRenderer> {
		if (this.renderer) {
			return this.renderer;
		}

		// Use the provided canvas instead of creating a new one
		this.renderer = new WebGLRenderer(canvas);

		// Initialize renderer
		await this.renderer.init();

		// Register in service container
		serviceContainer.registerInstance(Services.WEBGL_RENDERER, this.renderer);

		console.log('WebGL renderer created and registered');
		return this.renderer;
	}

	/**
	 * Get renderer if it exists, otherwise return null
	 */
	getRendererIfExists(): WebGLRenderer | null {
		return this.renderer;
	}

	/**
	 * Set mix value for the renderer
	 */
	setMixValue(value: number): void {
		if (this.renderer) {
			this.renderer.setMixValue(value);
		}
	}

	/**
	 * Update texture in the renderer
	 */
	async updateTexture(index: number, url: string): Promise<void> {
		if (this.renderer) {
			await this.renderer.updateTexture(index, url);
		}
	}

	/**
	 * Cleanup renderer
	 */
	cleanup(): void {
		if (this.renderer) {
			this.renderer.destroy();
			this.renderer = null;
		}
	}
}

/**
 * Global WebGL renderer service instance
 */
export const webglRendererService = new WebGLRendererService();
