import { ACESFilmicToneMapping, AmbientLight, BasicShadowMap, Color, DirectionalLight, HemisphereLight, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Scene, Uniform, Vector2, WebGLRenderer } from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { Config } from '../../config/Config.js';
import { TextureLoader } from '../../loaders/world/TextureLoader.js';
import { EnvironmentTextureLoader } from '../../loaders/world/EnvironmentTextureLoader.js';
import { BufferGeometryLoader } from '../../loaders/world/BufferGeometryLoader.js';
import { Stage } from '../Stage.js';

import { getFullscreenTriangle } from '../../utils/world/Utils3D.js';

export class WorldController {
  static init() {
    this.initWorld();
    this.initLights();
    this.initLoaders();
    this.initEnvironment();
    this.initControls();

    this.addListeners();
  }

  static initWorld() {
    this.renderer = new WebGLRenderer({
      powerPreference: 'high-performance',
      stencil: false
    });
    this.element = this.renderer.domElement;

    // Clear color
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 0);

    // Shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = BasicShadowMap;

    // Tone mapping
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    // 3D scene
    this.scene = new Scene();
    this.scene.background = new Color(Stage.rootStyle.getPropertyValue('--main-bg-color').trim());
    this.camera = new PerspectiveCamera(30);
    this.camera.near = 0.5;
    this.camera.far = 40;
    this.camera.position.set(0, 6, 8);
    this.camera.lookAt(this.scene.position);

    // HUD scene
    this.displayScene = new Scene();
    this.displayCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.displayQuad = new PlaneGeometry(1, 1);
    this.displayQuad.translate(0.5, -0.5, 0);

    // Global geometries
    this.quad = new PlaneGeometry(1, 1);
    this.screenTriangle = getFullscreenTriangle();

    // Global uniforms
    this.resolution = new Uniform(new Vector2());
    this.aspect = new Uniform(1);
    this.time = new Uniform(0);
    this.frame = new Uniform(0);

    // Global settings
    this.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
  }

  static initLights() {
    this.scene.add(new AmbientLight(0xffffff, 0.2));

    this.scene.add(new HemisphereLight(0x606060, 0x404040));

    const light = new DirectionalLight(0xffffff, 0.4);
    light.position.set(5, 5, 5);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    this.scene.add(light);

    this.light = light;
  }

  static initLoaders() {
    this.textureLoader = new TextureLoader().setOptions({ preserveData: true });
    this.environmentLoader = new EnvironmentTextureLoader(this.renderer);
    this.bufferGeometryLoader = new BufferGeometryLoader();
  }

  static async initEnvironment() {
    this.scene.environment = await this.loadEnvironmentTexture('assets/textures/env.jpg');
  }

  static initControls() {
    if (!Config.ORBIT) {
      return;
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    // this.controls.enableZoom = false;
    // this.controls.enabled = false;
  }

  static addListeners() {
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart);
  }

  /**
   * Event handlers
   */

  static onTouchStart = e => {
    e.preventDefault();
  };

  /**
   * Public methods
   */

  static resize = (width, height, dpr) => {
    width = Math.round(width * dpr);
    height = Math.round(height * dpr);

    this.resolution.value.set(width, height);
    this.aspect.value = width / height;
  };

  static update = (time, delta, frame) => {
    this.time.value = time;
    this.frame.value = frame;

    if (this.controls && this.controls.enabled) {
      this.controls.update();
    }
  };

  static getTexture = (path, callback) => this.textureLoader.load(path, callback);

  static loadTexture = path => this.textureLoader.loadAsync(path);

  static loadEnvironmentTexture = path => this.environmentLoader.loadAsync(path);

  static getBufferGeometry = (path, callback) => this.bufferGeometryLoader.load(path, callback);

  static loadBufferGeometry = path => this.bufferGeometryLoader.loadAsync(path);
}
