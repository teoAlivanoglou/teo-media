/**
 * IndexedDB Storage Service - Handles persistent file storage
 */
export class IndexedDBStorageService {
	private dbName = 'teo-media-files';
	private dbVersion = 1;
	private db: IDBDatabase | null = null;

	/**
	 * Initialize IndexedDB database
	 */
	async initialize(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);

			request.onerror = () => {
				console.error('Failed to open IndexedDB:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				this.db = request.result;
				console.log('IndexedDB initialized successfully');
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Create object store for files if it doesn't exist
				if (!db.objectStoreNames.contains('files')) {
					const store = db.createObjectStore('files', { keyPath: 'id' });
					store.createIndex('filename', 'filename', { unique: false });
					store.createIndex('uploadDate', 'uploadDate', { unique: false });
					console.log('Created IndexedDB files store');
				}
			};
		});
	}

	/**
	 * Store file data in IndexedDB
	 */
	async storeFile(id: string, file: File): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		// First, read the file data (outside of transaction)
		const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as ArrayBuffer);
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(file);
		});

		// Then store in IndexedDB (synchronous transaction)
		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['files'], 'readwrite');
			const store = transaction.objectStore('files');

			const fileData = {
				id,
				filename: file.name,
				type: file.type,
				size: file.size,
				data: arrayBuffer,
				uploadDate: new Date().toISOString()
			};

			const request = store.put(fileData);

			request.onerror = () => {
				console.error('Failed to store file in IndexedDB:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				console.log(`Stored file in IndexedDB: ${id}`);
				resolve();
			};
		});
	}

	/**
	 * Retrieve file data from IndexedDB
	 */
	async getFile(id: string): Promise<File | null> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['files'], 'readonly');
			const store = transaction.objectStore('files');
			const request = store.get(id);

			request.onerror = () => {
				console.error('Failed to retrieve file from IndexedDB:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				const result = request.result;

				if (!result) {
					resolve(null);
					return;
				}

				// Reconstruct File object from stored data
				const file = new File([result.data], result.filename, {
					type: result.type,
					lastModified: new Date(result.uploadDate).getTime()
				});

				console.log(`Retrieved file from IndexedDB: ${id}`);
				resolve(file);
			};
		});
	}

	/**
	 * Delete file from IndexedDB
	 */
	async deleteFile(id: string): Promise<boolean> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['files'], 'readwrite');
			const store = transaction.objectStore('files');
			const request = store.delete(id);

			request.onerror = () => {
				console.error('Failed to delete file from IndexedDB:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				console.log(`Deleted file from IndexedDB: ${id}`);
				resolve(true);
			};
		});
	}

	/**
	 * Get all stored file metadata (without file data)
	 */
	async getAllFileMetadata(): Promise<
		Array<{ id: string; filename: string; size: number; uploadDate: string }>
	> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['files'], 'readonly');
			const store = transaction.objectStore('files');
			const request = store.getAll();

			request.onerror = () => {
				console.error('Failed to get file metadata from IndexedDB:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				const results = request.result.map(
					(item: { id: string; filename: string; size: number; uploadDate: string }) => ({
						id: item.id,
						filename: item.filename,
						size: item.size,
						uploadDate: item.uploadDate
					})
				);
				resolve(results);
			};
		});
	}

	/**
	 * Clear all stored files
	 */
	async clearAllFiles(): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['files'], 'readwrite');
			const store = transaction.objectStore('files');
			const request = store.clear();

			request.onerror = () => {
				console.error('Failed to clear IndexedDB files:', request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				console.log('Cleared all files from IndexedDB');
				resolve();
			};
		});
	}

	/**
	 * Get storage usage information
	 */
	async getStorageInfo(): Promise<{ used: number; available: number }> {
		if (!this.db) {
			await this.initialize();
		}

		return new Promise((resolve) => {
			// Estimate usage by counting files and getting total size
			this.getAllFileMetadata()
				.then((metadata) => {
					const used = metadata.reduce((total, file) => total + file.size, 0);
					// Estimate available space (this is approximate)
					const available = 50 * 1024 * 1024; // Assume 50MB available
					resolve({ used, available });
				})
				.catch(() => {
					resolve({ used: 0, available: 50 * 1024 * 1024 });
				});
		});
	}
}

/**
 * Global IndexedDB storage service instance
 */
export const indexedDBStorageService = new IndexedDBStorageService();
