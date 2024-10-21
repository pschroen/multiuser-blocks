import { Color, Mesh, MeshBasicMaterial, Raycaster, Vector2, Vector3 } from 'three';
import { Stage, tween } from '@alienkitty/space.js/three';

import { WorldController } from './WorldController.js';
import { SceneController } from '../scene/SceneController.js';

import { isMobile, layers } from '../../config/Config.js';

export class InputManager {
  static init(scene, camera, view) {
    this.scene = scene;
    this.camera = camera;
    this.view = view;

    this.raycaster = new Raycaster();
    this.raycaster.layers.enable(layers.picking);

    this.objects = [];
    this.mouse = new Vector2();
    this.target = new Vector3();
    this.lerpSpeed = 0.03;
    this.mobileOffset = isMobile ? 1 : 0; // Position above finger
    this.hover = null;
    this.selected = null;
    this.isDown = false;
    this.enabled = false;
    this.prevent = true;

    // Start position
    this.position = new Vector3(0, 4.25, 2);

    this.initMesh();

    this.addListeners();
  }

  static initMesh() {
    const { quad } = WorldController;

    this.material = new MeshBasicMaterial({
      color: new Color(Stage.rootStyle.getPropertyValue('--bg-color').trim()),
      transparent: true,
      toneMapped: false
    });

    this.plane = new Mesh(quad, new MeshBasicMaterial({ visible: false }));
    this.plane.scale.multiplyScalar(200);
    this.plane.layers.enable(layers.picking);
    this.scene.add(this.plane);

    // Start position
    this.dragPlane = new Mesh(quad, this.material);
    this.dragPlane.position.copy(this.position);
    this.dragPlane.quaternion.copy(this.camera.quaternion);
    this.dragPlane.scale.multiplyScalar(200);
    this.dragPlane.layers.enable(layers.picking);
    this.scene.add(this.dragPlane);
  }

  static addListeners() {
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  // Event handlers

  static onPointerDown = e => {
    if (!this.enabled) {
      return;
    }

    this.isDown = true;

    this.onPointerMove(e);
  };

  static onPointerMove = ({ clientX, clientY }) => {
    if (!this.enabled) {
      return;
    }

    this.mouse.x = (clientX / document.documentElement.clientWidth) * 2 - 1;
    this.mouse.y = 1 - (clientY / document.documentElement.clientHeight) * 2;

    if (this.prevent) {
      return;
    }

    if (this.selected) {
      this.dragPlane.position.lerp(this.target, this.lerpSpeed);

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersection = this.raycaster.intersectObject(this.dragPlane);

      if (intersection.length) {
        const point = intersection[0].point;

        SceneController.motion({
          isDown: this.isDown,
          x: point.x,
          y: point.y + this.mobileOffset,
          z: point.z
        });
      }

      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersection = this.raycaster.intersectObjects(this.objects);

    if (intersection.length) {
      let object = intersection[0].object;

      if (object.parent.isGroup) {
        object = object.parent;
      }

      if (this.isDown && this.selected !== object) {
        this.selected = object;

        const point = intersection[0].point;
        const instanceId = intersection[0].instanceId;

        let body;

        if (instanceId !== undefined) {
          body = 9 + instanceId;
        } else if (object === this.view.awwwardsBall) {
          body = 8;
        } else if (object === this.view.awwwards) {
          body = 7;
        } else if (object === this.view.fwa) {
          body = 6;
        }

        SceneController.pick({
          body,
          x: point.x,
          y: point.y,
          z: point.z
        });

        SceneController.motion({
          isDown: this.isDown,
          x: point.x,
          y: point.y + this.mobileOffset,
          z: point.z
        });

        this.target.x = point.x;
        this.target.y = point.y;
        this.target.z = 0; // Move drag plane towards centre of scene

        this.dragPlane.position.copy(point);

        this.scene.add(this.dragPlane);

        Stage.css({ cursor: 'move' });
      } else if (this.hover !== object) {
        this.hover = object;
        Stage.css({ cursor: 'pointer' });
      } else {
        Stage.css({ cursor: 'pointer' });
      }
    } else if (this.hover) {
      this.hover = null;
      Stage.css({ cursor: '' });
    }

    if (!this.selected) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersection = this.raycaster.intersectObject(this.plane);

      if (intersection.length) {
        const point = intersection[0].point;

        SceneController.motion({
          isDown: this.isDown,
          x: point.x,
          y: point.y + this.mobileOffset,
          z: point.z
        });
      }
    }
  };

  static onPointerUp = e => {
    if (!this.enabled) {
      return;
    }

    if (this.selected) {
      this.scene.remove(this.dragPlane);

      this.selected = null;
    }

    this.isDown = false;

    this.onPointerMove(e);
  };

  // Public methods

  static update = () => {
    if (this.material.visible) {
      this.dragPlane.position.copy(this.position);
      this.dragPlane.quaternion.copy(this.camera.quaternion);
    }

    if (!SceneController.physics.animatedIn) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersection = this.raycaster.intersectObject(this.plane);

      if (intersection.length) {
        const point = intersection[0].point;

        SceneController.physics.point.copy(point);
      }
    }
  };

  static start = () => {
    this.enabled = true;
  };

  static animateIn = () => {
    tween(this.material, { opacity: 0 }, 2800, 'easeInOutQuart', () => {
      this.material.visible = false;
      this.scene.remove(this.dragPlane);
      this.dragPlane.position.copy(this.plane.position);
      this.dragPlane.quaternion.copy(this.plane.quaternion);
      this.prevent = false;
    });
  };

  static add = (...objects) => {
    this.objects.push(...objects);
  };

  static remove = (...objects) => {
    objects.forEach(object => {
      const index = this.objects.indexOf(object);

      if (~index) {
        this.objects.splice(index, 1);
      }

      if (object.parent.isGroup) {
        object = object.parent;
      }

      if (object === this.hover) {
        this.hover.onHover({ type: 'out' });
        this.hover = null;
        Stage.css({ cursor: '' });
      }
    });
  };
}
