import { Color, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshPhongMaterial, PointLight, ShaderChunk, Uniform } from 'three';

import { Config } from '../../config/Config.js';
import { Global } from '../../config/Global.js';

export class InstancedBall extends Group {
  constructor() {
    super();

    this.radius = 0.075;
    this.intensity = 0.2;
    this.color = new Color(Config.LIGHT_COLOR);
    this.lights = [];
  }

  async initMesh() {
    const color = this.color;

    const geometry = new IcosahedronGeometry(this.radius, 3);

    const material = new MeshPhongMaterial({
      color: new Color().offsetHSL(0, 0, -0.65)
    });

    // Based on {@link module:three/examples/jsm/shaders/SubsurfaceScatteringShader.js} by daoshengmu

    material.onBeforeCompile = shader => {
      shader.uniforms.thicknessDistortion = new Uniform(0.1);
      shader.uniforms.thicknessAmbient = new Uniform(0);
      shader.uniforms.thicknessAttenuation = new Uniform(0.8);
      shader.uniforms.thicknessPower = new Uniform(2);
      shader.uniforms.thicknessScale = new Uniform(16);

      // https://github.com/mrdoob/three.js/pull/22147/files

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        /* glsl */`
        attribute float instanceVisibility;
        varying float vInstanceVisibility;
        varying vec3 vLightPosition;
        #include <common>
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */`
        #include <begin_vertex>
        vInstanceVisibility = instanceVisibility;
        vLightPosition = instanceMatrix[3].xyz;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        /* glsl */`
        varying float vInstanceVisibility;
        varying vec3 vLightPosition;
        #include <common>
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        /* glsl */`
        if (vInstanceVisibility == 0.0) discard;
        vec4 diffuseColor = vec4( diffuse, opacity );
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        /* glsl */`
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
        uniform float thicknessPower;
        uniform float thicknessScale;

        void getPointLightInfo(GeometricContext geometry, out IncidentLight light) {
          vec3 lVector = (viewMatrix * vec4(vLightPosition, 1.0)).xyz - geometry.position;
          light.direction = normalize(lVector);
          float lightDistance = length(lVector);
          light.color = vColor * ${(this.intensity * Math.PI).toFixed(2)};
          light.color *= getDistanceAttenuation(lightDistance, 0.0, 0.0);
          light.visible = (light.color != vec3(0.0));
        }

        void RE_Direct_Scattering(IncidentLight directLight, GeometricContext geometry, inout ReflectedLight reflectedLight) {
          vec3 thickness = directLight.color * vInstanceVisibility;
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
          // RE_Direct( directLight, geometry, material, reflectedLight );
          // RE_Direct_Scattering(directLight, geometry, reflectedLight);
          `
        )
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 totalEmissiveRadiance = emissive;',
        /* glsl */`
        vec3 totalEmissiveRadiance = vColor * 0.32; // 0.8 * 0.4
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;',
        /* glsl */`
        IncidentLight incidentLight;
        getPointLightInfo(geometry, incidentLight);
        RE_Direct_Scattering(incidentLight, geometry, reflectedLight);

        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
        `
      );
    };

    const mesh = new InstancedMesh(geometry, material, Global.NUM_POINTERS);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage); // Will be updated every frame
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);

    const matrix = new Matrix4();
    const instanceVisibilities = [];

    for (let i = 0; i < mesh.count; i++) {
      matrix.setPosition(0, 0, 0);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color);

      instanceVisibilities.push(0);

      // Not used by the ball shader itself but for lighting the blocks
      const light = new PointLight(Config.LIGHT_COLOR, this.intensity);
      light.visible = false;
      this.add(light);

      this.lights.push(light);
    }

    geometry.setAttribute('instanceVisibility', new InstancedBufferAttribute(new Float32Array(instanceVisibilities), 1));

    mesh.geometry.attributes.instanceVisibility.setUsage(DynamicDrawUsage);

    this.mesh = mesh;
  }

  /**
   * Public methods
   */

  ready = () => this.initMesh();
}
