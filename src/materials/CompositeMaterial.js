import { GLSL3, NoBlending, RawShaderMaterial } from 'three';

import { WorldController } from '../controllers/world/WorldController.js';

import rgbshift from '@alienkitty/alien.js/src/shaders/modules/rgbshift/rgbshift.glsl.js';
import random from '@alienkitty/alien.js/src/shaders/modules/random/random.glsl.js';

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

uniform sampler2D tScene;
uniform float uDistortion;
uniform float uBoost;
uniform float uReduction;
uniform float uGrainAmount;
uniform bool uMatrixFilter;
uniform float uTime;

in vec2 vUv;

out vec4 FragColor;

${rgbshift}
${random}

void main() {
  float center = length(vUv - 0.5);

  FragColor = getRGB(tScene, vUv, 0.1, 0.001 * uDistortion);

  // Vignetting
  if (!(uBoost == 1.0 && uReduction == 0.0)) {
    FragColor.rgb *= uBoost - center * uReduction;
  }

  // Film grain
  if (uGrainAmount != 0.0) {
    FragColor.rgb += vec3(uGrainAmount * random(vUv + vec2(uTime, 0.0) * 0.06));
  }

  // Matrix filter
  // https://twitter.com/iquilezles/status/1440847977560494084
  if (uMatrixFilter) {
    FragColor.rgb = pow(FragColor.rgb, vec3(1.5,   // 3/2
                                            0.8,   // 4/5
                                            1.5)); // 3/2
  }
}
`;

export class CompositeMaterial extends RawShaderMaterial {
  constructor() {
    const { time } = WorldController;

    super({
      glslVersion: GLSL3,
      uniforms: {
        tScene: { value: null },
        uDistortion: { value: 0.2 },
        uBoost: { value: 1.1 },
        uReduction: { value: 0.9 },
        uGrainAmount: { value: 0.03 },
        uMatrixFilter: { value: false },
        uTime: time
      },
      vertexShader,
      fragmentShader,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    });
  }
}
