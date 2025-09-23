import { writable, type Writable } from 'svelte/store';

export function persisted<T>(key: string, initial: T): Writable<T> {
	console.log('persisted init', key, initial);
	let start: T = initial;
	if (typeof localStorage !== 'undefined') {
		const json = localStorage.getItem(key);
		if (json) {
			try {
				start = JSON.parse(json) as T;
			} catch {
				start = initial;
			}
		}
	}

	const store = writable<T>(start);

	store.subscribe((value) => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(key, JSON.stringify(value));
			console.log('persisted', key, value);
		} else {
			console.log('no local storage');
		}
	});

	return store;
}
