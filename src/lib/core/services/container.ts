export interface IService {
	init?(): Promise<void> | void;
	dispose?(): Promise<void> | void;
}

export interface IDebuggable {
	setDebug(enabled: boolean): void;
	getDebug(): boolean;
}

export interface ServiceToken<T> {
	key: string;
	// phantom to “use” T, keeping generic meaningful without runtime impact
	readonly __type?: (v: T) => T;
}

type Initializable = { init: () => Promise<void> | void };
type Disposable = { dispose: () => Promise<void> | void };

function hasInit(x: unknown): x is Initializable {
	return typeof (x as { init?: unknown }).init === 'function';
}
function hasDispose(x: unknown): x is Disposable {
	return typeof (x as { dispose?: unknown }).dispose === 'function';
}

export class ServiceContainer {
	private static instance: ServiceContainer | null = null;
	static getInstance(): ServiceContainer {
		if (!ServiceContainer.instance) ServiceContainer.instance = new ServiceContainer();
		return ServiceContainer.instance;
	}

	private readonly services = new Map<string, unknown>();
	private readonly factories = new Map<string, () => unknown>();
	private readonly singletons = new Set<string>();
	private debug = false;

	setDebug(enabled: boolean): void {
		this.debug = !!enabled;
	}
	getDebug(): boolean {
		return this.debug;
	}

	register<T>(token: ServiceToken<T>, instance: T): void {
		this.services.set(token.key, instance);
	}

	registerSingleton<T>(token: ServiceToken<T>, factory: () => T): void {
		this.factories.set(token.key, factory as () => unknown);
		this.singletons.add(token.key);
	}

	resolve<T>(token: ServiceToken<T>): T {
		if (this.services.has(token.key)) return this.services.get(token.key) as T;
		const factory = this.factories.get(token.key);
		if (factory) {
			const inst = factory() as T;
			if (this.singletons.has(token.key)) this.services.set(token.key, inst);
			return inst;
		}
		throw new Error(`Service not found: ${token.key}`);
	}

	tryResolve<T>(token: ServiceToken<T>): T | undefined {
		try {
			return this.resolve(token);
		} catch {
			return undefined;
		}
	}

	async initAll(): Promise<void> {
		for (const inst of this.services.values()) if (hasInit(inst)) await inst.init();
	}

	async disposeAll(): Promise<void> {
		for (const inst of this.services.values()) if (hasDispose(inst)) await inst.dispose();
	}
}
