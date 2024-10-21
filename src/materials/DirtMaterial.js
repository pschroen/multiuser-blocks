import { AdditiveBlending, GLSL3, RawShaderMaterial } from 'three';

import { WorldController } from '../controllers/world/WorldController.js';

import rgbshift from '@alienkitty/alien.js/src/shaders/modules/rgbshift/rgbshift.glsl.js';

const vertexShader = /* glsl */ `
in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
	vUv = uv;

	gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tBloom;
uniform sampler2D tLensDirt;
uniform float uDistortion;
uniform bool uLensDirt;
uniform vec2 uResolution;

in vec2 vUv;

out vec4 FragColor;

${rgbshift}

void main() {
	float center = length(vUv - 0.5);

	FragColor = getRGB(tBloom, vUv, center, 0.001 * uDistortion);

	// Dirt lens texture
	if (uLensDirt) {
		vec2 vUv2 = vUv;

		float aspectRatio2 = 1.0;
		float aspectRatio = uResolution.x / uResolution.y;

		if (aspectRatio2 > aspectRatio) {
			float widthRatio = aspectRatio / aspectRatio2;
			vUv2.x = vUv.x * widthRatio;
			vUv2.x += 0.5 * (1.0 - widthRatio);
			vUv2.y = vUv.y;
		} else {
			float heightRatio = aspectRatio2 / aspectRatio;
			vUv2.x = vUv.x;
			vUv2.y = vUv.y * heightRatio;
			vUv2.y += 0.5 * (1.0 - heightRatio);
		}

		FragColor.rgb += smoothstep(0.0, 0.4, FragColor.rgb) * texture(tLensDirt, vUv2).rgb;
	}
}
`;

export class DirtMaterial extends RawShaderMaterial {
	constructor() {
		const { getTexture, resolution } = WorldController;

		super({
			glslVersion: GLSL3,
			uniforms: {
				tBloom: { value: null },
				tLensDirt: { value: getTexture('assets/textures/lens_dirt.jpg') },
				uDistortion: { value: 1 },
				uLensDirt: { value: true },
				uResolution: resolution
			},
			vertexShader,
			fragmentShader,
			blending: AdditiveBlending,
			depthTest: false,
			depthWrite: false
		});
	}
}
