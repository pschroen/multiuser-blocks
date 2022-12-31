import { Config } from '../config/Config.js';
import { Device } from '../config/Device.js';
import { Events } from '../config/Events.js';
import { Assets } from '../loaders/Assets.js';
import { MultiLoader } from '../loaders/MultiLoader.js';
import { FontLoader } from '../loaders/FontLoader.js';
import { AssetLoader } from '../loaders/AssetLoader.js';
import { Stage } from './Stage.js';
import { PreloaderView } from '../views/PreloaderView.js';

export class Preloader {
  static init() {
    if (!Device.webgl) {
      return location.href = 'fallback.html';
    }

    Assets.cache = true;

    this.initView();
    this.initLoader();

    this.addListeners();
  }

  static initView() {
    this.view = new PreloaderView();
    Stage.add(this.view);
  }

  static async initLoader() {
    this.view.animateIn();

    this.loader = new MultiLoader();
    this.loader.load(new FontLoader([
      { family: 'D-DIN', style: 'normal', weight: '400' },
      { family: 'Gothic A1', style: 'normal', weight: '500' },
      { family: 'Gothic A1', style: 'normal', weight: '700' },
      { family: 'Roboto Mono', style: 'normal', weight: '500' }
    ]));
    this.loader.load(new AssetLoader(Config.ASSETS));
    this.loader.add(1);

    const { App } = await import('./App.js');
    this.loader.trigger(1);

    this.app = App;

    await this.app.init(this.loader);
  }

  static addListeners() {
    this.loader.events.on(Events.PROGRESS, this.view.onProgress);
    // this.view.events.on(Events.COMPLETE, this.onComplete);
    this.view.events.on(Events.START, this.onStart);
  }

  static removeListeners() {
    this.loader.events.off(Events.PROGRESS, this.view.onProgress);
    // this.view.events.off(Events.COMPLETE, this.onComplete);
    this.view.events.off(Events.START, this.onStart);
  }

  /**
   * Event handlers
   */

  static onStart = () => {
    if (Device.agent.includes('android')) {
      document.body.requestFullscreen();
    }

    this.removeListeners();

    this.loader = this.loader.destroy();

    this.view.animateOut(() => {
      this.view = this.view.destroy();
    });

    this.app.start();
  };
}
