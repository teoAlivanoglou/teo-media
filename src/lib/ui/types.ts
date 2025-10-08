import type { ImageId } from '$lib/core/services';

export interface UiImage {
	id: ImageId;
	url: string; // preview blob URL (stable while item exists)
	name: string;
	width: number;
	height: number;
	bytes: number;
}
