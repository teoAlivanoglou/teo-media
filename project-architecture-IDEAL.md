# Teo-Media Project - Ideal Architecture (Post-Refactor)

## Overview
A well-structured media processing application with proper separation of concerns, persistent storage, and scalable architecture.

## Technology Stack
- **Frontend**: SvelteKit + TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Graphics**: Modular WebGL2 rendering system
- **State**: Enhanced persistence with migrations
- **Storage**: Persistent media management
- **Build**: Vite with optimized bundling

## Proposed Architecture

### 1. Core Business Logic Layer
```
src/lib/core/
├── media/                          # Media processing & storage
│   ├── MediaManager.ts            # Central media coordination
│   ├── ImageCache.ts              # Persistent image caching
│   ├── ImageProcessor.ts          # Image processing operations
│   └── MediaStorage.ts            # File/blob management
├── renderer/                       # WebGL rendering system
│   ├── WebGLRenderer.ts           # Main renderer (refactored)
│   ├── TextureManager.ts          # Dynamic texture management
│   ├── RenderPipeline.ts          # Render pass management
│   └── ShaderLibrary.ts           # Shader collection & management
└── state/                          # State management
    ├── Store.ts                   # Base store class
    ├── PersistedStore.ts          # Enhanced persistence
    └── StateManager.ts             # Global state coordination
```

### 2. User Interface Layer
```
src/lib/ui/
├── containers/                     # Layout containers
│   ├── ImageListContainer.svelte  # Image list management
│   ├── ReorderOverlay.svelte      # Drag reordering system
│   └── DropZone.svelte            # File drop zones
├── controls/                       # Basic UI controls
│   ├── Slider.svelte              # Range sliders
│   ├── Button.svelte              # Button components
│   └── ThemePicker.svelte         # Theme selection
└── layout/                         # Layout components
    ├── Header.svelte              # Application header
    ├── Sidebar.svelte             # Navigation sidebar
    └── MainLayout.svelte          # Main layout wrapper
```

### 3. Utilities & Actions
```
src/lib/utils/                      # Utility functions
├── file-utils.ts                  # File operations
├── gl-utils.ts                    # WebGL utilities
└── validation.ts                  # Input validation

src/lib/actions/                    # Svelte actions
└── portal.ts                      # Portal action
```

## Component APIs & Interfaces

### MediaManager
```typescript
class MediaManager {
  // Central hub for all media operations
  async loadImage(file: File): Promise<ImageItem>
  async loadImageFromUrl(url: string): Promise<ImageItem>
  getImage(id: string): ImageItem | null
  removeImage(id: string): void
  getAllImages(): ImageItem[]
  clearCache(): void
}
```

### ImageCache
```typescript
class ImageCache {
  // Persistent image caching with metadata
  async get(url: string): Promise<HTMLImageElement | null>
  async set(url: string, image: HTMLImageElement): Promise<void>
  async invalidate(url: string): Promise<void>
  async clear(): Promise<void>
  size(): number
}
```

### MediaStorage
```typescript
class MediaStorage {
  // Proper file/blob management
  async store(file: File): Promise<string> // Returns persistent ID
  async retrieve(id: string): Promise<File | null>
  async remove(id: string): Promise<void>
  async list(): Promise<string[]>
}
```

### RenderPipeline
```typescript
class RenderPipeline {
  // Configurable render passes
  constructor(gl: WebGL2RenderingContext)
  addPass(shaderName: string, inputs: string[], output: string): void
  removePass(passId: string): void
  setUniform(passId: string, uniform: string, value: any): void
  render(): void
}
```

### ShaderLibrary
```typescript
class ShaderLibrary {
  // Organized shader management
  register(name: string, vertex: string, fragment: string): void
  getShader(name: string): ShaderInfo | null
  listShaders(): string[]
  loadFromFiles(): Promise<void>
}
```

### Enhanced Store System
```typescript
abstract class Store<T> {
  // Base store class
  subscribe(listener: (value: T) => void): () => void
  update(updater: (value: T) => T): void
  set(value: T): void
}

class PersistedStore<T> extends Store<T> {
  // Enhanced persistence with migrations
  constructor(key: string, initial: T, migrations?: Migration[])
  migrate(fromVersion: number, toVersion: number): T
  export(): T
  import(data: T): void
}
```

## Data Architecture

### Image Item Interface
```typescript
interface ImageItem {
  id: string              // Persistent unique identifier
  url: string             // Persistent URL or data URL
  label: string           // User-friendly name
  metadata: {             // Image metadata
    width: number
    height: number
    format: string
    size: number
  }
  thumbnail?: string      // Thumbnail data URL
  created: Date           // Creation timestamp
  modified: Date          // Last modification
}
```

### Render Pass Configuration
```typescript
interface RenderPassConfig {
  id: string
  shader: string          // Shader name from library
  inputs: string[]        // Input texture names
  output: string          // Output framebuffer name
  uniforms: Record<string, any>
  enabled: boolean
}
```

## Improved Data Flow

### Image Loading Flow (Enhanced)
```
User Action → Drag & Drop → MediaManager.loadImage() →
MediaStorage.store() → Persistent ID → ImageCache.set() →
TextureManager.loadFromCache() → WebGL Texture → RenderPipeline → Canvas Display
```

### State Management Flow (Enhanced)
```
Component State → Store.update() → PersistedStore.migrate() →
localStorage.setItem() → Browser Refresh → PersistedStore.migrate() →
Component Initialization
```

### Rendering Flow (Enhanced)
```
State Change → RenderPipeline.setUniform() → RenderPipeline.render() →
Multi-pass Rendering → Canvas Display
```

## Benefits of Refactored Architecture

### 1. Persistent Media Storage
- **Before**: Temporary blob URLs lost on refresh
- **After**: Persistent storage with metadata and thumbnails
- **Benefit**: Users don't lose their work

### 2. Scalable Texture Management
- **Before**: 2 hardcoded texture slots
- **After**: Dynamic texture management with pooling
- **Benefit**: Support for unlimited simultaneous textures

### 3. Unified Caching Strategy
- **Before**: Fragmented caching (WeakMap + localStorage)
- **After**: Centralized ImageCache with persistence
- **Benefit**: Consistent performance and memory usage

### 4. Better Separation of Concerns
- **Before**: Tightly coupled UI and business logic
- **After**: Clear layers (Core → UI → Utils)
- **Benefit**: Easier testing, maintenance, and feature development

### 5. Enhanced State Management
- **Before**: Basic localStorage wrapper
- **After**: Migration support and data validation
- **Benefit**: Robust state persistence across versions

### 6. Improved Component Design
- **Before**: Monolithic components with mixed responsibilities
- **After**: Focused components with clear APIs
- **Benefit**: Better reusability and maintainability

## Migration Strategy

### Phase 1: Core Infrastructure
1. Create MediaManager, ImageCache, MediaStorage
2. Implement enhanced Store system
3. Create RenderPipeline and ShaderLibrary

### Phase 2: Component Refactoring
1. Refactor WebGLRenderer to use new pipeline
2. Update TextureManager for dynamic allocation
3. Enhance UI components with new APIs

### Phase 3: Data Migration
1. Migrate existing blob URLs to persistent storage
2. Update state management to new system
3. Add data migration utilities

### Phase 4: Testing & Optimization
1. Performance testing with new architecture
2. Memory usage optimization
3. Bundle size analysis and optimization

## Success Metrics

- **Persistent Storage**: 0% image loss on refresh
- **Performance**: Support for 10+ simultaneous textures
- **Memory**: 50% reduction in memory leaks
- **Maintainability**: 60% reduction in coupling
- **Developer Experience**: Clear APIs and separation of concerns
