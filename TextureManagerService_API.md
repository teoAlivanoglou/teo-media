# TextureManagerService API Documentation

## Overview
A comprehensive service for managing WebGL textures and image state with persistence, validation, and reactive updates.

## Core Interfaces

### ImageDefinition
```typescript
interface ImageDefinition {
    id: string;           // Unique identifier (UUID)
    url: string;          // Blob URL for WebGL texture
    label: string;        // Display name/filename
    source?: 'preloaded' | 'uploaded'; // Image origin type
}
```

### ImageState
```typescript
interface ImageState {
    all: ImageDefinition[];        // All images combined
    preloaded: ImageDefinition[];  // Preloaded/demo images
    uploaded: ImageDefinition[];   // User-uploaded images
}
```

### ValidationResult
```typescript
interface ValidationResult {
    valid: boolean;       // Whether file is acceptable
    error?: string;       // Error message if invalid
}
```

## Public Methods

### Texture Manager Lifecycle

#### `getTextureManager(): Promise<TextureManager>`
- **Purpose**: Get or create the underlying WebGL texture manager
- **Returns**: Promise resolving to TextureManager instance
- **Usage**: `const tm = await textureManagerService.getTextureManager()`

#### `getTextureManagerIfExists(): TextureManager | null`
- **Purpose**: Get existing texture manager without creating new one
- **Returns**: TextureManager instance or null if not initialized
- **Usage**: `const tm = textureManagerService.getTextureManagerIfExists()`

### Image Preloading

#### `preloadImageList(images: ImageDefinition[]): Promise<void>`
- **Purpose**: Preload initial/demo images for the application
- **Parameters**:
  - `images`: Array of ImageDefinition objects to preload
- **Returns**: Promise that resolves when preloading completes
- **Usage**: `await textureManagerService.preloadImageList(imageList)`

### Image Access

#### `getImageDefinition(id: string): ImageDefinition | null`
- **Purpose**: Retrieve a specific image by its ID
- **Parameters**:
  - `id`: Unique string identifier of the image
- **Returns**: ImageDefinition object or null if not found
- **Usage**: `const img = textureManagerService.getImageDefinition('img-123')`

#### `getAllImageDefinitions(): ImageDefinition[]`
- **Purpose**: Get all available images (preloaded + uploaded)
- **Returns**: Array of all ImageDefinition objects
- **Usage**: `const allImages = textureManagerService.getAllImageDefinitions()`

### Image Management

#### `addUploadedImages(files: FileList | File[]): Promise<ImageDefinition[]>`
- **Purpose**: Add user-uploaded images with persistence
- **Parameters**:
  - `files`: FileList or File array from file input/drag-drop
- **Returns**: Promise resolving to array of created ImageDefinition objects
- **Features**:
  - Automatic validation (file type, size)
  - IndexedDB persistence for file data
  - localStorage metadata storage
  - Blob URL generation for WebGL
- **Usage**: `const newImages = await textureManagerService.addUploadedImages(fileList)`

#### `removeImage(id: string): Promise<boolean>`
- **Purpose**: Remove any image (preloaded or uploaded) by ID
- **Parameters**:
  - `id`: Unique string identifier of image to remove
- **Returns**: Promise resolving to true if removed, false if not found
- **Features**:
  - Removes from both arrays (preloaded/uploaded)
  - Cleans up IndexedDB file data
  - Revokes blob URLs to free memory
  - Updates localStorage metadata
- **Usage**: `const removed = await textureManagerService.removeImage('img-123')`

#### `reorderImages(newOrder: ImageDefinition[]): void`
- **Purpose**: Update service state to match user's preferred image ordering
- **Parameters**:
  - `newOrder`: Array of ImageDefinition in desired order
- **Returns**: void (synchronous)
- **Features**:
  - Updates internal state to match user preference
  - Preserves user's arrangement across sessions
  - Triggers reactive updates for UI components
- **Usage**: `textureManagerService.reorderImages(userOrderedImages)`

### Image Validation

#### `validateImageFile(file: File): ValidationResult`
- **Purpose**: Validate uploaded image files before processing
- **Parameters**:
  - `file`: File object to validate
- **Returns**: ValidationResult with validity and error message
- **Validation Rules**:
  - File type must be image/* (image/jpeg, image/png, etc.)
  - File size must be ≤ 10MB
- **Usage**: `const result = textureManagerService.validateImageFile(file)`

### State Management

#### `getImageState(): ImageState`
- **Purpose**: Get complete current state of all images
- **Returns**: ImageState object with all/preloaded/uploaded arrays
- **Usage**: `const state = textureManagerService.getImageState()`

#### `subscribe(callback: (state: ImageState) => void): () => void`
- **Purpose**: Subscribe to reactive state changes
- **Parameters**:
  - `callback`: Function called when state changes
- **Returns**: Unsubscribe function
- **Usage**:
```typescript
const unsubscribe = textureManagerService.subscribe((state) => {
    console.log('Images updated:', state.all.length);
});
// Later: unsubscribe()
```

#### `clearUploadedImages(): Promise<void>`
- **Purpose**: Remove all user-uploaded images and associated data
- **Returns**: Promise that resolves when cleanup completes
- **Features**:
  - Removes all uploaded images from memory
  - Clears IndexedDB file data
  - Updates localStorage metadata
  - Triggers reactive state updates
- **Usage**: `await textureManagerService.clearUploadedImages()`

### Texture Operations

#### `getTextureById(id: string): Promise<{texture: WebGLTexture, slot: number} | null>`
- **Purpose**: Get WebGL texture information for a specific image
- **Parameters**:
  - `id`: Unique string identifier of the image
- **Returns**: Promise resolving to texture info or null if not found
- **Usage**: `const textureInfo = await textureManagerService.getTextureById('img-123')`

### Lifecycle Management

#### `cleanup(): Promise<void>`
- **Purpose**: Complete cleanup of all resources
- **Returns**: Promise that resolves when cleanup completes
- **Features**:
  - Cleans up WebGL texture manager
  - Revokes all blob URLs to free memory
  - Clears IndexedDB file storage
  - Resets all internal state
- **Usage**: `await textureManagerService.cleanup()`

## Private Fields

- `textureManager: TextureManager | null` - WebGL texture manager instance
- `preloadedImages: ImageDefinition[]` - Array of preloaded/demo images
- `uploadedImages: ImageDefinition[]` - Array of user-uploaded images
- `imageStateCallbacks: ((state: ImageState) => void)[]` - Reactive state subscribers
- `STORAGE_KEY = 'teo-media-uploaded-images'` - localStorage key for metadata

## Usage Examples

### Basic Setup
```typescript
import { textureManagerService } from '$lib/core/services';

// Subscribe to state changes
const unsubscribe = textureManagerService.subscribe((state) => {
    console.log(`Total images: ${state.all.length}`);
    console.log(`Uploaded: ${state.uploaded.length}`);
});
```

### Adding Images
```typescript
// Handle file input
function handleFileUpload(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
        textureManagerService.addUploadedImages(files).then((newImages) => {
            console.log(`Added ${newImages.length} images`);
        });
    }
}
```

### Image Management
```typescript
// Remove an image
await textureManagerService.removeImage('image-id-123');

// Reorder images
const currentImages = textureManagerService.getAllImageDefinitions();
// Rearrange as needed
textureManagerService.reorderImages(rearrangedImages);
```

### Validation
```typescript
// Validate before upload
const file = files[0];
const validation = textureManagerService.validateImageFile(file);

if (validation.valid) {
    // Proceed with upload
} else {
    console.error('Invalid file:', validation.error);
}
```

## Dependencies

- **ServiceContainer** - WebGL context management
- **TextureManager** - WebGL texture operations
- **IndexedDBStorageService** - File persistence
- **File API** - Browser file handling
- **WebGL API** - Graphics context

## Error Handling

The service includes comprehensive error handling for:
- File reading/writing operations
- IndexedDB transactions
- WebGL context issues
- localStorage access problems
- Invalid file formats/sizes

All errors are logged to console with descriptive messages for debugging.
