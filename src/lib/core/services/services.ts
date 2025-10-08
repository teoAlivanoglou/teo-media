import { ServiceContainer } from './container';
import { TOKENS } from './tokens';
import { StorageService, type IStorageService } from './storage';
import { SessionService, type ISessionService } from './session';
import { ImageService, type IImageService } from './images';
// Render/Textures/Sync intentionally omitted for now

const container = ServiceContainer.getInstance();

let storage: IStorageService | undefined;
let session: ISessionService | undefined;
let images: IImageService | undefined;

export function initServices(): {
	storage: IStorageService;
	session: ISessionService;
	images: IImageService;
} {
	if (!storage) {
		storage = new StorageService();
		storage.setDebug(false);
		container.register(TOKENS.Storage, storage);
	}

	if (!session) {
		session = new SessionService();
		session.setDebug(false);
		container.register(TOKENS.Session, session);
	}

	if (!images) {
		images = new ImageService(storage);
		images.setDebug(false);
		container.register(TOKENS.Images, images);
	}

	// Start a reload-safe client session and namespace storage to it
	const sessId = session.resumeOrStart(60 * 60 * 1000);
	storage.setNamespace(sessId);

	return { storage, session, images };
}

export function getServices() {
	return {
		storage: storage!,
		session: session!,
		images: images!
	};
}
