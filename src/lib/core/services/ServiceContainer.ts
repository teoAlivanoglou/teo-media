/**
 * Service Container - Global registry for managing WebGL and other services
 * Provides dependency injection and singleton management
 */
export class ServiceContainer {
	private static instance: ServiceContainer;
	private services = new Map<string, unknown>();
	private factories = new Map<string, () => unknown>();
	private singletons = new Map<string, boolean>();

	private constructor() {}

	static getInstance(): ServiceContainer {
		if (!ServiceContainer.instance) {
			ServiceContainer.instance = new ServiceContainer();
		}
		return ServiceContainer.instance;
	}

	/**
	 * Register a service factory
	 */
	register<T>(name: string, factory: () => T, singleton: boolean = true): void {
		this.factories.set(name, factory);
		this.singletons.set(name, singleton);
	}

	/**
	 * Register an existing service instance
	 */
	registerInstance<T>(name: string, instance: T): void {
		this.services.set(name, instance);
		this.singletons.set(name, true);
	}

	/**
	 * Get a service by name
	 */
	get<T>(name: string): T {
		// Return existing instance if available
		if (this.services.has(name)) {
			return this.services.get(name) as T;
		}

		// Create new instance if factory exists
		if (this.factories.has(name)) {
			const factory = this.factories.get(name)!;
			const instance = factory();

			if (this.singletons.get(name)) {
				this.services.set(name, instance);
			}

			return instance as T;
		}

		throw new Error(`Service '${name}' not registered`);
	}

	/**
	 * Check if a service is registered
	 */
	has(name: string): boolean {
		return this.services.has(name) || this.factories.has(name);
	}

	/**
	 * Clear all services (useful for cleanup)
	 */
	clear(): void {
		this.services.clear();
		this.factories.clear();
		this.singletons.clear();
	}

	/**
	 * Get all registered service names
	 */
	getServiceNames(): string[] {
		return Array.from(new Set([...this.services.keys(), ...this.factories.keys()]));
	}
}

/**
 * Global service container instance
 */
export const serviceContainer = ServiceContainer.getInstance();

/**
 * Service identifiers
 */
export const Services = {
	WEBGL_CONTEXT: 'webgl-context',
	TEXTURE_MANAGER: 'texture-manager',
	WEBGL_RENDERER: 'webgl-renderer',
	RENDER_PASS_MANAGER: 'render-pass-manager'
} as const;
