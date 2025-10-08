import { SessionService, type ISessionService } from '$lib/core/services/session';
import { StorageService, type IStorageService } from '$lib/core/services/storage';
import { ImageService, type IImageService } from '$lib/core/services/images';

let sessionSvc: ISessionService | null = null;
let storageSvc: IStorageService | null = null;
let imageSvc: IImageService | null = null;

export function getImageService(): IImageService {
	if (!imageSvc) {
		throw new Error('Runtime not initialized. Call initImagesRuntime() on client first.');
	}
	return imageSvc;
}

export async function initImagesRuntime(ttlMs: number = 60 * 60 * 1000): Promise<void> {
	// client-only guard
	if (typeof window === 'undefined') return;

	if (!storageSvc) {
		storageSvc = new StorageService();
		storageSvc.setDebug(false);
	}

	if (!sessionSvc) {
		sessionSvc = new SessionService();
		sessionSvc.setDebug(false);
	}

	const sessionId = sessionSvc.resumeOrStart(ttlMs);
	storageSvc.setNamespace(sessionId);

	if (!imageSvc) {
		imageSvc = new ImageService(storageSvc);
		imageSvc.setDebug(false);
	}

	await imageSvc.loadState();
}

export async function disposeImagesRuntime(): Promise<void> {
	if (imageSvc) {
		await imageSvc.clearAll(); // optional depending on desired teardown behavior
	}
	// Keep session/namespace unless you explicitly want to end the session.
}
