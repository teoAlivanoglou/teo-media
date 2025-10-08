import { serviceContainer, Services } from './ServiceContainer';
import { TextureManager } from '../../webgl/texture-manager-new';
import {
	imageManagerService,
	type ImageCollection,
	type ManagedImage
} from './ImageManagerService';

/**
 * WebGL Texture Manager Service - Handles WebGL texture creation and management
 * Focused purely on WebGL operations, listens to ImageManagerService for image changes
 */
export interface TextureInfo {
	id: string;
	texture: WebGLTexture;
	slot: number;
	width: number;
	height: number;
}

/**
 * WebGL Texture Manager Service - Pure WebGL texture management
 */
export class TextureManagerService {
	private textureManager: TextureManager | null = null;
	private textureCache = new Map<string, TextureInfo>();
	private imageUnsubscribe?: () => void;

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
		// Mark images as preloaded and store them
		this.preloadedImages = images.map((img) => ({ ...img, source: 'preloaded' }));

		// Load uploaded images from localStorage
		this.loadUploadedImages();

		// Update combined image definitions
		this.updateImageDefinitions();

		const textureManager = await this.getTextureManager();
		const urls = images.map((img) => img.url);

		console.log(`Preloading ${urls.length} images...`);
		await textureManager.preload(urls);
		console.log(`Successfully preloaded ${urls.length} images`);

		// Notify subscribers of state change
		this.notifyStateChange();
	}

	/**
	 * Get image definition by ID
	 */
	getImageDefinition(id: string): ImageDefinition | null {
		const allImages = this.getAllImages();
		return allImages.find((img) => img.id === id) || null;
	}

	/**
	 * Get all image definitions (combined preloaded and uploaded)
	 */
	getAllImageDefinitions(): ImageDefinition[] {
		return this.getAllImages();
	}

	/**
	 * Get all images (preloaded + uploaded)
	 */
	private getAllImages(): ImageDefinition[] {
		return [...this.preloadedImages, ...this.uploadedImages];
	}

	/**
	 * Update combined image definitions and notify subscribers
	 */
	private updateImageDefinitions(): void {
		// This method is now handled by getAllImages()
	}

	/**
	 * Load uploaded images from localStorage and reconstruct blob URLs
	 */
	private async loadUploadedImages(): Promise<void> {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (stored) {
				const parsed: Omit<ImageDefinition, 'type'>[] = JSON.parse(stored);

				// Reconstruct uploaded images with persistent blob URLs
				const reconstructedImages: ImageDefinition[] = [];
				for (const img of parsed) {
					try {
						const file = await indexedDBStorageService.getFile(img.id);
						if (file) {
							// Create persistent blob URL from stored file
							const persistentUrl = URL.createObjectURL(file);
							reconstructedImages.push({
								...img,
								url: persistentUrl,
								source: 'uploaded'
							});
						}
					} catch (error) {
						console.warn(`Failed to reconstruct blob URL for image ${img.id}:`, error);
					}
				}

				this.uploadedImages = reconstructedImages;
				console.log(
					`Loaded and reconstructed ${this.uploadedImages.length} uploaded images from IndexedDB`
				);
			}
		} catch (error) {
			console.warn('Failed to load uploaded images from localStorage:', error);
			this.uploadedImages = [];
		}
	}

	/**
	 * Save uploaded images to localStorage
	 */
	private saveUploadedImages(): void {
		try {
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.uploadedImages));
		} catch (error) {
			console.warn('Failed to save uploaded images to localStorage:', error);
		}
	}

	/**
	 * Notify all subscribers of state changes
	 */
	private notifyStateChange(): void {
		const state: ImageState = {
			preloaded: this.preloadedImages,
			uploaded: this.uploadedImages,
			all: this.getAllImages()
		};

		this.imageStateCallbacks.forEach((callback) => {
			try {
				callback(state);
			} catch (error) {
				console.error('Error in image state callback:', error);
			}
		});
	}

	/**
	 * Subscribe to image state changes
	 */
	subscribe(callback: (state: ImageState) => void): () => void {
		this.imageStateCallbacks.push(callback);

		// Return unsubscribe function
		return () => {
			const index = this.imageStateCallbacks.indexOf(callback);
			if (index > -1) {
				this.imageStateCallbacks.splice(index, 1);
			}
		};
	}

	/**
	 * Add uploaded images with IndexedDB persistence
	 */
	async addUploadedImages(files: FileList | File[]): Promise<ImageDefinition[]> {
		const fileArray = Array.from(files);
		const newImages: ImageDefinition[] = [];

		// Process each file
		for (const file of fileArray) {
			const id = crypto.randomUUID();

			try {
				// Store file data in IndexedDB
				await indexedDBStorageService.storeFile(id, file);

				// Create image definition with persistent blob URL
				const imageDef: ImageDefinition = {
					id,
					url: URL.createObjectURL(file), // Temporary URL for immediate use
					label: file.name,
					source: 'uploaded'
				};

				newImages.push(imageDef);
			} catch (error) {
				console.error(`Failed to store file ${file.name} in IndexedDB:`, error);
			}
		}

		// Add to uploaded images array
		this.uploadedImages = [...this.uploadedImages, ...newImages];
		this.saveUploadedImages();
		this.notifyStateChange();

		console.log(`Added ${newImages.length} uploaded images with IndexedDB persistence`);
		return newImages;
	}

	/**
	 * Remove any image by ID (unified method for all image types)
	 */
	async removeImage(id: string): Promise<boolean> {
		// Try to remove from uploaded images first
		const uploadedIndex = this.uploadedImages.findIndex((img) => img.id === id);
		if (uploadedIndex !== -1) {
			const imageToRemove = this.uploadedImages[uploadedIndex];

			try {
				// Delete from IndexedDB
				await indexedDBStorageService.deleteFile(id);
			} catch (error) {
				console.warn(`Failed to delete file ${id} from IndexedDB:`, error);
			}

			// Revoke object URL to free memory
			URL.revokeObjectURL(imageToRemove.url);
			this.uploadedImages.splice(uploadedIndex, 1);
			this.saveUploadedImages();
			this.notifyStateChange();
			console.log(`Removed uploaded image: ${id}`);
			return true;
		}

		// Try to remove from preloaded images
		const preloadedIndex = this.preloadedImages.findIndex((img) => img.id === id);
		if (preloadedIndex !== -1) {
			const imageToRemove = this.preloadedImages[preloadedIndex];
			// Revoke object URL to free memory
			URL.revokeObjectURL(imageToRemove.url);
			this.preloadedImages.splice(preloadedIndex, 1);
			this.notifyStateChange();
			console.log(`Removed preloaded image: ${id}`);
			return true;
		}

		return false;
	}

	/**
	 * Remove uploaded image by ID (legacy method - delegates to removeImage)
	 */
	async removeUploadedImage(id: string): Promise<boolean> {
		return await this.removeImage(id);
	}

	/**
	 * Reorder images to match user's preferred order
	 */
	reorderImages(newOrder: ImageDefinition[]): void {
		// Update internal state to match user's ordering
		// This preserves the user's preferred arrangement
		this.preloadedImages = newOrder.filter((img) => img.source === 'preloaded');
		this.uploadedImages = newOrder.filter((img) => img.source === 'uploaded');

		// Save updated state
		this.saveUploadedImages();
		this.notifyStateChange();

		console.log('Reordered images to match user preference');
	}

	/**
	 * Validate image file
	 */
	validateImageFile(file: File): { valid: boolean; error?: string } {
		// Check file type
		if (!file.type.startsWith('image/')) {
			return { valid: false, error: 'File must be an image' };
		}

		// Check file size (max 10MB)
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return { valid: false, error: 'Image must be smaller than 10MB' };
		}

		return { valid: true };
	}

	/**
	 * Get current image state
	 */
	getImageState(): ImageState {
		return {
			preloaded: this.preloadedImages,
			uploaded: this.uploadedImages,
			all: this.getAllImages()
		};
	}

	/**
	 * Clear all uploaded images
	 */
	async clearUploadedImages(): Promise<void> {
		// Revoke all object URLs
		this.uploadedImages.forEach((img) => URL.revokeObjectURL(img.url));

		// Clear all files from IndexedDB
		try {
			await indexedDBStorageService.clearAllFiles();
		} catch (error) {
			console.warn('Failed to clear IndexedDB files:', error);
		}

		this.uploadedImages = [];
		this.saveUploadedImages();
		this.notifyStateChange();

		console.log('Cleared all uploaded images');
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
	async cleanup(): Promise<void> {
		if (this.textureManager) {
			this.textureManager.cleanup();
			this.textureManager = null;
		}

		// Revoke all object URLs
		[...this.preloadedImages, ...this.uploadedImages].forEach((img) => {
			URL.revokeObjectURL(img.url);
		});

		// Clear all files from IndexedDB
		try {
			await indexedDBStorageService.clearAllFiles();
		} catch (error) {
			console.warn('Failed to clear IndexedDB files during cleanup:', error);
		}

		this.preloadedImages = [];
		this.uploadedImages = [];
		this.imageStateCallbacks = [];
	}
}

/**
 * Global texture manager service instance
 */
export const textureManagerService = new TextureManagerService();
