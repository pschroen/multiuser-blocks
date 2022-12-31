import { BoxGeometry, Color, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial, RepeatWrapping, ShaderChunk, Uniform, Vector2, Vector3 } from 'three';

import { Layer } from '../../config/Layer.js';
import { WorldController } from '../../controllers/world/WorldController.js';

import { headsTails, random } from '../../utils/Utils.js';

export class InstancedBlock extends Group {
  constructor() {
    super();

    this.size = new Vector3(0.5, 0.5, 0.5);
  }

  async initMesh() {
    const { anisotropy, loadTexture } = WorldController;

    const geometry = new BoxGeometry(this.size.x, this.size.y, this.size.z);

    // 2nd set of UV's for aoMap and lightMap
    geometry.attributes.uv2 = geometry.attributes.uv;

    // Textures
    const [map, normalMap, ormMap, thicknessMap] = await Promise.all([
      // loadTexture('assets/textures/uv.jpg'),
      loadTexture('assets/textures/pbr/pitted_metal_basecolor.jpg'),
      loadTexture('assets/textures/pbr/pitted_metal_normal.jpg'),
      // https://occlusion-roughness-metalness.glitch.me/
      loadTexture('assets/textures/pbr/pitted_metal_orm.jpg'),
      loadTexture('assets/textures/pbr/pitted_metal_height.jpg')
    ]);

    map.anisotropy = anisotropy;
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set(1, 1);

    normalMap.anisotropy = anisotropy;
    normalMap.wrapS = RepeatWrapping;
    normalMap.wrapT = RepeatWrapping;
    normalMap.repeat.set(1, 1);

    ormMap.anisotropy = anisotropy;
    ormMap.wrapS = RepeatWrapping;
    ormMap.wrapT = RepeatWrapping;
    ormMap.repeat.set(1, 1);

    thicknessMap.anisotropy = anisotropy;
    thicknessMap.wrapS = RepeatWrapping;
    thicknessMap.wrapT = RepeatWrapping;
    thicknessMap.repeat.set(1, 1);

    const material = new MeshStandardMaterial({
      color: new Color().offsetHSL(0, 0, -0.65),
      roughness: 2,
      metalness: 0.6,
      map,
      aoMap: ormMap,
      aoMapIntensity: 1,
      roughnessMap: ormMap,
      metalnessMap: ormMap,
      normalMap,
      normalScale: new Vector2(3, 3),
      envMapIntensity: 1
    });

    // Based on {@link module:three/examples/jsm/shaders/SubsurfaceScatteringShader.js} by daoshengmu

    material.onBeforeCompile = shader => {
      shader.uniforms.thicknessMap = new Uniform(thicknessMap);
      shader.uniforms.thicknessDistortion = new Uniform(0);
      shader.uniforms.thicknessAmbient = new Uniform(0);
      shader.uniforms.thicknessAttenuation = new Uniform(1);
      shader.uniforms.thicknessPower = new Uniform(16);
      shader.uniforms.thicknessScale = new Uniform(64);

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        /* glsl */`
        attribute vec2 instanceRandom;
        #include <common>
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */`
        #include <begin_vertex>
        vUv *= instanceRandom;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        /* glsl */`
        uniform sampler2D thicknessMap;
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
        uniform float thicknessPower;
        uniform float thicknessScale;

        void RE_Direct_Scattering(IncidentLight directLight, vec2 uv, GeometricContext geometry, PhysicalMaterial material, inout ReflectedLight reflectedLight) {
          vec3 thickness = directLight.color * texture(thicknessMap, uv).r;
          vec3 scatteringHalf = normalize(directLight.direction + (geometry.normal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometry.viewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * thickness;
          reflectedLight.directDiffuse += material.diffuseColor * directLight.color * scatteringIllu * thicknessAttenuation;
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
          RE_Direct_Scattering(directLight, vUv2, geometry, material, reflectedLight);
          `
        )
      );
    };

    const mesh = new InstancedMesh(geometry, material, 60);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage); // Will be updated every frame
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.enable(Layer.PICKING);
    this.add(mesh);

    const matrix = new Matrix4();
    const instanceRandom = new Float32Array(mesh.count * 2);

    // Big blocks
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 3; j++) {
        const index = (j * 10) + i;

        matrix.setPosition(-2.25 + (0.5 * i), 2.25 + (0.5 * j), 0);
        mesh.setMatrixAt(index, matrix);

        instanceRandom.set([random(0.5, 1, 2) * headsTails(1, -1), random(0.5, 1, 2) * headsTails(1, -1)], index * 2);
      }
    }

    // Small blocks
    matrix.makeScale(0.5, 0.5, 0.5);

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 3; j++) {
        const index = 30 + (j * 10) + i;

        matrix.setPosition(-1.125 + (0.25 * i), 3.75 + (0.25 * j), 0);
        mesh.setMatrixAt(index, matrix);

        instanceRandom.set([random(0.5, 1, 2) * headsTails(1, -1), random(0.5, 1, 2) * headsTails(1, -1)], index * 2);
      }
    }

    geometry.setAttribute('instanceRandom', new InstancedBufferAttribute(instanceRandom, 2));

    this.mesh = mesh;
  }

  /**
   * Public methods
   */

  ready = () => this.initMesh();
}
