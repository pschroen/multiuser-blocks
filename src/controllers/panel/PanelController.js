import { PanelItem, Stage, brightness, getKeyByValue } from '@alienkitty/space.js/three';

import { RenderManager } from '../world/RenderManager.js';

export class PanelController {
	static init(ui, renderer, scene, view, display) {
		this.ui = ui;
		this.panel = ui.header.info.panel;
		this.details = ui.details;
		this.renderer = renderer;
		this.scene = scene;
		this.view = view;
		this.display = display;

		this.lastInvert = null;

		this.initPanel();
		this.setInvert(this.scene.background);
	}

	static initPanel() {
		const { luminosityMaterial, bloomCompositeMaterial, compositeMaterial, dirtMaterial } = RenderManager;

		const dirtOptions = {
			Off: false,
			Dirt: true
		};

		const toneMappingOptions = {
			Off: false,
			Tone: true
		};

		const gammaOptions = {
			Off: false,
			Gamma: true
		};

		const matrixFilterOptions = {
			Off: false,
			Matrix: true
		};

		const items = [
			{
				name: 'FPS'
			},
			{
				type: 'divider'
			},
			{
				type: 'color',
				value: this.scene.background,
				callback: value => {
					this.scene.background.copy(value);

					Stage.root.style.setProperty('--bg-color', `#${value.getHexString()}`);

					this.setInvert(value);
				}
			},
			{
				type: 'divider'
			},
			{
				type: 'slider',
				name: 'Chroma',
				min: 0,
				max: 10,
				step: 0.1,
				value: RenderManager.distortion,
				callback: value => {
					compositeMaterial.uniforms.uRGBAmount.value = value;
				}
			},
			{
				type: 'slider',
				name: 'Grain',
				min: 0,
				max: 1,
				step: 0.01,
				value: RenderManager.grainAmount,
				callback: value => {
					compositeMaterial.uniforms.uGrainAmount.value = value;
				}
			},
			{
				type: 'slider',
				name: 'Boost',
				min: 0,
				max: 2,
				step: 0.01,
				value: RenderManager.boost,
				callback: value => {
					compositeMaterial.uniforms.uBoost.value = value;
				}
			},
			{
				type: 'slider',
				name: 'Reduce',
				min: 0,
				max: 2,
				step: 0.01,
				value: RenderManager.reduction,
				callback: value => {
					compositeMaterial.uniforms.uReduction.value = value;
				}
			},
			{
				type: 'divider'
			},
			{
				type: 'list',
				name: 'Tone',
				list: toneMappingOptions,
				value: getKeyByValue(toneMappingOptions, compositeMaterial.uniforms.uToneMapping.value),
				callback: value => {
					compositeMaterial.uniforms.uToneMapping.value = toneMappingOptions[value];
				}
			},
			{
				type: 'slider',
				name: 'Exp',
				min: 0,
				max: 2,
				step: 0.01,
				value: compositeMaterial.uniforms.uExposure.value,
				callback: value => {
					compositeMaterial.uniforms.uExposure.value = value;
				}
			},
			{
				type: 'divider'
			},
			{
				type: 'list',
				name: 'Gamma',
				list: gammaOptions,
				value: getKeyByValue(gammaOptions, compositeMaterial.uniforms.uGamma.value),
				callback: value => {
					compositeMaterial.uniforms.uGamma.value = gammaOptions[value];
				}
			},
			{
				type: 'list',
				list: matrixFilterOptions,
				value: getKeyByValue(matrixFilterOptions, compositeMaterial.uniforms.uMatrixFilter.value),
				callback: value => {
					compositeMaterial.uniforms.uMatrixFilter.value = matrixFilterOptions[value];
				}
			},
			{
				type: 'divider'
			},
			{
				type: 'slider',
				name: 'Thresh',
				min: 0,
				max: 1,
				step: 0.01,
				value: RenderManager.luminosityThreshold,
				callback: value => {
					luminosityMaterial.uniforms.uThreshold.value = value;
				}
			},
			{
				type: 'slider',
				name: 'Smooth',
				min: 0,
				max: 1,
				step: 0.01,
				value: RenderManager.luminositySmoothing,
				callback: value => {
					luminosityMaterial.uniforms.uSmoothing.value = value;
				}
			},
			{
				type: 'slider',
				name: 'Strength',
				min: 0,
				max: 2,
				step: 0.01,
				value: RenderManager.bloomStrength,
				callback: value => {
					RenderManager.bloomStrength = value;
					bloomCompositeMaterial.uniforms.uBloomFactors.value = RenderManager.bloomFactors();
				}
			},
			{
				type: 'slider',
				name: 'Radius',
				min: 0,
				max: 1,
				step: 0.01,
				value: RenderManager.bloomRadius,
				callback: value => {
					RenderManager.bloomRadius = value;
					bloomCompositeMaterial.uniforms.uBloomFactors.value = RenderManager.bloomFactors();
				}
			},
			{
				type: 'slider',
				name: 'Chroma',
				min: 0,
				max: 10,
				step: 0.1,
				value: RenderManager.bloomDistortion,
				callback: value => {
					dirtMaterial.uniforms.uBloomDistortion.value = value;
				}
			},
			{
				type: 'list',
				list: dirtOptions,
				value: getKeyByValue(dirtOptions, dirtMaterial.uniforms.uLensDirt.value),
				callback: value => {
					dirtMaterial.uniforms.uLensDirt.value = dirtOptions[value];
				}
			},
			{
				type: 'spacer'
			}
		];

		items.forEach(data => {
			this.ui.addPanel(new PanelItem(data));
		});
	}

	// Public methods

	static setInvert = value => {
		// Light colour is inverted
		const invert = brightness(value) > 0.6;

		if (invert !== this.lastInvert) {
			this.lastInvert = invert;

			this.ui.invert(invert);
		}
	};
}
