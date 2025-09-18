export class GPUCanvasRenderer {
	private device!: GPUDevice;
	private context!: GPUCanvasContext;
	private pipeline!: GPURenderPipeline;
	private uniformBuffer!: GPUBuffer;
	private sampler!: GPUSampler;
	private textures: GPUTexture[] = [];
	private bindGroup!: GPUBindGroup;
	private mixRatio: number = 0.5;
	private canvas: HTMLCanvasElement;
	private initialized: boolean = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	async init(): Promise<void> {
		// Get adapter and device
		const adapter = await navigator.gpu?.requestAdapter();
		if (!adapter) throw new Error('WebGPU not supported');

		this.device = await adapter.requestDevice();

		// Configure canvas context
		this.context = this.canvas.getContext('webgpu')!;
		const format = navigator.gpu.getPreferredCanvasFormat();

		this.context.configure({
			device: this.device,
			format,
			alphaMode: 'premultiplied'
		});

		// Create shader module
		const shaderModule = this.device.createShaderModule({
			label: 'Image Mixer Shader',
			code: `
                struct Uniforms {
                    mixRatio: f32,
                }
                @group(0) @binding(0) var<uniform> uniforms: Uniforms;
                @group(0) @binding(1) var mySampler: sampler;
                @group(0) @binding(2) var texture1: texture_2d<f32>;
                @group(0) @binding(3) var texture2: texture_2d<f32>;
                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
                    var pos = array<vec2f, 6>(
                        vec2f(-1.0, -1.0),
                        vec2f( 1.0, -1.0),
                        vec2f(-1.0,  1.0),
                        vec2f(-1.0,  1.0),
                        vec2f( 1.0, -1.0),
                        vec2f( 1.0,  1.0)
                    );
                    
                    return vec4f(pos[vertexIndex], 0.0, 1.0);
                }
                @fragment
                fn fragmentMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
                    let dims = vec2f(1920.0, 1080.0);
                    let uv = fragCoord.xy / dims;
                    let color1 = textureSample(texture1, mySampler, uv);
                    let color2 = textureSample(texture2, mySampler, uv);
                    return mix(color1, color2, uniforms.mixRatio);
                }
            `
		});

		// Create uniform buffer
		this.uniformBuffer = this.device.createBuffer({
			label: 'Mix Ratio Uniform',
			size: 4, // one f32
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});

		// Initialize uniform
		this.updateUniforms(this.mixRatio);

		// Create sampler
		this.sampler = this.device.createSampler({
			magFilter: 'linear',
			minFilter: 'linear'
		});

		// Create placeholder textures
		await this.createPlaceholderTextures();

		// Create bind group layout
		const bindGroupLayout = this.device.createBindGroupLayout({
			entries: [
				{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
				{ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
				{ binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
				{ binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: {} }
			]
		});

		// Create pipeline
		this.pipeline = this.device.createRenderPipeline({
			label: 'Image Mixer Pipeline',
			layout: this.device.createPipelineLayout({
				bindGroupLayouts: [bindGroupLayout]
			}),
			vertex: {
				module: shaderModule,
				entryPoint: 'vertexMain'
			},
			fragment: {
				module: shaderModule,
				entryPoint: 'fragmentMain',
				targets: [
					{
						format: navigator.gpu.getPreferredCanvasFormat()
					}
				]
			},
			primitive: {
				topology: 'triangle-list'
			}
		});

		// Create bind group
		this.createBindGroup();

		// Mark as initialized
		this.initialized = true;

		// Start render loop
		this.render();
	}

	private async createPlaceholderTextures(): Promise<void> {
		// Create two placeholder textures
		for (let i = 0; i < 2; i++) {
			const texture = this.device.createTexture({
				size: [800, 600, 1],
				format: 'rgba8unorm',
				usage:
					GPUTextureUsage.TEXTURE_BINDING |
					GPUTextureUsage.COPY_DST |
					GPUTextureUsage.RENDER_ATTACHMENT
			});

			// Fill with color
			const color = i === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255];
			const data = new Uint8Array(800 * 600 * 4);
			for (let j = 0; j < data.length; j += 4) {
				data[j] = color[0];
				data[j + 1] = color[1];
				data[j + 2] = color[2];
				data[j + 3] = color[3];
			}

			this.device.queue.writeTexture(
				{ texture },
				data,
				{ bytesPerRow: 800 * 4, rowsPerImage: 600 },
				{ width: 800, height: 600 }
			);

			this.textures.push(texture);
		}
	}

	private createBindGroup(): void {
		this.bindGroup = this.device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.uniformBuffer } },
				{ binding: 1, resource: this.sampler },
				{ binding: 2, resource: this.textures[0].createView() },
				{ binding: 3, resource: this.textures[1].createView() }
			]
		});
	}

	private updateUniforms(mixRatio: number): void {
		if (!this.device || !this.uniformBuffer) return;

		const uniformData = new Float32Array([mixRatio]);
		this.device.queue.writeBuffer(
			this.uniformBuffer,
			0,
			uniformData.buffer,
			uniformData.byteOffset,
			uniformData.byteLength
		);
	}

	async updateTexture(index: number, url: string): Promise<void> {
		if (!this.initialized || index < 0 || index > 1) return;

		// Load image
		const img = new Image();
		img.crossOrigin = 'anonymous';

		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = reject;
			img.src = url;
		});

		const bitmap = await createImageBitmap(img);

		// Destroy old texture
		if (this.textures[index]) {
			this.textures[index].destroy();
		}

		// Create new texture
		this.textures[index] = this.device.createTexture({
			size: [bitmap.width, bitmap.height, 1],
			format: 'rgba8unorm',
			usage:
				GPUTextureUsage.TEXTURE_BINDING |
				GPUTextureUsage.COPY_DST |
				GPUTextureUsage.RENDER_ATTACHMENT
		});

		// Copy image to texture
		this.device.queue.copyExternalImageToTexture(
			{ source: bitmap },
			{ texture: this.textures[index] },
			[bitmap.width, bitmap.height]
		);

		// Recreate bind group with new texture
		this.createBindGroup();
	}

	setMixValue(value: number): void {
		if (!this.initialized) return;

		this.mixRatio = Math.max(0, Math.min(1, value));
		this.updateUniforms(this.mixRatio);
	}

	private render = (): void => {
		if (!this.initialized) {
			requestAnimationFrame(this.render);
			return;
		}

		const encoder = this.device.createCommandEncoder();
		const textureView = this.context.getCurrentTexture().createView();

		const renderPass = encoder.beginRenderPass({
			colorAttachments: [
				{
					view: textureView,
					loadOp: 'clear',
					clearValue: { r: 0, g: 0, b: 0, a: 1 },
					storeOp: 'store'
				}
			]
		});

		renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(0, this.bindGroup);
		renderPass.draw(6);
		renderPass.end();

		this.device.queue.submit([encoder.finish()]);
		requestAnimationFrame(this.render);
	};

	destroy(): void {
		this.initialized = false;
		// Clean up resources if needed
	}
}
