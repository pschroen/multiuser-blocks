import { BoxGeometry, Color, Group, Mesh, MeshPhongMaterial, ShaderChunk, Uniform, Vector3 } from 'three';

import { Config } from '../../config/Config.js';
import { Layer } from '../../config/Layer.js';

export class LongBlock extends Group {
  constructor() {
    super();

    this.position.set(0, 0.125, 1);

    this.size = new Vector3(3, 0.25, 0.25);
  }

  async initMesh() {
    const geometry = new BoxGeometry(this.size.x, this.size.y, this.size.z);

    const material = new MeshPhongMaterial({
      color: new Color(Config.LIGHT_COLOR).offsetHSL(0, 0, -0.035),
      emissive: new Color(Config.LIGHT_COLOR).offsetHSL(0, 0, -0.65),
      emissiveIntensity: 0.4
    });

    // Based on {@link module:three/examples/jsm/shaders/SubsurfaceScatteringShader.js} by daoshengmu

    material.onBeforeCompile = shader => {
      shader.uniforms.thicknessDistortion = new Uniform(0);
      shader.uniforms.thicknessAmbient = new Uniform(0);
      shader.uniforms.thicknessAttenuation = new Uniform(1);
      shader.uniforms.thicknessPower = new Uniform(32);
      shader.uniforms.thicknessScale = new Uniform(64);

      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        /* glsl */`
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
        uniform float thicknessPower;
        uniform float thicknessScale;

        void RE_Direct_Scattering(IncidentLight directLight, GeometricContext geometry, inout ReflectedLight reflectedLight) {
          vec3 thickness = vec3(0.05);
          vec3 scatteringHalf = normalize(directLight.direction + (geometry.normal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometry.viewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * thickness;
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }

        void main() {
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_begin>',
        ShaderChunk.lights_fragment_begin.replaceAll(
          'RE_Direct( directLight, geometry, material, reflectedLight );',
          /* glsl */`
          RE_Direct( directLight, geometry, material, reflectedLight );
          RE_Direct_Scattering(directLight, geometry, reflectedLight);
          `
        )
      );
    };

    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.enable(Layer.PICKING);
    this.add(mesh);

    this.mesh = mesh;
  }

  /**
   * Public methods
   */

  ready = () => this.initMesh();
}
