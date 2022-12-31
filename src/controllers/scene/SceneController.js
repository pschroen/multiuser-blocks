import { ScenePhysicsController } from './ScenePhysicsController.js';

export class SceneController {
  static init(camera, view, trackers, ui) {
    this.camera = camera;
    this.view = view;
    this.trackers = trackers;
    this.ui = ui;

    this.initPhysics();
  }

  static initPhysics() {
    this.physics = new ScenePhysicsController(this.camera, this.view, this.trackers, this.ui);
  }

  /**
   * Public methods
   */

  static resize = (width, height, dpr) => {
    this.view.resize(width, height, dpr);
    this.physics.resize(width, height);
  };

  static update = time => {
    if (!this.view.visible) {
      return;
    }

    this.physics.update(time);
  };

  static start = () => {
    this.physics.start();
    this.view.animateIn();
  };

  static animateIn = () => {
    this.physics.animateIn();
  };

  static color = text => {
    this.physics.color(text);
  };

  static pick = event => {
    this.physics.pick(event);
  };

  static motion = event => {
    this.physics.motion(event);
  };

  static ready = async () => {
    await this.view.ready();
    await this.physics.ready();
  };
}
