import type { ServiceToken } from './container';
import type { ISessionService } from './session';
import type { IStorageService } from './storage';
import type { IImageService } from './images';
import type { ICompositionService } from './composition';
import type { ITextureService } from './textures';
import type { IRenderService } from './render';
import type { ISyncService } from './sync';

export const TOKENS = {
	Session: { key: 'session' } as ServiceToken<ISessionService>,
	Storage: { key: 'storage' } as ServiceToken<IStorageService>,
	Images: { key: 'images' } as ServiceToken<IImageService>,
	Compose: { key: 'composition' } as ServiceToken<ICompositionService>,
	Textures: { key: 'textures' } as ServiceToken<ITextureService>,
	Render: { key: 'render' } as ServiceToken<IRenderService>,
	Sync: { key: 'sync' } as ServiceToken<ISyncService>
} as const;
