import { Color, Group, IcosahedronGeometry, Mesh, MeshPhongMaterial, PointLight, ShaderChunk } from 'three';

import { layers, lightColor } from '../../config/Config.js';

export class AwwwardsBall extends Group {
	constructor() {
		super();

		// this.position.set(0.208, 0.085, 1.125);
		this.position.set(0.208, 0.083, 1.125);

		// Physics
		this.radius = 0.085;

		this.initLight();
	}

	initLight() {
		const light = new PointLight(lightColor, 1, 1, 0);
		this.add(light);
	}

	async initMesh() {
		const geometry = new IcosahedronGeometry(this.radius, 3);

		const material = new MeshPhongMaterial({
			color: new Color(lightColor).offsetHSL(0, -0.1, -0.5),
			emissive: new Color(lightColor).offsetHSL(0, -0.1, 0),
			emissiveIntensity: 0.4
		});

		// Based on https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/SubsurfaceScatteringShader.js by daoshengmu

		material.onBeforeCompile = shader => {
			shader.uniforms.thicknessDistortion = { value: 0.1 };
			shader.uniforms.thicknessAmbient = { value: 0 };
			shader.uniforms.thicknessAttenuation = { value: 0.3 };
			shader.uniforms.thicknessPower = { value: 2 };
			shader.uniforms.thicknessScale = { value: 16 };

			shader.fragmentShader = shader.fragmentShader.replace(
				'void main() {',
				/* glsl */ `
				uniform float thicknessDistortion;
				uniform float thicknessAmbient;
				uniform float thicknessAttenuation;
				uniform float thicknessPower;
				uniform float thicknessScale;

				void RE_Direct_Scattering(IncidentLight directLight, vec3 geometryPosition, vec3 geometryNormal, vec3 geometryViewDir, vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
					vec3 thickness = directLight.color * 0.8;
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
				// ShaderChunk.lights_fragment_begin.replaceAll(
				ShaderChunk.lights_fragment_begin.replace(
					'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
					/* glsl */ `
					// RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
					RE_Direct_Scattering(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);
					`
				)
			);
		};

		const mesh = new Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.layers.enable(layers.buffers);
		mesh.layers.enable(layers.picking);
		this.add(mesh);

		this.mesh = mesh;
	}

	// Public methods

	ready = () => this.initMesh();
}
