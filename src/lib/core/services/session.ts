import { writable, type Readable } from 'svelte/store';
import type { IDebuggable, IService } from './container';
import type { SessionId, Timestamp } from '../types/core';
import { newSessionId, nowTs } from '../utils/id';

interface SessionState {
	id?: SessionId;
	expiresAt?: Timestamp;
	active: boolean;
}

export interface ISessionService extends IService, IDebuggable {
	readonly sessionId: Readable<SessionId | undefined>;
	readonly expiresAt: Readable<Timestamp | undefined>;
	readonly active: Readable<boolean>;

	resumeOrStart(ttlMs?: number): SessionId;
	startNew(ttlMs?: number): SessionId;
	renew(ttlMs?: number): void;
	end(): void;
}

const SS_KEY = 'app.session';

export class SessionService implements ISessionService {
	private debug = false;
	private _sessionId = writable<SessionId | undefined>(undefined);
	private _expiresAt = writable<Timestamp | undefined>(undefined);
	private _active = writable<boolean>(false);

	setDebug(enabled: boolean): void {
		this.debug = !!enabled;
	}
	getDebug(): boolean {
		return this.debug;
	}

	get sessionId() {
		return { subscribe: this._sessionId.subscribe };
	}
	get expiresAt() {
		return { subscribe: this._expiresAt.subscribe };
	}
	get active() {
		return { subscribe: this._active.subscribe };
	}

	resumeOrStart(ttlMs: number = 1000 * 60 * 60): SessionId {
		try {
			const raw = sessionStorage.getItem(SS_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as SessionState;
				if (parsed.id && (!parsed.expiresAt || parsed.expiresAt > nowTs())) {
					this._sessionId.set(parsed.id);
					this._expiresAt.set(parsed.expiresAt);
					this._active.set(true);
					if (this.debug) console.info('[Session] resumed', parsed);
					return parsed.id;
				}
			}
		} catch (e) {
			if (this.debug) console.warn('[Session] resume failed', e);
		}
		return this.startNew(ttlMs);
	}

	startNew(ttlMs: number = 1000 * 60 * 60): SessionId {
		const id = newSessionId();
		const expiresAt = nowTs() + ttlMs;
		const state: SessionState = { id, expiresAt, active: true };
		try {
			sessionStorage.setItem(SS_KEY, JSON.stringify(state));
		} catch (e) {
			if (this.debug) console.warn('[Session] persist failed', e);
		}
		this._sessionId.set(id);
		this._expiresAt.set(expiresAt);
		this._active.set(true);
		if (this.debug) console.info('[Session] started', state);
		return id;
	}

	renew(ttlMs: number = 1000 * 60 * 60): void {
		let curId: SessionId | undefined;
		this._sessionId.subscribe((v) => {
			curId = v;
		})();
		if (!curId) return;
		const expiresAt = nowTs() + ttlMs;
		try {
			sessionStorage.setItem(SS_KEY, JSON.stringify({ id: curId, expiresAt, active: true }));
		} catch (e) {
			if (this.debug) console.warn('[Session] renew persist failed', e);
		}
		this._expiresAt.set(expiresAt);
		if (this.debug) console.info('[Session] renewed', { curId, expiresAt });
	}

	end(): void {
		try {
			sessionStorage.removeItem(SS_KEY);
		} catch (e) {
			if (this.debug) console.warn('[Session] end persist failed', e);
		}
		this._sessionId.set(undefined);
		this._expiresAt.set(undefined);
		this._active.set(false);
		if (this.debug) console.info('[Session] ended');
	}
}
