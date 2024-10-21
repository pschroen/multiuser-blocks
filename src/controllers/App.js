import { BufferGeometryLoaderThread, ImageBitmapLoaderThread, Stage, Thread, UI, WebAudio, ticker, wait } from '@alienkitty/space.js/three';

import { AudioController } from './audio/AudioController.js';
import { WorldController } from './world/WorldController.js';
import { CameraController } from './world/CameraController.js';
import { SceneController } from './scene/SceneController.js';
import { DisplayController } from './display/DisplayController.js';
import { InputManager } from './world/InputManager.js';
import { RenderManager } from './world/RenderManager.js';
import { PanelController } from './panel/PanelController.js';
import { SceneView } from '../views/SceneView.js';
import { DisplayView } from '../views/DisplayView.js';
import { TrackersView } from '../views/TrackersView.js';
import { HeaderColor } from '../views/ui/HeaderColor.js';

import { breakpoint, isHighQuality, store } from '../config/Config.js';

// Thread
export { EventEmitter } from '@alienkitty/space.js/three';

export class App {
  static async init(loader) {
    this.loader = loader;

    const sound = localStorage.getItem('sound');
    store.sound = sound ? JSON.parse(sound) : true;

    this.initThread();
    this.initWorld();
    this.initViews();
    this.initControllers();

    this.addListeners();
    this.onResize();

    await Promise.all([
      document.fonts.ready,
      SceneController.ready(),
      DisplayController.ready(),
      this.loader.ready()
    ]);

    await WorldController.ready();

    this.initAudio();
    this.initPanel();

    CameraController.start();
    SceneController.start();
    InputManager.start();
    RenderManager.start();
  }

  static initThread() {
    ImageBitmapLoaderThread.init();
    BufferGeometryLoaderThread.init();

    Thread.count--; // Make room for the websocket thread
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

    this.trackers = new TrackersView();
    Stage.add(this.trackers);

    this.ui = new UI({
      fps: true,
      breakpoint,
      details: {
        background: true,
        title: 'Multiuser Blocks'.replace(/[\s.]+/g, '_'),
        content: /* html */ `
A follow-up experiment to Multiuser Fluid. Multiuser Blocks is an experiment to combine physics, UI and data visualization elements in a multiuser environment.
        `,
        links: [
          {
            title: 'Source code',
            link: 'https://github.com/pschroen/multiuser-blocks'
          },
          {
            title: 'Multiuser Fluid',
            link: 'https://github.com/pschroen/multiuser-fluid'
          },
          {
            title: 'OimoPhysics',
            link: 'https://github.com/saharan/OimoPhysics'
          }
        ]
      },
      detailsButton: true,
      muteButton: {
        sound: store.sound
      }
    });
    Stage.add(this.ui);

    this.color = new HeaderColor(this.display);
    this.color.css({
      x: -10,
      opacity: 0
    });
    this.ui.header.add(this.color);
    this.ui.header.color = this.color;
  }

  static initControllers() {
    const { renderer, scene, camera, displayScene, displayCamera } = WorldController;

    CameraController.init(camera);
    SceneController.init(camera, this.view, this.trackers, this.ui);
    DisplayController.init(displayCamera, this.display);
    InputManager.init(scene, camera, this.view);
    RenderManager.init(renderer, scene, camera, displayScene, displayCamera);
  }

  static initAudio() {
    const { camera } = WorldController;

    WebAudio.init({ sampleRate: 48000 });
    WebAudio.load(this.loader.filter(path => /sounds/.test(path)));

    AudioController.init(camera, this.view, this.ui);
  }

  static initPanel() {
    if (!isHighQuality) {
      return;
    }

    const { renderer, scene } = WorldController;

    PanelController.init(this.ui, renderer, scene, this.view, this.display);
  }

  static addListeners() {
    Stage.events.on('update', this.onUsers);
    Stage.events.on('details', this.onDetails);
    Stage.events.on('ui', this.onUI);
    this.ui.muteButton.events.on('update', this.onMute);
    window.addEventListener('resize', this.onResize);
    ticker.add(this.onUpdate);
  }

  // Event handlers

  static onUsers = e => {
    this.ui.detailsButton.setData({ count: e.length });
  };

  static onDetails = ({ open }) => {
    if (open) {
      this.trackers.animateIn();

      if (store.sound) {
        AudioController.trigger('about_section');
      }
    } else {
      if (this.ui.animatedIn) { // Keep trackers when UI is hidden
        this.trackers.animateOut();
      }

      if (store.sound) {
        AudioController.trigger('blocks_section');
      }
    }
  };

  static onUI = ({ open }) => {
    DisplayController.toggle(open);
  };

  static onMute = ({ sound }) => {
    if (sound) {
      AudioController.unmute();
    } else {
      AudioController.mute();
    }

    localStorage.setItem('sound', JSON.stringify(sound));

    store.sound = sound;
  };

  static onResize = () => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;

    let dpr;

    if (isHighQuality) {
      dpr = window.devicePixelRatio;
    } else {
      dpr = 1;
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

  // Public methods

  static start = async () => {
    AudioController.start();
  };

  static animateIn = async () => {
    this.color.animateIn();
    CameraController.animateIn();
    SceneController.animateIn();
    InputManager.animateIn();

    await wait(1000);

    RenderManager.animateIn();
    DisplayController.animateIn();
    this.ui.animateIn();
  };
}
