# Teo-Media Project - Current Architecture

## Overview
A SvelteKit-based media processing application with custom WebGL2 rendering system for real-time image manipulation.

## Technology Stack
- **Frontend**: SvelteKit + TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Graphics**: Custom WebGL2 rendering system
- **State**: localStorage-based persistence
- **Build**: Vite

## Core Systems Architecture

### 1. WebGL Rendering System
```
src/lib/webgl/
├── webgl-renderer.ts      # Main renderer - orchestrates render passes
├── texture-manager.ts     # Texture loading & management (2 slots only)
├── render-pass.ts         # Individual rendering passes
├── fbo.ts                 # Frame buffer objects for off-screen rendering
├── uniform-manager.ts     # Shader uniform management
├── shader-utils.ts        # Shader compilation utilities
└── shaders/               # GLSL shader files
    ├── basic-vertex.glsl
    ├── sample-fragment.glsl
    ├── mix-simple-fragment.glsl
    └── [other fragment shaders]
```

**WebGLRenderer API:**
- `constructor(canvas: HTMLCanvasElement)` - Initialize with canvas
- `async init(): Promise<void>` - Setup WebGL context and resources
- `setMixValue(value: number): void` - Update mix ratio uniform
- `async updateTexture(index: number, url: string): Promise<void>` - Load texture at index
- `requestRender(): void` - Trigger re-render
- `destroy(): void` - Cleanup resources

**TextureManager API:**
- `constructor(gl: WebGL2RenderingContext)` - Initialize with WebGL context
- `async loadFromImage(img: HTMLImageElement): Promise<number>` - Load from HTML image
- `async loadFromUrl(index: number, url: string): Promise<void>` - Load from URL at index
- `createPlaceholder(index: number, width, height, color): void` - Create solid color texture
- `getTexture(index: number): WebGLTexture | null` - Get texture by index

### 2. State Management System
```
src/lib/stores/
├── persisted.ts           # Generic localStorage wrapper
└── ui.ts                  # UI state (header, theme, dark mode)
```

**Persisted Store API:**
- `persisted<T>(key: string, initial: T): Writable<T>` - Create persisted store

**UI Store API:**
- `headerOpen: Writable<boolean>` - Header visibility state
- `darkMode: Writable<boolean>` - Dark mode toggle
- `selectedTheme: Writable<string>` - Current theme

### 3. UI Component System
```
src/lib/controls/
├── ImageListContainer.svelte    # Image list with drag-drop
├── ReorderOverlay.svelte        # Complex drag reordering system
├── ListImage.svelte             # Individual image item
├── ListPlaceholder.svelte       # Upload placeholder
├── Slider.svelte                # Range slider control
├── DropZone.svelte              # File drop zone
└── ThemePicker.svelte           # Theme selection
```

**ImageListContainer API:**
- `images?: ImageItem[]` - Array of image items
- `children?: any` - Child content slot

**ReorderOverlay API:**
- `open: boolean` - Overlay visibility
- `items: ImageItem[]` - Items to reorder
- `anchor?: {left, top, width}` - Position anchor
- `initialDragIndex?: number` - Starting drag position
- `onCommit?: (items: ImageItem[]) => void` - Reorder callback
- `onCancel?: () => void` - Cancel callback

### 4. Main Application Structure
```
src/routes/apps/image-fixr/
└── +page.svelte           # Main image processing interface
```

**Image Processing App Features:**
- Background/foreground image mixing
- Real-time WebGL processing
- Drag-and-drop image loading
- Mix ratio slider control
- Image list management with reordering

## Data Flow Architecture

### Image Loading Flow
```
User Action → Drag & Drop → ImageListContainer → Blob URL Creation →
TextureManager.loadFromUrl() → WebGL Texture → RenderPass → Canvas Display
```

### State Persistence Flow
```
Component State → Store Subscription → localStorage.setItem() →
Browser Refresh → localStorage.getItem() → Store Initialization
```

### Rendering Flow
```
State Change → requestRender() → requestAnimationFrame() →
RenderPass.draw() → FBO Rendering → Canvas Display
```

## Current Limitations

### 1. Image Storage Issues
- **Problem**: Uses temporary blob URLs (`URL.createObjectURL()`)
- **Impact**: Images lost on page refresh
- **Current Workaround**: None - requires re-upload

### 2. Texture Management Limitations
- **Problem**: Only 2 hardcoded texture slots
- **Impact**: Cannot process more than 2 images simultaneously
- **Current Workaround**: Manual slot management

### 3. Caching Fragmentation
- **Problem**: Multiple caching mechanisms (WeakMap in TextureManager, localStorage in stores)
- **Impact**: Inconsistent caching strategies
- **Current Workaround**: No unified caching system

### 4. Component Coupling
- **Problem**: Tightly coupled UI and business logic
- **Impact**: Difficult to test and reuse components
- **Current Workaround**: Limited component reusability

## Performance Characteristics

### Memory Usage
- WebGL textures stored in GPU memory
- Blob URLs consume RAM until revoked
- localStorage limited by browser quotas

### Rendering Performance
- Multi-pass rendering with FBOs
- Texture loading is asynchronous
- Render loop uses requestAnimationFrame

### Bundle Size
- SvelteKit code-splitting
- WebGL shader compilation at runtime
- DaisyUI component library included
