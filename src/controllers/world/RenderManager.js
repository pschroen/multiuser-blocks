import { MathUtils, Mesh, OrthographicCamera, Vector2, WebGLRenderTarget } from 'three';
import { tween } from '@alienkitty/space.js/three';
import { BloomCompositeMaterial, FXAAMaterial, LuminosityMaterial, UnrealBloomBlurMaterial } from '@alienkitty/alien.js/three';

import { WorldController } from './WorldController.js';
import { CompositeMaterial } from '../../materials/CompositeMaterial.js';
import { DirtMaterial } from '../../materials/DirtMaterial.js';

import { isHighQuality } from '../../config/Config.js';

const BlurDirectionX = new Vector2(1, 0);
const BlurDirectionY = new Vector2(0, 1);

export class RenderManager {
	static init(renderer, scene, camera, displayScene, displayCamera) {
		this.renderer = renderer;
		this.scene = scene;
		this.camera = camera;
		this.displayScene = displayScene;
		this.displayCamera = displayCamera;

		// Bloom
		this.luminosityThreshold = 0.1;
		this.luminositySmoothing = 1;
		this.bloomStrength = 0.3;
		this.bloomRadius = 0.75;
		this.bloomDistortion = 1;

		// Final
		this.distortion = 0.2;
		this.boost = 1.1;
		this.reduction = 0.9;
		this.grainAmount = 0.03;

		this.initRenderer();
	}

	static initRenderer() {
		const { screenTriangle, resolution } = WorldController;

		// Manually clear
		this.renderer.autoClear = false;

		// Clear colors
		this.renderer.setClearColor(0x000000, 0);

		// Fullscreen triangle
		this.screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this.screen = new Mesh(screenTriangle);
		this.screen.frustumCulled = false;

		// Render targets
		this.renderTargetA = new WebGLRenderTarget(1, 1, {
			depthBuffer: false
		});

		if (isHighQuality) {
			this.renderTargetB = this.renderTargetA.clone();

			this.renderTargetsHorizontal = [];
			this.renderTargetsVertical = [];
			this.nMips = 5;

			this.renderTargetBright = this.renderTargetA.clone();

			for (let i = 0, l = this.nMips; i < l; i++) {
				this.renderTargetsHorizontal.push(this.renderTargetA.clone());
				this.renderTargetsVertical.push(this.renderTargetA.clone());
			}

			this.renderTargetA.depthBuffer = true;

			// FXAA material
			this.fxaaMaterial = new FXAAMaterial();
			this.fxaaMaterial.uniforms.uResolution = resolution;

			// Luminosity high pass material
			this.luminosityMaterial = new LuminosityMaterial();
			this.luminosityMaterial.uniforms.uThreshold.value = this.luminosityThreshold;
			this.luminosityMaterial.uniforms.uSmoothing.value = this.luminositySmoothing;

			// Separable Gaussian blur materials
			this.blurMaterials = [];

			const kernelSizeArray = [3, 5, 7, 9, 11];

			for (let i = 0, l = this.nMips; i < l; i++) {
				this.blurMaterials.push(new UnrealBloomBlurMaterial(kernelSizeArray[i]));
			}

			// Bloom composite material
			this.bloomCompositeMaterial = new BloomCompositeMaterial();
			this.bloomCompositeMaterial.uniforms.tBlur1.value = this.renderTargetsVertical[0].texture;
			this.bloomCompositeMaterial.uniforms.tBlur2.value = this.renderTargetsVertical[1].texture;
			this.bloomCompositeMaterial.uniforms.tBlur3.value = this.renderTargetsVertical[2].texture;
			this.bloomCompositeMaterial.uniforms.tBlur4.value = this.renderTargetsVertical[3].texture;
			this.bloomCompositeMaterial.uniforms.tBlur5.value = this.renderTargetsVertical[4].texture;
			this.bloomCompositeMaterial.uniforms.uBloomFactors.value = this.bloomFactors();

			// Composite material
			this.compositeMaterial = new CompositeMaterial();
			this.compositeMaterial.uniforms.uDistortion.value = this.distortion;
			this.compositeMaterial.uniforms.uBoost.value = this.boost;
			this.compositeMaterial.uniforms.uReduction.value = this.reduction;
			this.compositeMaterial.uniforms.uGrainAmount.value = this.grainAmount;

			// Dirt material
			this.dirtMaterial = new DirtMaterial();
			this.dirtMaterial.uniforms.uDistortion.value = this.bloomDistortion;
		} else {
			this.renderTargetA.depthBuffer = true;

			// FXAA material
			this.fxaaMaterial = new FXAAMaterial();
			this.fxaaMaterial.uniforms.uResolution = resolution;
		}
	}

	static bloomFactors() {
		const bloomFactors = [1, 0.8, 0.6, 0.4, 0.2];

		for (let i = 0, l = this.nMips; i < l; i++) {
			const factor = bloomFactors[i];
			bloomFactors[i] = this.bloomStrength * MathUtils.lerp(factor, 1.2 - factor, this.bloomRadius);
		}

		return bloomFactors;
	}

	// Public methods

	static resize = (width, height, dpr) => {
		this.renderer.setPixelRatio(dpr);
		this.renderer.setSize(width, height);

		width = Math.round(width * dpr);
		height = Math.round(height * dpr);

		this.renderTargetA.setSize(width, height);

		if (isHighQuality) {
			this.renderTargetB.setSize(width, height);

			width = MathUtils.floorPowerOfTwo(width) / 2;
			height = MathUtils.floorPowerOfTwo(height) / 2;

			this.renderTargetBright.setSize(width, height);

			for (let i = 0, l = this.nMips; i < l; i++) {
				this.renderTargetsHorizontal[i].setSize(width, height);
				this.renderTargetsVertical[i].setSize(width, height);

				this.blurMaterials[i].uniforms.uResolution.value.set(width, height);

				width /= 2;
				height /= 2;
			}
		}
	};

	static update = () => {
		const renderer = this.renderer;
		const scene = this.scene;
		const camera = this.camera;

		const renderTargetA = this.renderTargetA;

		// Scene pass
		renderer.setRenderTarget(renderTargetA);
		renderer.clear();
		renderer.render(scene, camera);

		if (isHighQuality) {
			const renderTargetB = this.renderTargetB;
			const renderTargetBright = this.renderTargetBright;
			const renderTargetsHorizontal = this.renderTargetsHorizontal;
			const renderTargetsVertical = this.renderTargetsVertical;

			// Extract bright areas
			this.luminosityMaterial.uniforms.tMap.value = renderTargetA.texture;
			this.screen.material = this.luminosityMaterial;
			renderer.setRenderTarget(renderTargetBright);
			renderer.clear();
			renderer.render(this.screen, this.screenCamera);

			// Blur all the mips progressively
			let inputRenderTarget = renderTargetBright;

			for (let i = 0, l = this.nMips; i < l; i++) {
				this.screen.material = this.blurMaterials[i];

				this.blurMaterials[i].uniforms.tMap.value = inputRenderTarget.texture;
				this.blurMaterials[i].uniforms.uDirection.value = BlurDirectionX;
				renderer.setRenderTarget(renderTargetsHorizontal[i]);
				renderer.clear();
				renderer.render(this.screen, this.screenCamera);

				this.blurMaterials[i].uniforms.tMap.value = this.renderTargetsHorizontal[i].texture;
				this.blurMaterials[i].uniforms.uDirection.value = BlurDirectionY;
				renderer.setRenderTarget(renderTargetsVertical[i]);
				renderer.clear();
				renderer.render(this.screen, this.screenCamera);

				inputRenderTarget = renderTargetsVertical[i];
			}

			// Composite all the mips
			this.screen.material = this.bloomCompositeMaterial;
			renderer.setRenderTarget(renderTargetsHorizontal[0]);
			renderer.clear();
			renderer.render(this.screen, this.screenCamera);

			// Composite pass
			this.compositeMaterial.uniforms.tScene.value = renderTargetA.texture;
			this.screen.material = this.compositeMaterial;
			renderer.setRenderTarget(renderTargetB);
			renderer.clear();
			renderer.render(this.screen, this.screenCamera);

			// HUD scene
			renderer.render(this.displayScene, this.displayCamera);

			// FXAA pass (render to screen)
			this.fxaaMaterial.uniforms.tMap.value = renderTargetB.texture;
			this.screen.material = this.fxaaMaterial;
			renderer.setRenderTarget(null);
			renderer.clear();
			renderer.render(this.screen, this.screenCamera);

			// Dirt pass (render to screen)
			this.dirtMaterial.uniforms.tBloom.value = renderTargetsHorizontal[0].texture;
			this.screen.material = this.dirtMaterial;
			renderer.render(this.screen, this.screenCamera);
		} else {
			// HUD scene
			renderer.render(this.displayScene, this.displayCamera);

			// FXAA pass (render to screen)
			this.fxaaMaterial.uniforms.tMap.value = renderTargetA.texture;
			this.screen.material = this.fxaaMaterial;
			renderer.setRenderTarget(null);
			renderer.clear();
			renderer.render(this.screen, this.screenCamera);
		}

		// HUD text scene (render to screen)
		// renderer.render(this.displayScene, this.displayCamera);
	};

	static start = () => {
		if (!isHighQuality) {
			return;
		}

		this.compositeMaterial.uniforms.uDistortion.value = 0;
		this.compositeMaterial.uniforms.uBoost.value = 1;
		this.compositeMaterial.uniforms.uReduction.value = 0;
		this.compositeMaterial.uniforms.uGrainAmount.value = 0;
	};

	static animateIn = () => {
		if (!isHighQuality) {
			return;
		}

		tween(this.compositeMaterial.uniforms.uDistortion, { value: this.distortion }, 1000, 'easeOutQuart');
		tween(this.compositeMaterial.uniforms.uBoost, { value: this.boost }, 1000, 'easeOutQuart');
		tween(this.compositeMaterial.uniforms.uReduction, { value: this.reduction }, 1000, 'easeOutQuart');
		tween(this.compositeMaterial.uniforms.uGrainAmount, { value: this.grainAmount }, 1000, 'easeOutQuart');
	};
}