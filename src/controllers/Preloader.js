import { AssetLoader, MultiLoader, Stage } from '@alienkitty/space.js/three';

import { PreloaderView } from '../views/PreloaderView.js';

export class Preloader {
  static init() {
    this.initStage();
    this.initView();
    this.initLoader();

    this.addListeners();
  }

  static initStage() {
    Stage.init();
  }

  static initView() {
    this.view = new PreloaderView();
    Stage.add(this.view);
  }

  static async initLoader() {
    this.view.animateIn();

    const assetLoader = new AssetLoader();
    assetLoader.cache = true;
    assetLoader.loadAll([
      'assets/textures/env/jewelry_black_contrast.jpg',
      'assets/textures/waterdudv.jpg',
      'assets/textures/pbr/pitted_metal_basecolor.jpg',
      'assets/textures/pbr/pitted_metal_normal.jpg',
      'assets/textures/pbr/pitted_metal_orm.jpg',
      'assets/textures/pbr/pitted_metal_height.jpg',
      'assets/textures/lens_dirt.jpg',
      'assets/sounds/nebulous_loop.mp3',
      'assets/sounds/cymbal.mp3',
      'assets/sounds/gong.mp3'
    ]);

    this.loader = new MultiLoader();
    this.loader.load(assetLoader);
    this.loader.add(2);

    const { App } = await import('./App.js');
    this.loader.trigger(1);

    this.app = App;

    await this.app.init(assetLoader);
    this.loader.trigger(1);
  }

  static addListeners() {
    this.loader.events.on('progress', this.view.onProgress);
    // this.view.events.on('complete', this.onComplete);
    this.view.events.on('start', this.onStart);
  }

  static removeListeners() {
    this.loader.events.off('progress', this.view.onProgress);
    // this.view.events.off('complete', this.onComplete);
    this.view.events.off('start', this.onStart);
  }

  // Event handlers

  static onStart = async () => {
    this.removeListeners();

    this.loader = this.loader.destroy();

    this.app.start();

    await this.view.animateOut();
    this.view = this.view.destroy();

    this.app.animateIn();
  };
}
