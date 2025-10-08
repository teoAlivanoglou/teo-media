import { writable, type Readable, get } from 'svelte/store';
import type { UiImage } from '../types';
import type { ImageId } from '$lib/core/types/core';
import { initImagesRuntime, getImageService } from '$lib/runtime/imagesRuntime';

const items = writable<UiImage[]>([]);
const isLoading = writable<boolean>(false);

let unsubImages: (() => void) | null = null;
let unsubOrder: (() => void) | null = null;

async function rebuild(): Promise<void> {
	const images = getImageService();
	isLoading.set(true);
	try {
		const recMap = get(images.images);
		const order = get(images.order);

		const prev = get(items);
		const prevUrlById = new Map<string, string>(prev.map((p) => [p.id, p.url]));

		const next: UiImage[] = [];
		for (const id of order) {
			const rec = recMap.get(id);
			if (!rec) continue;
			const url = prevUrlById.get(id) ?? (await images.getPreviewUrl(id));
			next.push({
				id,
				url,
				name: rec.meta.name,
				width: rec.meta.width,
				height: rec.meta.height,
				bytes: rec.meta.bytes
			});
		}

		const nextIds = new Set(next.map((n) => n.id));
		for (const old of prev) {
			if (!nextIds.has(old.id)) {
				images.releasePreviewUrl(old.id);
			}
		}

		items.set(next);
	} finally {
		isLoading.set(false);
	}
}

export async function startImagesAdapter(): Promise<void> {
	await initImagesRuntime();

	const images = getImageService();

	await images.loadState();
	await rebuild();

	unsubImages?.();
	unsubOrder?.();
	unsubImages = images.images.subscribe(() => {
		void rebuild();
	});
	unsubOrder = images.order.subscribe(() => {
		void rebuild();
	});
}

export function stopImagesAdapter(): void {
	unsubImages?.();
	unsubImages = null;
	unsubOrder?.();
	unsubOrder = null;

	const images = getImageService();
	for (const it of get(items)) {
		images.releasePreviewUrl(it.id);
	}
	items.set([]);
}

export const imagesUi: Readable<UiImage[]> = { subscribe: items.subscribe };
export const isLoadingImages: Readable<boolean> = { subscribe: isLoading.subscribe };

export async function addFiles(files: FileList | File[]): Promise<void> {
	const arr = Array.from(files);
	if (arr.length === 0) return;
	const images = getImageService();
	isLoading.set(true);
	try {
		await images.addFiles(arr, { generateThumb: false });
		await images.saveState();
		await rebuild();
	} finally {
		isLoading.set(false);
	}
}

export async function removeImage(id: ImageId): Promise<void> {
	const images = getImageService();
	await images.remove(id);
	images.releasePreviewUrl(id);
	await images.saveState();
	await rebuild();
}

export async function reorder(nextOrder: ImageId[]): Promise<void> {
	const images = getImageService();
	images.reorder(nextOrder);
	await images.saveState();
	await rebuild();
}

export async function clearAll(): Promise<void> {
	const images = getImageService();
	await images.clearAll();
	await rebuild();
}
