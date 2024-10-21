import { Vector2, Vector3 } from 'three';
import { tween } from '@alienkitty/space.js/three';

import { breakpoint, isOrbit } from '../../config/Config.js';

export class CameraController {
  static init(camera) {
    this.camera = camera;

    this.mouse = new Vector2();
    this.lookAt = new Vector3(0, 0, -2);
    this.origin = new Vector3();
    this.target = new Vector3();
    this.targetXY = new Vector2(2, 5);
    this.origin.copy(this.camera.position);

    this.lerpSpeed = 0.02;
    this.lerpStrength = 0;
    this.enabled = false;

    this.addListeners();
  }

  static addListeners() {
    if (isOrbit) {
      return;
    }

    window.addEventListener('pointermove', this.onPointerMove);
  }

  // Event handlers

  static onPointerMove = ({ clientX, clientY }) => {
    if (!this.enabled) {
      return;
    }

    this.mouse.x = (clientX / document.documentElement.clientWidth) * 2 - 1;
    this.mouse.y = 1 - (clientY / document.documentElement.clientHeight) * 2;
  };

  // Public methods

  static resize = (width, height) => {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (width < height) {
      this.camera.position.y = 7;
      this.targetXY.x = 1;
    } else if (width < breakpoint) {
      this.camera.position.y = 7;
      this.targetXY.x = 2;
    } else {
      this.camera.position.y = 6;
      this.targetXY.x = 2;
    }

    this.origin.y = this.camera.position.y;
    this.camera.lookAt(this.lookAt);
  };

  static update = () => {
    if (!this.enabled) {
      return;
    }

    this.target.x = this.origin.x + this.targetXY.x * this.mouse.x;
    this.target.y = this.origin.y + this.targetXY.y * this.mouse.y;
    this.target.z = this.origin.z;

    this.camera.position.lerp(this.target, this.lerpSpeed * this.lerpStrength);
    this.camera.lookAt(this.lookAt);
  };

  static start = () => {
    this.camera.fov = 45;
    this.camera.updateProjectionMatrix();
  };

  static animateIn = () => {
    if (isOrbit) {
      return;
    }

    this.enabled = true;

    tween(this, { lerpStrength: 1 }, 4200, 'easeInOutQuart', 2000);

    tween(this.camera, { fov: 30 }, 7000, 'easeInOutBack', null, () => {
      this.camera.updateProjectionMatrix();
    });
  };
}
