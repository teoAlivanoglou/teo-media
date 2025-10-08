export type ImageId = `img_${string}`;
export type TextureId = `tex_${string}`;
export type LayerId = `layer_${string}`;
export type CompositionId = `comp_${string}`;
export type SessionId = `sess_${string}`;
export type Timestamp = number;

export type MimeType = string;

export interface BinaryRef {
	key: string;
	byteLength: number;
	mimeType: MimeType;
}

export interface Size {
	width: number;
	height: number;
}

export interface ImageMeta {
	id: ImageId;
	name: string;
	width: number;
	height: number;
	mimeType: MimeType;
	bytes: number;
	createdAt: Timestamp;
	updatedAt: Timestamp;
	orientation?: number;
}

export interface ImageRecord {
	meta: ImageMeta;
	binary: BinaryRef;
	thumbnail?: BinaryRef;
}

export interface EffectParam {
	name: string;
	type: 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'color';
	value: unknown;
}

export interface EffectNode {
	id: string;
	kind: string;
	params: EffectParam[];
	enabled: boolean;
}

export interface Layer {
	id: LayerId;
	imageId: ImageId;
	name?: string;
	visible: boolean;
	opacity: number;
	blend: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract' | 'darken' | 'lighten';
	effects: EffectNode[];
}

export interface Composition {
	id: CompositionId;
	name: string;
	background: { color: [number, number, number, number] } | { transparent: true };
	outputSize: Size;
	layers: Layer[];
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

export interface TextureRecord {
	id: TextureId;
	imageId: ImageId;
	width: number;
	height: number;
	glHandle: WebGLTexture;
	lastUsedAt: Timestamp;
}

export interface DrawItem {
	layerId: LayerId;
	textureId?: TextureId; // may be missing until ensured
	visible: boolean;
	opacity: number;
	blend: Layer['blend'];
}

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';
