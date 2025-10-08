/**
 * Image Manager Service - Handles user image collection, ordering, and persistence
 * Separate from texture management for better separation of concerns
 */
export interface ManagedImage {
	id: string;
	url: string;
	label: string;
	file?: File;
	imageElement?: HTMLImageElement;
}

export interface ImageCollection {
	images: ManagedImage[];
	order: string[]; // Array of image IDs in user's preferred order
}

/**
 * Image Manager Service - Manages user's image collection and ordering
 */
export class ImageManagerService {
	private images = new Map<string, ManagedImage>();
	private userOrder: string[] = [];
	private imageElementCache = new Map<string, HTMLImageElement>();
	private subscribers: ((collection: ImageCollection) => void)[] = [];

	// Storage keys
	private readonly IMAGES_STORAGE_KEY = 'teo-media-user-images';
	private readonly ORDER_STORAGE_KEY = 'teo-media-user-order';

	/**
	 * Initialize service and load persisted state
	 */
	async initialize(): Promise<void> {
		await this.loadPersistedState();
		console.log(`ImageManagerService initialized with ${this.images.size} images`);
	}

	/**
	 * Load persisted images and ordering from storage
	 */
	private async loadPersistedState(): Promise<void> {
		try {
			// Load image metadata
			const imagesData = localStorage.getItem(this.IMAGES_STORAGE_KEY);
			if (imagesData) {
				const parsed: Omit<ManagedImage, 'file' | 'imageElement'>[] = JSON.parse(imagesData);

				// Load actual files from IndexedDB and reconstruct
				for (const imgData of parsed) {
					try {
						const file = await this.loadFileFromIndexedDB(imgData.id);
						if (file) {
							const managedImage: ManagedImage = {
								...imgData,
								file,
								url: URL.createObjectURL(file) // Create blob URL for the loaded file
							};
							this.images.set(imgData.id, managedImage);
						}
					} catch (error) {
						console.warn(`Failed to load file for image ${imgData.id}:`, error);
					}
				}
			}

			// Load user's ordering preference
			const orderData = localStorage.getItem(this.ORDER_STORAGE_KEY);
			if (orderData) {
				this.userOrder = JSON.parse(orderData);
			}

			console.log(
				`Loaded ${this.images.size} images with ordering: ${this.userOrder.length} items`
			);
		} catch (error) {
			console.warn('Failed to load persisted state:', error);
			this.images.clear();
			this.userOrder = [];
		}
	}

	/**
	 * Save current state to persistent storage
	 */
	private savePersistedState(): void {
		try {
			// Save image metadata (without file data)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const imagesForStorage = Array.from(this.images.values()).map(
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				({ file: _file, imageElement: _imageElement, ...img }) => img
			);
			localStorage.setItem(this.IMAGES_STORAGE_KEY, JSON.stringify(imagesForStorage));

			// Save user's ordering
			localStorage.setItem(this.ORDER_STORAGE_KEY, JSON.stringify(this.userOrder));

			console.log(`Saved ${this.images.size} images and ordering to storage`);
		} catch (error) {
			console.warn('Failed to save persisted state:', error);
		}
	}

	/**
	 * Load file from IndexedDB storage
	 */
	private async loadFileFromIndexedDB(id: string): Promise<File | null> {
		// Import here to avoid circular dependency
		const { indexedDBStorageService } = await import('./IndexedDBStorageService');
		return await indexedDBStorageService.getFile(id);
	}

	/**
	 * Save file to IndexedDB storage
	 */
	private async saveFileToIndexedDB(id: string, file: File): Promise<void> {
		// Import here to avoid circular dependency
		const { indexedDBStorageService } = await import('./IndexedDBStorageService');
		await indexedDBStorageService.storeFile(id, file);
	}

	/**
	 * Delete file from IndexedDB storage
	 */
	private async deleteFileFromIndexedDB(id: string): Promise<void> {
		// Import here to avoid circular dependency
		const { indexedDBStorageService } = await import('./IndexedDBStorageService');
		await indexedDBStorageService.deleteFile(id);
	}

	/**
	 * Subscribe to collection changes
	 */
	subscribe(callback: (collection: ImageCollection) => void): () => void {
		this.subscribers.push(callback);

		// Return unsubscribe function
		return () => {
			const index = this.subscribers.indexOf(callback);
			if (index > -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	/**
	 * Notify all subscribers of state changes
	 */
	private notifySubscribers(): void {
		const collection: ImageCollection = {
			images: this.getAllImages(),
			order: [...this.userOrder]
		};

		this.subscribers.forEach((callback) => {
			try {
				callback(collection);
			} catch (error) {
				console.error('Error in image collection subscriber:', error);
			}
		});
	}

	/**
	 * Get all images in user's preferred order
	 */
	getAllImages(): ManagedImage[] {
		// Return images in user's preferred order, or by insertion order if no preference
		if (this.userOrder.length > 0) {
			return this.userOrder
				.map((id) => this.images.get(id))
				.filter((img): img is ManagedImage => img !== undefined);
		}

		// Fallback to insertion order
		return Array.from(this.images.values());
	}

	/**
	 * Get image by ID
	 */
	getImage(id: string): ManagedImage | null {
		return this.images.get(id) || null;
	}

	/**
	 * Add images from files
	 */
	async addImages(files: FileList | File[]): Promise<ManagedImage[]> {
		const fileArray = Array.from(files);
		const newImages: ManagedImage[] = [];

		for (const file of fileArray) {
			// Validate file
			const validation = this.validateImageFile(file);
			if (!validation.valid) {
				console.warn(`Skipping invalid file ${file.name}: ${validation.error}`);
				continue;
			}

			const id = crypto.randomUUID();

			try {
				// Store file in IndexedDB
				await this.saveFileToIndexedDB(id, file);

				// Create managed image
				const managedImage: ManagedImage = {
					id,
					url: URL.createObjectURL(file),
					label: file.name,
					file
				};

				// Add to collection
				this.images.set(id, managedImage);

				// Add to user's order (at the end)
				this.userOrder.push(id);

				newImages.push(managedImage);

				console.log(`Added image: ${file.name} (${id})`);
			} catch (error) {
				console.error(`Failed to add image ${file.name}:`, error);
			}
		}

		// Save updated state
		this.savePersistedState();
		this.notifySubscribers();

		console.log(`Successfully added ${newImages.length} images`);
		return newImages;
	}

	/**
	 * Remove image by ID
	 */
	async removeImage(id: string): Promise<boolean> {
		const image = this.images.get(id);
		if (!image) {
			return false;
		}

		try {
			// Delete from IndexedDB
			await this.deleteFileFromIndexedDB(id);

			// Revoke blob URL
			URL.revokeObjectURL(image.url);

			// Remove from collection
			this.images.delete(id);

			// Remove from user's order
			const orderIndex = this.userOrder.indexOf(id);
			if (orderIndex > -1) {
				this.userOrder.splice(orderIndex, 1);
			}

			// Clear from cache if exists
			this.imageElementCache.delete(id);

			// Save updated state
			this.savePersistedState();
			this.notifySubscribers();

			console.log(`Removed image: ${id}`);
			return true;
		} catch (error) {
			console.error(`Failed to remove image ${id}:`, error);
			return false;
		}
	}

	/**
	 * Reorder images to match user's preference
	 */
	reorderImages(newOrder: string[]): void {
		// Validate that all IDs in new order exist
		const validOrder = newOrder.filter((id) => this.images.has(id));

		if (validOrder.length !== newOrder.length) {
			console.warn('Some images in reorder request do not exist, filtering them out');
		}

		this.userOrder = validOrder;

		// Save updated state
		this.savePersistedState();
		this.notifySubscribers();

		console.log(`Reordered images: ${validOrder.length} items`);
	}

	/**
	 * Get or create cached HTMLImageElement for an image
	 */
	getCachedImageElement(id: string): HTMLImageElement | null {
		// Return cached element if available
		if (this.imageElementCache.has(id)) {
			return this.imageElementCache.get(id)!;
		}

		const image = this.images.get(id);
		if (!image) {
			return null;
		}

		// Create new HTMLImageElement
		const imgElement = new Image();

		// Cache it for future use
		this.imageElementCache.set(id, imgElement);

		// Set up loading
		imgElement.onload = () => {
			console.log(`HTMLImageElement loaded for image: ${id}`);
		};

		imgElement.onerror = () => {
			console.warn(`Failed to load HTMLImageElement for image: ${id}`);
		};

		// Set source (this will trigger loading)
		imgElement.src = image.url;

		return imgElement;
	}

	/**
	 * Validate image file
	 */
	private validateImageFile(file: File): { valid: boolean; error?: string } {
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
	 * Clear all images
	 */
	async clearAllImages(): Promise<void> {
		// Revoke all blob URLs
		for (const image of this.images.values()) {
			URL.revokeObjectURL(image.url);
		}

		// Clear IndexedDB
		try {
			const { indexedDBStorageService } = await import('./IndexedDBStorageService');
			await indexedDBStorageService.clearAllFiles();
		} catch (error) {
			console.warn('Failed to clear IndexedDB files:', error);
		}

		// Clear local state
		this.images.clear();
		this.userOrder = [];
		this.imageElementCache.clear();

		// Save empty state
		this.savePersistedState();
		this.notifySubscribers();

		console.log('Cleared all images');
	}

	/**
	 * Get current collection state
	 */
	getCollection(): ImageCollection {
		return {
			images: this.getAllImages(),
			order: [...this.userOrder]
		};
	}

	/**
	 * Cleanup service
	 */
	cleanup(): void {
		// Revoke all blob URLs
		for (const image of this.images.values()) {
			URL.revokeObjectURL(image.url);
		}

		// Clear caches
		this.images.clear();
		this.userOrder = [];
		this.imageElementCache.clear();
		this.subscribers = [];

		console.log('ImageManagerService cleaned up');
	}
}

/**
 * Global image manager service instance
 */
export const imageManagerService = new ImageManagerService();
