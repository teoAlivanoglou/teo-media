function randomHex(bytes = 8): string {
	const buf = new Uint8Array(bytes);
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		crypto.getRandomValues(buf);
	} else {
		for (let i = 0; i < bytes; i++) {
			buf[i] = Math.floor(Math.random() * 256);
		}
	}
	return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const newImageId = (): `img_${string}` => `img_${randomHex(8)}`;
export const newLayerId = (): `layer_${string}` => `layer_${randomHex(8)}`;
export const newTextureId = (): `tex_${string}` => `tex_${randomHex(8)}`;
export const newCompositionId = (): `comp_${string}` => `comp_${randomHex(8)}`;
export const newSessionId = (): `sess_${string}` => `sess_${randomHex(8)}`;
export const nowTs = (): number => Date.now();
