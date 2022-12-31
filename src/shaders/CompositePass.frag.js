import rgbshift from './modules/rgbshift/rgbshift.glsl.js';
import random from './modules/random/random.glsl.js';

export default /* glsl */`
precision highp float;

uniform sampler2D tScene;
uniform float uDistortion;
uniform float uBoost;
uniform float uReduction;
uniform float uGrainAmount;
uniform float uMatrixFilter;
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
  if (uMatrixFilter == 1.0) {
    FragColor.rgb = pow(FragColor.rgb, vec3(1.5,   // 3/2
                                            0.8,   // 4/5
                                            1.5)); // 3/2
  }
}
`;
