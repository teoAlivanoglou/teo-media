import { writable, type Readable } from 'svelte/store';
import type { IDebuggable, IService } from './container';
import type { Composition, DrawItem, Size, Timestamp, LayerId } from '../types/core';

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type Bg = Composition['background'];

function isTransparentBg(bg: Bg): bg is { transparent: true } {
	return 'transparent' in bg && bg.transparent === true;
}

function isColorBg(bg: Bg): bg is { color: [number, number, number, number] } {
	return 'color' in bg;
}

export interface IRenderService extends IService, IDebuggable {
	attachCanvas(canvas: HTMLCanvasElement): void;
	detachCanvas(): void;

	setViewport(size: Size, dpr: number): void;
	setBackground(bg: Composition['background']): void;

	setDrawList(items: DrawItem[]): void;
	updateDrawItem(item: DrawItem): void;
	removeDrawItem(layerId: LayerId): void;

	requestFrame(): void;
	renderNow(): void;

	readonly ready: Readable<boolean>;
	readonly stats: Readable<{ frameMs: number; lastFrameAt: Timestamp }>;

	getGl(): GL | undefined;
}

export class RenderService implements IRenderService {
	private debug = false;
	private canvas?: HTMLCanvasElement;
	private gl?: GL;
	private dpr = 1;
	private width = 0;
	private height = 0;
	private bg: Composition['background'] = { transparent: true };
	private drawList: DrawItem[] = [];
	private raf = 0;
	private _ready = writable<boolean>(false);
	private _stats = writable<{ frameMs: number; lastFrameAt: Timestamp }>({
		frameMs: 0,
		lastFrameAt: 0
	});

	setDebug(enabled: boolean): void {
		this.debug = !!enabled;
	}
	getDebug(): boolean {
		return this.debug;
	}

	get ready() {
		return { subscribe: this._ready.subscribe };
	}
	get stats() {
		return { subscribe: this._stats.subscribe };
	}
	getGl(): GL | undefined {
		return this.gl;
	}

	attachCanvas(canvas: HTMLCanvasElement): void {
		this.canvas = canvas;
		const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as GL | null;
		if (!gl) throw new Error('Unable to create WebGL context');
		this.gl = gl;
		this._ready.set(true);
		if (this.debug) console.info('[Render] context ready');
	}

	detachCanvas(): void {
		this.cancelRAF();
		this.gl = undefined;
		this.canvas = undefined;
		this._ready.set(false);
	}

	setViewport(size: Size, dpr: number): void {
		this.dpr = Math.max(0.5, dpr || 1);
		this.width = Math.max(1, Math.floor(size.width * this.dpr));
		this.height = Math.max(1, Math.floor(size.height * this.dpr));
		if (this.canvas) {
			this.canvas.width = this.width;
			this.canvas.height = this.height;
			this.canvas.style.width = `${size.width}px`;
			this.canvas.style.height = `${size.height}px`;
		}
		if (this.gl) this.gl.viewport(0, 0, this.width, this.height);
	}

	setBackground(bg: Composition['background']): void {
		this.bg = bg;
	}

	setDrawList(items: DrawItem[]): void {
		this.drawList = items;
	}

	updateDrawItem(item: DrawItem): void {
		const i = this.drawList.findIndex((d) => d.layerId === item.layerId);
		if (i >= 0) this.drawList[i] = item;
		else this.drawList.push(item);
	}

	removeDrawItem(layerId: LayerId): void {
		this.drawList = this.drawList.filter((d) => d.layerId !== layerId);
	}

	requestFrame(): void {
		if (this.raf) return;
		this.raf = requestAnimationFrame((t) => this.renderInternal(t));
	}

	renderNow(): void {
		this.renderInternal(performance.now());
	}

	private cancelRAF(): void {
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
	}

	private renderInternal(now: number): void {
		this.raf = 0;
		const start = performance.now();
		const gl = this.gl;
		if (!gl) return;
		// Narrow background safely via a local copy + predicates
		const bg = this.bg;
		if (isTransparentBg(bg)) {
			gl.clearColor(0, 0, 0, 0);
		} else if (isColorBg(bg)) {
			const [r, g, b, a] = bg.color;
			gl.clearColor(r, g, b, a);
		} else {
			// defensive fallback (shouldn't happen with current union)
			gl.clearColor(0, 0, 0, 1);
		}
		gl.clear(gl.COLOR_BUFFER_BIT);
		// TODO: draw textured quads
		const end = performance.now();
		this._stats.set({ frameMs: end - start, lastFrameAt: now });
	}
}
