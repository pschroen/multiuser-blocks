import { Group } from 'three';

import { InputManager } from '../controllers/world/InputManager.js';
import { Floor } from './scene/Floor.js';
import { FWA } from './scene/FWA.js';
// import { LongBlock } from './scene/LongBlock.js';
import { Awwwards } from './scene/Awwwards.js';
import { AwwwardsBall } from './scene/AwwwardsBall.js';
import { InstancedBlock } from './scene/InstancedBlock.js';
import { InstancedBall } from './scene/InstancedBall.js';

export class SceneView extends Group {
  constructor() {
    super();

    this.visible = false;

    this.initViews();
  }

  initViews() {
    this.fwa = new FWA();
    this.add(this.fwa);

    // this.long = new LongBlock();
    // this.add(this.long);

    this.awwwards = new Awwwards();
    this.add(this.awwwards);

    this.awwwardsBall = new AwwwardsBall();
    this.add(this.awwwardsBall);

    this.block = new InstancedBlock();
    this.add(this.block);

    this.ball = new InstancedBall();
    this.add(this.ball);

    this.floor = new Floor(this.ball);
    this.add(this.floor);
  }

  addListeners() {
    InputManager.add(...this.fwa.children);
    // InputManager.add(...this.long.children);
    InputManager.add(...this.awwwards.children);
    InputManager.add(...this.awwwardsBall.children);
    InputManager.add(...this.block.children);
  }

  removeListeners() {
    InputManager.remove(...this.fwa.children);
    // InputManager.remove(...this.long.children);
    InputManager.remove(...this.awwwards.children);
    InputManager.remove(...this.awwwardsBall.children);
    InputManager.remove(...this.block.children);
  }

  // Public methods

  resize = (width, height, dpr) => {
    this.floor.resize(width, height, dpr);
  };

  animateIn = () => {
    this.addListeners();

    this.visible = true;
  };

  ready = () => Promise.all([
    this.floor.ready(),
    this.fwa.ready(),
    // this.long.ready(),
    this.awwwards.ready(),
    this.awwwardsBall.ready(),
    this.block.ready(),
    this.ball.ready()
  ]);
}
