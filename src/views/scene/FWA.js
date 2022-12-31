import { BoxGeometry, Color, Group, Mesh, MeshPhongMaterial, ShaderChunk, Uniform } from 'three';

import { Config } from '../../config/Config.js';
import { Layer } from '../../config/Layer.js';
import { WorldController } from '../../controllers/world/WorldController.js';

import { radians } from '../../utils/Utils.js';

export class FWA extends Group {
  constructor() {
    super();

    // this.position.set(0, 0.2195, -1);
    this.position.set(0, 0.2175, -1);

    this.shapes = [];

    this.initShapes();
  }

  initShapes() {
    const shape1 = new Mesh(new BoxGeometry(0.53, 0.089, 0.25));
    shape1.position.set(-0.704, 0, 0);
    this.add(shape1);
    this.shapes.push(shape1);

    const shape2 = new Mesh(new BoxGeometry(0.089, 0.439, 0.25));
    shape2.position.set(-0.747, 0, 0);
    this.add(shape2);
    this.shapes.push(shape2);

    const shape3 = new Mesh(new BoxGeometry(0.3125, 0.089, 0.25));
    shape3.position.set(-0.56, 0.1755, 0);
    this.add(shape3);
    this.shapes.push(shape3);

    const shape4 = new Mesh(new BoxGeometry(0.439, 0.089, 0.25));
    shape4.position.set(-0.308, 0, 0);
    shape4.rotation.z = radians(-63.5);
    this.add(shape4);
    this.shapes.push(shape4);

    const shape5 = new Mesh(new BoxGeometry(0.439, 0.089, 0.25));
    shape5.position.set(-0.132, 0, 0);
    shape5.rotation.z = radians(63.5);
    this.add(shape5);
    this.shapes.push(shape5);

    const shape6 = new Mesh(new BoxGeometry(0.439, 0.089, 0.25));
    shape6.position.set(0.044, 0, 0);
    shape6.rotation.z = radians(-63.5);
    this.add(shape6);
    this.shapes.push(shape6);

    const shape7 = new Mesh(new BoxGeometry(0.439, 0.089, 0.25));
    shape7.position.set(0.22, 0, 0);
    shape7.rotation.z = radians(63.5);
    this.add(shape7);
    this.shapes.push(shape7);

    const shape8 = new Mesh(new BoxGeometry(0.48, 0.089, 0.25));
    shape8.position.set(0.55, 0.1755, 0);
    this.add(shape8);
    this.shapes.push(shape8);

    const shape9 = new Mesh(new BoxGeometry(0.089, 0.439, 0.25));
    shape9.position.set(0.7465, 0, 0);
    this.add(shape9);
    this.shapes.push(shape9);

    const shape10 = new Mesh(new BoxGeometry(0.36, 0.089, 0.25));
    shape10.position.set(0.531, -0.176, 0);
    this.add(shape10);
    this.shapes.push(shape10);

    const shape11 = new Mesh(new BoxGeometry(0.089, 0.178, 0.25));
    shape11.position.set(0.395, -0.045, 0);
    this.add(shape11);
    this.shapes.push(shape11);

    const shape12 = new Mesh(new BoxGeometry(0.53, 0.089, 0.25));
    shape12.position.set(0.704, 0, 0);
    this.add(shape12);
    this.shapes.push(shape12);

    if (!Config.DEBUG) {
      this.shapes.forEach(shape => {
        shape.geometry.setDrawRange(0, 0); // Avoid rendering geometry
      });
    }
  }

  async initGeometry() {
    const { loadBufferGeometry } = WorldController;

    const geometry = await loadBufferGeometry('assets/geometry/fwa.json');

    this.geometry = geometry;
  }

  async initMaterial() {
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

    this.material = material;
  }

  initMesh() {
    const mesh = new Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.enable(Layer.PICKING);
    this.add(mesh);

    this.mesh = mesh;
  }

  /**
   * Public methods
   */

  ready = async () => {
    await Promise.all([
      this.initGeometry(),
      this.initMaterial()
    ]);

    this.initMesh();
  };
}
