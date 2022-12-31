import { Group, Mesh, NoBlending, PlaneGeometry, RepeatWrapping, ShadowMaterial, Uniform, Vector3 } from 'three';

import { Tests } from '../../config/Tests.js';
import { Reflector } from '../../utils/world/Reflector.js';
import { WorldController } from '../../controllers/world/WorldController.js';

import dither from '../../shaders/modules/dither/dither.glsl.js';

export class Floor extends Group {
  constructor(ball) {
    super();

    this.ball = ball;

    this.position.y = -2.5;

    this.size = new Vector3(100, 5, 100);

    this.initReflector();
  }

  initReflector() {
    const { light } = WorldController;

    this.light = light;

    this.reflector = new Reflector({ blurIterations: Tests.highQuality ? 6 : 0 });
  }

  async initMesh() {
    const { loadTexture } = WorldController;

    const geometry = new PlaneGeometry(this.size.x, this.size.z);

    const map = await loadTexture('assets/textures/waterdudv.jpg');
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set(6, 3);

    const material = new ShadowMaterial({
      blending: NoBlending,
      toneMapped: false,
      transparent: false
    });

    if (Tests.highQuality) {
      material.defines = material.defines || {};
      material.defines.USE_BLUR = '';
    }

    material.onBeforeCompile = shader => {
      map.updateMatrix();

      shader.uniforms.map = new Uniform(map);
      shader.uniforms.reflectMap = new Uniform(this.reflector.renderTarget.texture);
      shader.uniforms.reflectMapBlur = this.reflector.renderTargetUniform;
      shader.uniforms.uvTransform = new Uniform(map.matrix);
      shader.uniforms.textureMatrix = this.reflector.textureMatrixUniform;

      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        /* glsl */`
        uniform mat3 uvTransform;
        uniform mat4 textureMatrix;
        out vec2 vUv;
        out vec4 vCoord;

        void main() {
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        /* glsl */`
        #include <project_vertex>

        vUv = (uvTransform * vec3(uv, 1)).xy;
        vCoord = textureMatrix * vec4(transformed, 1.0);
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        /* glsl */`
        uniform sampler2D map;
        uniform sampler2D reflectMap;

        #ifdef USE_BLUR
          uniform sampler2D reflectMapBlur;
        #endif

        in vec2 vUv;
        in vec4 vCoord;

        ${dither}

        void main() {
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
        /* glsl */`
        vec2 reflectionUv = vCoord.xy / vCoord.w;

        vec4 dudv = texture(map, vUv);
        vec4 color = texture(reflectMap, reflectionUv);

        #ifdef USE_BLUR
          vec4 blur;

          blur = texture(reflectMapBlur, reflectionUv + dudv.rg / 256.0);
          color = mix(color, blur, smoothstep(1.0, 0.1, dudv.g));

          blur = texture(reflectMapBlur, reflectionUv);
          color = mix(color, blur, smoothstep(0.5, 1.0, dudv.r));
        #endif

        gl_FragColor = color * mix(0.3, 0.55, dudv.g);

        #ifndef USE_BLUR
          gl_FragColor.rgb *= 0.6;
        #endif

        gl_FragColor.rgb -= (1.0 - getShadowMask()) * 0.025;

        gl_FragColor.rgb = dither(gl_FragColor.rgb);
        `
      );
    };

    const mesh = new Mesh(geometry, material);
    mesh.position.y = 2.494;
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.add(this.reflector);

    mesh.onBeforeRender = (renderer, scene, camera) => {
      this.visible = false;
      this.light.position.y *= -1;
      this.ball.lights.forEach(light => {
        light.position.y *= -1;
      });
      this.reflector.update(renderer, scene, camera);
      this.light.position.y *= -1;
      this.ball.lights.forEach(light => {
        light.position.y *= -1;
      });
      this.visible = true;
    };

    this.add(mesh);

    this.mesh = mesh;
  }

  /**
   * Public methods
   */

  resize = (width, height, dpr) => {
    if (Tests.highQuality) {
      height = 1024;

      this.reflector.blurIterations = dpr > 1 ? 6 : 4;
    } else {
      width = width / 2;
      height = 640;
    }

    this.reflector.setSize(width, height);
  };

  ready = () => this.initMesh();
}
