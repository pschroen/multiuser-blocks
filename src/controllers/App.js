import { Device } from '../config/Device.js';
import { Events } from '../config/Events.js';
import { Global } from '../config/Global.js';
import { Tests } from '../config/Tests.js';
import { Assets } from '../loaders/Assets.js';
import { Thread } from '../utils/Thread.js';
import { ImageBitmapLoaderThread } from '../loaders/ImageBitmapLoaderThread.js';
import { BufferGeometryLoaderThread } from '../loaders/world/BufferGeometryLoaderThread.js';
import { WebAudio } from '../utils/audio/WebAudio.js';
import { AudioController } from './audio/AudioController.js';
import { WorldController } from './world/WorldController.js';
import { CameraController } from './world/CameraController.js';
import { InputManager } from './world/InputManager.js';
import { RenderManager } from './world/RenderManager.js';
import { SceneController } from './scene/SceneController.js';
import { DisplayController } from './display/DisplayController.js';
import { PanelController } from './panel/PanelController.js';
import { Stage } from './Stage.js';
import { SceneView } from '../views/SceneView.js';
import { DisplayView } from '../views/DisplayView.js';
import { Trackers } from '../views/Trackers.js';
import { UI } from '../views/UI.js';

import { ticker } from '../tween/Ticker.js';
import { wait } from '../tween/Tween.js';

// Thread
export { EventEmitter } from '../utils/EventEmitter.js';

export class App {
  static async init(loader) {
    this.loader = loader;

    const sound = localStorage.getItem('sound');
    Global.SOUND = sound ? JSON.parse(sound) : true;

    if (!Device.agent.includes('firefox')) {
      this.initThread();
    }

    this.initWorld();
    this.initViews();
    this.initControllers();

    this.addListeners();
    this.onResize();

    await this.loader.ready();

    WebAudio.init(Assets.filter(path => /sounds/.test(path)), { sampleRate: 48000 });
    AudioController.init(this.view);

    await Promise.all([
      SceneController.ready(),
      DisplayController.ready(),
      WorldController.textureLoader.ready(),
      WorldController.environmentLoader.ready()
    ]);

    SceneController.start();
    InputManager.start();

    this.initPanel();
  }

  static initThread() {
    ImageBitmapLoaderThread.init();
    BufferGeometryLoaderThread.init();

    Thread.count--; // Make room for the physics thread
    Thread.shared();
  }

  static initWorld() {
    WorldController.init();
    Stage.add(WorldController.element);
  }

  static initViews() {
    this.view = new SceneView();
    WorldController.scene.add(this.view);

    this.display = new DisplayView();
    WorldController.displayScene.add(this.display);

    this.trackers = new Trackers();
    Stage.add(this.trackers);

    this.ui = new UI(this.display, this.trackers);
    Stage.add(this.ui);
  }

  static initControllers() {
    const { renderer, scene, camera, displayScene, displayCamera } = WorldController;

    CameraController.init(camera);
    SceneController.init(camera, this.view, this.trackers, this.ui);
    DisplayController.init(displayCamera, this.display);
    InputManager.init(scene, camera, this.view);
    RenderManager.init(renderer, scene, camera, displayScene, displayCamera);
  }

  static initPanel() {
    if (!Tests.highQuality) {
      return;
    }

    const { renderer, scene } = WorldController;

    PanelController.init(this.ui, renderer, scene, this.view, this.display);
  }

  static addListeners() {
    Stage.events.on(Events.RESIZE, this.onResize);
    ticker.add(this.onUpdate);
  }

  /**
   * Event handlers
   */

  static onResize = () => {
    const { width, height } = Stage;

    let dpr;

    if (Device.tablet) {
      dpr = 1;
    } else {
      dpr = Stage.dpr;
    }

    WorldController.resize(width, height, dpr);
    CameraController.resize(width, height);
    SceneController.resize(width, height, dpr);
    DisplayController.resize(width, height, dpr);
    RenderManager.resize(width, height, dpr);
  };

  static onUpdate = (time, delta, frame) => {
    WorldController.update(time, delta, frame);
    CameraController.update();
    SceneController.update(time);
    DisplayController.update();
    InputManager.update(time);
    RenderManager.update(time, delta, frame);

    this.ui.update();
  };

  /**
   * Public methods
   */

  static start = async () => {
    AudioController.trigger('blocks_start');
    AudioController.trigger('cymbal');
    CameraController.animateIn();
    SceneController.animateIn();
    InputManager.animateIn();
    RenderManager.animateIn();

    await wait(1000);

    DisplayController.animateIn();
    this.ui.animateIn();
  };
}
