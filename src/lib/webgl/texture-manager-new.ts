/**
 * CachedTexture - Internal representation of a cached texture
 */
interface CachedTexture {
	url: string;
	image: HTMLImageElement;
	texture: WebGLTexture;
	slot: number;
	lastAccessed: Date;
	accessCount: number;
	size: number; // Estimated memory usage
}

/**
 * TextureManager - Refactored with unified caching and dynamic slot management
 * Consolidates all image/URL/HTMLImageElement caching for optimal performance
 * Works in browser environments with WebGL support
 */
export class TextureManager {
	private gl: WebGL2RenderingContext;
	private textures: (WebGLTexture | null)[] = [];
	private cache = new Map<string, CachedTexture>();
	private maxSlots: number;
	private currentSize = 0;
	private maxMemoryUsage = 200 * 1024 * 1024; // 200MB default

	constructor(gl: WebGL2RenderingContext, maxSlots = 32) {
		this.gl = gl;
		this.maxSlots = maxSlots;

		// Initialize texture slots
		for (let i = 0; i < maxSlots; i++) {
			this.textures[i] = null;
		}
	}

	/**
	 * Ensure WebGL context is available
	 */
	private ensureWebGLContext(): WebGL2RenderingContext {
		if (!this.gl) {
			throw new Error(
				'WebGL context not available. Make sure to initialize TextureManager with a valid WebGL context.'
			);
		}
		return this.gl;
	}

	/**
	 * Get or create a texture for a URL with automatic caching
	 */
	async getTextureForUrl(url: string): Promise<{ texture: WebGLTexture; slot: number }> {
		// Check cache first
		const cached = this.cache.get(url);
		if (cached) {
			cached.lastAccessed = new Date();
			cached.accessCount++;
			return { texture: cached.texture, slot: cached.slot };
		}

		// Load new image
		try {
			const image = await this.loadImageFromUrl(url);
			return this.createTextureFromImage(url, image);
		} catch (error) {
			console.warn('Failed to load texture from URL:', url, error);
			throw error;
		}
	}

	/**
	 * Get or create a texture for an HTMLImageElement
	 */
	async getTextureForImage(
		image: HTMLImageElement
	): Promise<{ texture: WebGLTexture; slot: number }> {
		// Find by image reference in cache
		for (const [url, cached] of this.cache.entries()) {
			if (cached.image === image) {
				cached.lastAccessed = new Date();
				cached.accessCount++;
				return { texture: cached.texture, slot: cached.slot };
			}
		}

		// Create new texture from image
		return this.createTextureFromImage(image.src, image);
	}

	/**
	 * Preload multiple URLs for better performance
	 */
	async preload(urls: string[]): Promise<void> {
		const promises = urls.map((url) => this.getTextureForUrl(url));
		await Promise.allSettled(promises);
	}

	/**
	 * Release a texture slot (mark as available for reuse)
	 */
	releaseTexture(slot: number): void {
		if (slot < 0 || slot >= this.textures.length) return;

		const texture = this.textures[slot];
		if (texture && this.gl) {
			this.gl.deleteTexture(texture);
			this.textures[slot] = null;
		}

		// Remove from cache if this slot was cached
		for (const [url, cached] of this.cache.entries()) {
			if (cached.slot === slot) {
				this.cache.delete(url);
				this.currentSize -= cached.size;
				break;
			}
		}
	}

	/**
	 * Create a placeholder texture
	 */
	createPlaceholder(
		slot: number,
		width: number,
		height: number,
		color: [number, number, number, number],
		wrap: TextureWrap = TextureWrap.CLAMP,
		filter: TextureFilter = TextureFilter.LINEAR
	): void {
		const gl = this.ensureWebGLContext();

		if (slot < 0 || slot >= this.textures.length) {
			throw new Error(`Invalid texture slot: ${slot}`);
		}

		// Release existing texture if present
		this.releaseTexture(slot);

		const texture = gl.createTexture();
		if (!texture) throw new Error('Failed to create texture');

		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		const data = new Uint8Array(width * height * 4);
		for (let i = 0; i < data.length; i += 4) {
			data[i + 0] = color[0];
			data[i + 1] = color[1];
			data[i + 2] = color[2];
			data[i + 3] = color[3];
		}

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

		this.textures[slot] = texture;
	}

	/**
	 * Get texture by slot index
	 */
	getTexture(slot: number): WebGLTexture | null {
		return this.textures[slot] ?? null;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		activeSlots: number;
		cacheSize: number;
		maxSlots: number;
		memoryUsage: number;
		hitRate: number;
	} {
		const activeSlots = this.textures.filter((t) => t !== null).length;
		const hitRate = this.calculateHitRate();

		return {
			activeSlots,
			cacheSize: this.cache.size,
			maxSlots: this.maxSlots,
			memoryUsage: this.currentSize,
			hitRate
		};
	}

	/**
	 * Set maximum number of texture slots
	 */
	setMaxSlots(maxSlots: number): void {
		if (maxSlots < this.maxSlots) {
			// Need to release some textures
			const slotsToRelease = this.maxSlots - maxSlots;
			for (let i = this.maxSlots - 1; i >= maxSlots && slotsToRelease > 0; i--) {
				this.releaseTexture(i);
			}
		}

		this.maxSlots = maxSlots;

		// Resize texture array if needed
		while (this.textures.length < maxSlots) {
			this.textures.push(null);
		}
	}

	/**
	 * Cleanup all resources
	 */
	cleanup(): void {
		// Release all textures
		for (let i = 0; i < this.textures.length; i++) {
			this.releaseTexture(i);
		}

		// Clear cache
		this.cache.clear();
		this.currentSize = 0;
	}

	/**
	 * Store a file and get a texture (creates blob URL)
	 */
	async storeAndGetTexture(
		file: File
	): Promise<{ texture: WebGLTexture; slot: number; url: string }> {
		// Create blob URL for the file
		const url = URL.createObjectURL(file);

		// Load as texture
		const { texture, slot } = await this.getTextureForUrl(url);

		return { texture, slot, url };
	}

	private async createTextureFromImage(
		url: string,
		image: HTMLImageElement
	): Promise<{ texture: WebGLTexture; slot: number }> {
		// Find available slot
		const slot = this.findAvailableSlot();
		if (slot === -1) {
			// Evict LRU texture
			this.evictLRU();
			const newSlot = this.findAvailableSlot();
			if (newSlot === -1) {
				throw new Error('No available texture slots');
			}
			return this.createTextureAtSlot(url, image, newSlot);
		}

		return this.createTextureAtSlot(url, image, slot);
	}

	private async createTextureAtSlot(
		url: string,
		image: HTMLImageElement,
		slot: number
	): Promise<{ texture: WebGLTexture; slot: number }> {
		const gl = this.ensureWebGLContext();

		// Create WebGL texture
		let texture = this.textures[slot];
		if (!texture) {
			texture = gl.createTexture();
			if (!texture) throw new Error('Failed to create WebGL texture');
			this.textures[slot] = texture;
		}

		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

		// Set default parameters
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Cache the texture
		const size = this.estimateImageSize(image);
		const cachedTexture: CachedTexture = {
			url,
			image,
			texture,
			slot,
			lastAccessed: new Date(),
			accessCount: 1,
			size
		};

		this.cache.set(url, cachedTexture);
		this.currentSize += size;

		// Enforce memory limits
		this.enforceMemoryLimits();

		return { texture, slot };
	}

	private async loadImageFromUrl(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';

			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(`Failed to load image: ${url}`));

			img.src = url;
		});
	}

	private findAvailableSlot(): number {
		return this.textures.findIndex((t) => t === null);
	}

	private evictLRU(): void {
		let oldest: CachedTexture | null = null;
		let oldestUrl: string | null = null;

		// Find least recently used texture
		for (const [url, cached] of this.cache.entries()) {
			if (!oldest || cached.lastAccessed < oldest.lastAccessed) {
				oldest = cached;
				oldestUrl = url;
			}
		}

		if (oldestUrl && oldest) {
			this.releaseTexture(oldest.slot);
		}
	}

	private enforceMemoryLimits(): void {
		// If over memory limit, evict until under limit
		while (this.currentSize > this.maxMemoryUsage && this.cache.size > 0) {
			this.evictLRU();
		}
	}

	private estimateImageSize(image: HTMLImageElement): number {
		// Rough estimation: width * height * 4 bytes per pixel (RGBA)
		const pixelCount = image.width * image.height;
		const imageDataSize = pixelCount * 4;
		const objectOverhead = 2048; // JS object + WebGL texture overhead

		return imageDataSize + objectOverhead;
	}

	private calculateHitRate(): number {
		const totalAccesses = Array.from(this.cache.values()).reduce(
			(sum, cached) => sum + cached.accessCount,
			0
		);

		if (totalAccesses === 0) return 0;

		const hits = Array.from(this.cache.values()).reduce(
			(sum, cached) => sum + (cached.accessCount - 1),
			0
		);

		return hits / totalAccesses;
	}
}

// Re-export enums for backward compatibility - exactly like original
export enum TextureWrap {
	CLAMP = WebGL2RenderingContext.CLAMP_TO_EDGE,
	REPEAT = WebGL2RenderingContext.REPEAT,
	MIRRORED_REPEAT = WebGL2RenderingContext.MIRRORED_REPEAT
}

export enum TextureFilter {
	NEAREST = WebGL2RenderingContext.NEAREST,
	LINEAR = WebGL2RenderingContext.LINEAR
}
