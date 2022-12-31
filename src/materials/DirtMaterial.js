import { AdditiveBlending, GLSL3, RawShaderMaterial, Uniform, Vector2 } from 'three';

import { WorldController } from '../controllers/world/WorldController.js';

import vertexShader from '../shaders/DirtPass.vert.js';
import fragmentShader from '../shaders/DirtPass.frag.js';

export class DirtMaterial extends RawShaderMaterial {
  constructor() {
    const { getTexture } = WorldController;

    super({
      glslVersion: GLSL3,
      uniforms: {
        tBloom: new Uniform(null),
        tLensDirt: new Uniform(getTexture('assets/textures/lens_dirt.jpg')),
        uDistortion: new Uniform(1),
        uLensDirt: new Uniform(1),
        uResolution: new Uniform(new Vector2())
      },
      vertexShader,
      fragmentShader,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
  }
}
