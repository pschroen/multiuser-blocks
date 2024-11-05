import { BoxGeometry, Color, Group, Mesh, MeshPhongMaterial, ShaderChunk, Vector3 } from 'three';

import { layers, lightColor } from '../../config/Config.js';

export class LongBlock extends Group {
	constructor() {
		super();

		this.position.set(0, 0.125, 1);

		this.size = new Vector3(3, 0.25, 0.25);
	}

	async initMesh() {
		const geometry = new BoxGeometry(this.size.x, this.size.y, this.size.z);

		const material = new MeshPhongMaterial({
			color: new Color(lightColor).offsetHSL(0, -0.1, -0.035),
			emissive: new Color(lightColor).offsetHSL(0, -0.1, -0.525),
			emissiveIntensity: 1.2,
			flatShading: true
		});

		// Based on https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/SubsurfaceScatteringShader.js by daoshengmu

		material.onBeforeCompile = shader => {
			shader.uniforms.thicknessDistortion = { value: 0 };
			shader.uniforms.thicknessAmbient = { value: 0 };
			shader.uniforms.thicknessAttenuation = { value: 1 };
			shader.uniforms.thicknessPower = { value: 16 };
			shader.uniforms.thicknessScale = { value: 32 };

			shader.fragmentShader = shader.fragmentShader.replace(
				'void main() {',
				/* glsl */ `
				uniform float thicknessDistortion;
				uniform float thicknessAmbient;
				uniform float thicknessAttenuation;
				uniform float thicknessPower;
				uniform float thicknessScale;

				void RE_Direct_Scattering(IncidentLight directLight, vec3 geometryPosition, vec3 geometryNormal, vec3 geometryViewDir, vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
					vec3 thickness = vec3(0.05);
					vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
					float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
					vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * thickness;
					reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
				}

				void main() {
				`
			);

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <lights_fragment_begin>',
				ShaderChunk.lights_fragment_begin.replaceAll(
					'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
					/* glsl */ `
					RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
					RE_Direct_Scattering(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);
					`
				)
			);
		};

		const mesh = new Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.layers.enable(layers.picking);
		this.add(mesh);

		this.mesh = mesh;
	}

	// Public methods

	ready = () => this.initMesh();
}
