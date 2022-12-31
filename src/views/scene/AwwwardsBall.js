import { Color, Group, IcosahedronGeometry, Mesh, MeshPhongMaterial, PointLight, ShaderChunk, Uniform } from 'three';

import { Config } from '../../config/Config.js';
import { Layer } from '../../config/Layer.js';

export class AwwwardsBall extends Group {
  constructor() {
    super();

    // this.position.set(0.208, 0.085, 1.125);
    this.position.set(0.208, 0.083, 1.125);

    this.radius = 0.085;

    this.initLight();
  }

  initLight() {
    const light = new PointLight(Config.LIGHT_COLOR, 0.135);
    this.add(light);
  }

  async initMesh() {
    const geometry = new IcosahedronGeometry(this.radius, 3);

    const material = new MeshPhongMaterial({
      color: new Color(Config.LIGHT_COLOR).offsetHSL(0, 0, -0.65),
      emissive: new Color(Config.LIGHT_COLOR),
      emissiveIntensity: 0.32
    });

    // Based on {@link module:three/examples/jsm/shaders/SubsurfaceScatteringShader.js} by daoshengmu

    material.onBeforeCompile = shader => {
      shader.uniforms.thicknessDistortion = new Uniform(0.1);
      shader.uniforms.thicknessAmbient = new Uniform(0.2);
      shader.uniforms.thicknessAttenuation = new Uniform(0.8);
      shader.uniforms.thicknessPower = new Uniform(2);
      shader.uniforms.thicknessScale = new Uniform(16);

      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        /* glsl */`
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
        uniform float thicknessPower;
        uniform float thicknessScale;

        void RE_Direct_Scattering(IncidentLight directLight, GeometricContext geometry, inout ReflectedLight reflectedLight) {
          vec3 thickness = directLight.color * 0.8;
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
        // ShaderChunk.lights_fragment_begin.replaceAll(
        ShaderChunk.lights_fragment_begin.replace(
          'RE_Direct( directLight, geometry, material, reflectedLight );',
          /* glsl */`
          // RE_Direct( directLight, geometry, material, reflectedLight );
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
