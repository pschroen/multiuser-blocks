import rgbshift from './modules/rgbshift/rgbshift.glsl.js';

export default /* glsl */`
precision highp float;

uniform sampler2D tBloom;
uniform sampler2D tLensDirt;
uniform float uDistortion;
uniform float uLensDirt;
uniform vec2 uResolution;

in vec2 vUv;

out vec4 FragColor;

${rgbshift}

void main() {
  float center = length(vUv - 0.5);

  FragColor = getRGB(tBloom, vUv, center, 0.001 * uDistortion);

  // Dirt lens texture
  if (uLensDirt == 1.0) {
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
