import { serviceContainer, Services } from './ServiceContainer';
import { TextureManager } from '../../webgl/texture-manager-new';

/**
 * Image definition for preloading
 */
export interface ImageDefinition {
	id: string;
	url: string;
	label: string;
}

/**
 * Texture Manager Service - Manages texture operations globally
 */
export class TextureManagerService {
	private textureManager: TextureManager | null = null;
	private imageDefinitions: ImageDefinition[] | null = null;

	/**
	 * Get or create the texture manager
	 */
	async getTextureManager(): Promise<TextureManager> {
		if (this.textureManager) {
			return this.textureManager;
		}

		// Get WebGL context from service container
		const gl = serviceContainer.get<WebGL2RenderingContext>(Services.WEBGL_CONTEXT);

		// Create texture manager
		this.textureManager = new TextureManager(gl);

		// Register in service container
		serviceContainer.registerInstance(Services.TEXTURE_MANAGER, this.textureManager);

		console.log('Texture manager created and registered');
		return this.textureManager;
	}

	/**
	 * Get texture manager if it exists, otherwise return null
	 */
	getTextureManagerIfExists(): TextureManager | null {
		return this.textureManager;
	}

	/**
	 * Preload a list of images
	 */
	async preloadImageList(images: ImageDefinition[]): Promise<void> {
		this.imageDefinitions = images;

		const textureManager = await this.getTextureManager();
		const urls = images.map((img) => img.url);

		console.log(`Preloading ${urls.length} images...`);
		await textureManager.preload(urls);
		console.log(`Successfully preloaded ${urls.length} images`);
	}

	/**
	 * Get image definition by ID
	 */
	getImageDefinition(id: string): ImageDefinition | null {
		if (!this.imageDefinitions) return null;
		return this.imageDefinitions.find((img) => img.id === id) || null;
	}

	/**
	 * Get all image definitions
	 */
	getAllImageDefinitions(): ImageDefinition[] {
		return this.imageDefinitions || [];
	}

	/**
	 * Get texture by image ID
	 */
	async getTextureById(id: string): Promise<{ texture: WebGLTexture; slot: number } | null> {
		const imageDef = this.getImageDefinition(id);
		if (!imageDef) return null;

		const textureManager = await this.getTextureManager();
		return await textureManager.getTextureForUrl(imageDef.url);
	}

	/**
	 * Cleanup texture manager
	 */
	cleanup(): void {
		if (this.textureManager) {
			this.textureManager.cleanup();
			this.textureManager = null;
		}
		this.imageDefinitions = null;
	}
}

/**
 * Global texture manager service instance
 */
export const textureManagerService = new TextureManagerService();
