import type { IDebuggable, IService } from './container';
import type { BinaryRef, MimeType } from '../types/core';

export interface IStorageService extends IService, IDebuggable {
	get<T = unknown>(key: string): Promise<T | undefined>;
	set<T = unknown>(key: string, value: T): Promise<void>;
	remove(key: string): Promise<void>;
	keys(prefix?: string): Promise<string[]>;
	clear(): Promise<void>;

	putBlob(key: string, data: Blob | ArrayBuffer, mimeType: MimeType): Promise<BinaryRef>;
	getBlob(ref: BinaryRef): Promise<Blob | undefined>;
	removeBlob(ref: BinaryRef): Promise<void>;
	estimateUsage(): Promise<{ bytesUsed: number; bytesAvailable?: number }>;

	setNamespace(ns: string): void;
	getNamespace(): string;
}

type KvScope = 'session' | 'local';

interface StorageOptions {
	kvScope?: KvScope; // default: "session"
	dbName?: string; // default: "app-storage"
	dbVersion?: number; // default: 1
}

interface BlobRecord {
	key: string; // ns:key
	blob: Blob;
	mimeType: MimeType;
	size: number;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
	});
}

function openDb(name: string, version: number): Promise<IDBDatabase> {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const req = indexedDB.open(name, version);
		req.onupgradeneeded = () => {
			const db = req.result;
			// Single store for blobs with keyPath = "key"
			if (!db.objectStoreNames.contains('blobs')) {
				db.createObjectStore('blobs', { keyPath: 'key' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
	});
}

export class StorageService implements IStorageService {
	private debug = false;
	private ns = 'default';
	private kvScope: KvScope;
	private dbName: string;
	private dbVersion: number;

	// Lazily opened DB
	private dbPromise: Promise<IDBDatabase> | null = null;

	constructor(options?: StorageOptions) {
		this.kvScope = options?.kvScope ?? 'session';
		this.dbName = options?.dbName ?? 'app-storage';
		this.dbVersion = options?.dbVersion ?? 1;
	}

	setDebug(enabled: boolean): void {
		this.debug = Boolean(enabled);
	}
	getDebug(): boolean {
		return this.debug;
	}

	setNamespace(ns: string): void {
		this.ns = ns || 'default';
		if (this.debug) {
			console.info('[Storage] namespace set', this.ns);
		}
	}
	getNamespace(): string {
		return this.ns;
	}

	private k(key: string): string {
		return `${this.ns}:${key}`;
	}

	// Choose KV backend
	private get kv(): Storage | null {
		if (typeof window === 'undefined') return null;
		return this.kvScope === 'session' ? window.sessionStorage : window.localStorage;
	}

	// KV API (Web Storage)
	async get<T = unknown>(key: string): Promise<T | undefined> {
		const kv = this.kv;
		if (!kv) return undefined;
		const raw = kv.getItem(this.k(key));
		if (raw == null) return undefined;
		try {
			return JSON.parse(raw) as T;
		} catch (e: unknown) {
			if (this.debug) {
				console.warn('[Storage] KV parse failed', key, e);
			}
			return undefined;
		}
	}

	async set<T = unknown>(key: string, value: T): Promise<void> {
		const kv = this.kv;
		if (!kv) return;
		try {
			kv.setItem(this.k(key), JSON.stringify(value));
		} catch (e: unknown) {
			if (this.debug) {
				console.warn('[Storage] KV set failed', key, e);
			}
			throw e;
		}
	}

	async remove(key: string): Promise<void> {
		const kv = this.kv;
		if (!kv) return;
		try {
			kv.removeItem(this.k(key));
		} catch (e: unknown) {
			if (this.debug) {
				console.warn('[Storage] KV remove failed', key, e);
			}
			throw e;
		}
	}

	async keys(prefix?: string): Promise<string[]> {
		const kv = this.kv;
		if (!kv) return [];
		const nsPrefix = this.k(prefix ?? '');
		const out: string[] = [];
		for (let i = 0; i < kv.length; i++) {
			const k = kv.key(i);
			if (!k) continue;
			if (k.startsWith(nsPrefix)) {
				// strip namespace:
				out.push(k.slice(this.ns.length + 1));
			}
		}
		return out;
	}

	async clear(): Promise<void> {
		const kv = this.kv;
		if (!kv) return;
		const nsPrefix = `${this.ns}:`;
		const toRemove: string[] = [];
		for (let i = 0; i < kv.length; i++) {
			const k = kv.key(i);
			if (k && k.startsWith(nsPrefix)) toRemove.push(k);
		}
		for (const k of toRemove) kv.removeItem(k);

		// Also clear blobs in this namespace
		if (typeof window !== 'undefined') {
			const db = await this.db();
			const tx = db.transaction('blobs', 'readwrite');
			const store = tx.objectStore('blobs');
			// Iterate namespace keys
			await new Promise<void>((resolve, reject) => {
				const req = store.openCursor();
				req.onsuccess = () => {
					const cursor = req.result;
					if (!cursor) {
						resolve();
						return;
					}
					const key = String(cursor.key);
					if (key.startsWith(nsPrefix)) {
						cursor.delete();
					}
					cursor.continue();
				};
				req.onerror = () => reject(req.error ?? new Error('Cursor failed'));
			});
			await new Promise<void>((res, rej) => {
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error ?? new Error('Transaction failed'));
				tx.onabort = () => rej(tx.error ?? new Error('Transaction aborted'));
			});
		}
	}

	// Blobs (IndexedDB)
	private async db(): Promise<IDBDatabase> {
		if (typeof window === 'undefined') {
			throw new Error('IndexedDB unavailable on server');
		}
		if (!this.dbPromise) {
			this.dbPromise = openDb(this.dbName, this.dbVersion);
		}
		return this.dbPromise;
	}

	async putBlob(key: string, data: Blob | ArrayBuffer, mimeType: MimeType): Promise<BinaryRef> {
		if (typeof window === 'undefined') {
			throw new Error('putBlob unavailable on server');
		}
		const db = await this.db();
		const nsKey = this.k(key);
		const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });

		const rec: BlobRecord = { key: nsKey, blob, mimeType, size: blob.size };
		const tx = db.transaction('blobs', 'readwrite');
		const store = tx.objectStore('blobs');
		store.put(rec);
		await new Promise<void>((res, rej) => {
			tx.oncomplete = () => res();
			tx.onerror = () => rej(tx.error ?? new Error('Transaction failed'));
			tx.onabort = () => rej(tx.error ?? new Error('Transaction aborted'));
		});

		if (this.debug) {
			console.info('[Storage] putBlob', nsKey, blob.size);
		}
		return { key: nsKey, byteLength: blob.size, mimeType };
	}

	async getBlob(ref: BinaryRef): Promise<Blob | undefined> {
		if (typeof window === 'undefined') return undefined;
		const db = await this.db();
		const tx = db.transaction('blobs', 'readonly');
		const store = tx.objectStore('blobs');
		const req = store.get(ref.key) as IDBRequest<BlobRecord | undefined>;
		const rec = await reqToPromise(req);
		return rec?.blob;
	}

	async removeBlob(ref: BinaryRef): Promise<void> {
		if (typeof window === 'undefined') return;
		const db = await this.db();
		const tx = db.transaction('blobs', 'readwrite');
		const store = tx.objectStore('blobs');
		store.delete(ref.key);
		await new Promise<void>((res, rej) => {
			tx.oncomplete = () => res();
			tx.onerror = () => rej(tx.error ?? new Error('Transaction failed'));
			tx.onabort = () => rej(tx.error ?? new Error('Transaction aborted'));
		});
	}

	async estimateUsage(): Promise<{ bytesUsed: number; bytesAvailable?: number }> {
		if (typeof window === 'undefined') return { bytesUsed: 0 };
		const db = await this.db();
		const tx = db.transaction('blobs', 'readonly');
		const store = tx.objectStore('blobs');

		const nsPrefix = `${this.ns}:`;
		let bytes = 0;

		await new Promise<void>((resolve, reject) => {
			const req = store.openCursor();
			req.onsuccess = () => {
				const cursor = req.result;
				if (!cursor) {
					resolve();
					return;
				}
				const key = String(cursor.key);
				if (key.startsWith(nsPrefix)) {
					const rec = cursor.value as BlobRecord;
					bytes += rec.size;
				}
				cursor.continue();
			};
			req.onerror = () => reject(req.error ?? new Error('Cursor failed'));
		});

		return { bytesUsed: bytes };
	}
}
