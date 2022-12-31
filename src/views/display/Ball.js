import { Color, Group, IcosahedronGeometry, Mesh, MeshPhongMaterial, PointLight, ShaderChunk, Uniform } from 'three';

import { Config } from '../../config/Config.js';

export class Ball extends Group {
  constructor() {
    super();

    this.radius = 0.075;

    this.initMesh();
    this.initLight();
  }

  initMesh() {
    const geometry = new IcosahedronGeometry(this.radius, 3);

    const material = new MeshPhongMaterial({
      color: new Color(Config.LIGHT_COLOR),
      emissive: new Color(Config.LIGHT_COLOR).offsetHSL(0, 0, -0.3),
      emissiveIntensity: 0.4
    });

    // Based on {@link module:three/examples/jsm/shaders/SubsurfaceScatteringShader.js} by daoshengmu

    material.onBeforeCompile = shader => {
      shader.uniforms.thicknessDistortion = new Uniform(0.1);
      shader.uniforms.thicknessAmbient = new Uniform(0);
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
    this.add(mesh);

    this.material = material;
  }

  initLight() {
    const light = new PointLight(Config.LIGHT_COLOR, 0.2);
    this.add(light);

    this.light = light;
  }

  /**
   * Public methods
   */

  setColor = color => {
    this.material.color.copy(color);
    this.material.emissive.copy(color).offsetHSL(0, 0, -0.3);
    this.light.color.copy(color);
  };
}
