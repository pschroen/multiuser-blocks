import { GLSL3, NoBlending, RawShaderMaterial, Uniform } from 'three';

import vertexShader from '../shaders/CompositePass.vert.js';
import fragmentShader from '../shaders/CompositePass.frag.js';

export class CompositeMaterial extends RawShaderMaterial {
  constructor() {
    super({
      glslVersion: GLSL3,
      uniforms: {
        tScene: new Uniform(null),
        uDistortion: new Uniform(0.2),
        uBoost: new Uniform(1.1),
        uReduction: new Uniform(0.9),
        uGrainAmount: new Uniform(0.03),
        uMatrixFilter: new Uniform(0),
        uTime: new Uniform(0)
      },
      vertexShader,
      fragmentShader,
      blending: NoBlending,
      depthWrite: false,
      depthTest: false
    });
  }
}
