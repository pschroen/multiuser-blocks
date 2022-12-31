import { Color, Vector2, Vector3 } from 'three';

import { Config } from '../../config/Config.js';
import { Device } from '../../config/Device.js';
import { Events } from '../../config/Events.js';
import { Global } from '../../config/Global.js';
import { Thread } from '../../utils/Thread.js';
import { Data } from '../../data/Data.js';
import { Socket } from '../../data/Socket.js';
import { SocketThread } from '../../data/SocketThread.js';
import { OimoPhysicsController } from '../../utils/physics/OimoPhysicsController.js';
import { Wobble } from '../../utils/world/Wobble.js';
import { AudioController } from '../audio/AudioController.js';
import { Stage } from '../Stage.js';
import { Tracker } from '../../views/ui/Tracker.js';

import { delayedCall, tween } from '../../tween/Tween.js';
import { range } from '../../utils/Utils.js';
import { formatColor, nearEqualsRGB } from '../../utils/MultiuserBlocksUtils.js';

export class ScenePhysicsController extends OimoPhysicsController {
  constructor(camera, view, trackers, ui) {
    super();

    this.camera = camera;
    this.view = view;
    this.trackers = trackers;
    this.header = ui.header;

    this.promise = new Promise(resolve => this.resolve = resolve);
    this.id = null;
    this.array = null;
    this.buffer = [];
    this.pointer = {};
    this.lerpSpeed = 0.07;
    this.progress = 0;
    this.connected = false;
    this.enabled = false;
    this.animatedIn = false;

    // Start position
    this.position = new Vector3(0, 4.25, 3);
    this.point = new Vector3();

    this.wobble = new Wobble(this.position);
    this.wobble.scale = 0.3;
    this.wobble.lerpSpeed = 0.01;

    this.halfScreen = new Vector2();
    this.screenSpacePosition = new Vector3();
  }

  init() {
    this.initShapes();
    this.initSocket();

    this.addListeners();
  }

  initShapes() {
    const { floor, fwa/* , long */, awwwards, awwwardsBall, block, ball } = this.view;

    this.add(floor.mesh, {
      name: 'floor',
      density: 0
    });

    this.add(fwa.mesh, {
      name: 'fwa',
      density: 1,
      shapes: fwa.shapes,
      autoSleep: false
    });

    /* this.add(long.mesh, {
      name: 'long',
      density: 1,
      autoSleep: false
    }); */

    this.add(awwwards.mesh, {
      name: 'awwwards',
      density: 1,
      shapes: awwwards.shapes,
      autoSleep: false
    });

    this.add(awwwardsBall.mesh, {
      name: 'awwwards_ball',
      density: 1,
      autoSleep: false
    });

    this.add(block.mesh, {
      name: 'block',
      density: 1,
      autoSleep: false
    });

    this.add(ball.mesh, {
      name: 'mouse'
    });

    // console.log('initShapes', JSON.stringify(this.shapes));
  }

  initSocket() {
    const port = Number(location.port) > 1000 ? `:${location.port}` : '';
    const protocol = location.protocol.replace('http', 'ws');
    const server = `${protocol}//${location.hostname}${port}`;
    // const server = 'wss://multiuser-blocks.glitch.me';

    if (!Device.agent.includes('firefox')) {
      this.thread = new Thread({
        imports: [
          // Make sure to export these from App.js
          [import.meta.url, 'EventEmitter']
        ],
        classes: [Socket],
        controller: [SocketThread, 'init', 'color', 'pick', 'motion']
      });

      // this.thread.init({ shapes: this.shapes });
      this.thread.init({ server });
    } else {
      this.socket = new Socket(server);
    }
  }

  addListeners() {
    Stage.events.on(Events.COLOR, this.onColor);
    Stage.events.on(Events.VISIBILITY, this.onVisibility);

    if (this.thread) {
      this.thread.on('close', this.onClose);
      this.thread.on('users', this.onUsers);
      this.thread.on('heartbeat', this.onHeartbeat);
      this.thread.on('buffer', this.onBuffer);
      this.thread.on('contact', this.onContact);
    } else {
      this.socket.on('close', this.onClose);
      this.socket.on('users', this.onUsers);
      this.socket.on('heartbeat', this.onHeartbeat);
      this.socket.on('buffer', this.onBuffer);
      this.socket.on('contact', this.onContact);
    }
  }

  /**
   * Event handlers
   */

  onColor = ({ text }) => {
    if (!this.id) {
      return;
    }

    const id = this.id;
    const style = formatColor(text);

    this.pointer[id].target.set(style || Config.LIGHT_COLOR);
    this.pointer[id].last.copy(this.pointer[id].target);
    this.pointer[id].needsUpdate = true;

    this.color(text);
  };

  onVisibility = () => {
    this.enabled = !document.hidden;
  };

  onClose = () => {
    this.connected = false;
  };

  onUsers = ({ users }) => {
    Global.USERS = users;

    Stage.events.emit(Events.UPDATE, users);

    if (!this.id) {
      return;
    }

    const ids = users.map(user => user.id);

    // New
    ids.forEach(id => {
      if (id === this.id) {
        return;
      }

      if (!this.pointer[id] && Object.keys(this.pointer).length - 1 < Global.NUM_POINTERS) {
        this.pointer[id] = {};
        this.pointer[id].needsUpdate = false;
        this.pointer[id].color = new Color();
        this.pointer[id].last = new Color();
        this.pointer[id].target = new Color();
        this.pointer[id].target.set(Config.LIGHT_COLOR);
        this.pointer[id].color.copy(this.pointer[id].target);
        this.pointer[id].last.copy(this.pointer[id].color);
        this.pointer[id].tracker = this.trackers.add(new Tracker());

        const i = Number(id);
        this.view.ball.color.copy(this.pointer[id].color);
        this.view.ball.lights[i].color.copy(this.pointer[id].color);
        this.view.ball.mesh.setColorAt(i, this.view.ball.color);
        this.view.ball.mesh.instanceColor.needsUpdate = true;
      }
    });

    // Update and prune
    Object.keys(this.pointer).forEach(id => {
      if (id === this.id) {
        this.header.color.setData(Data.getUser(id));
        return;
      }

      if (ids.includes(id)) {
        const data = Data.getUser(id);

        if (this.pointer[id].tracker) {
          this.pointer[id].tracker.setData(data);
        }

        const style = formatColor(data.color);

        this.pointer[id].target.set(style || Config.LIGHT_COLOR);

        if (!this.pointer[id].target.equals(this.pointer[id].last)) {
          this.pointer[id].last.copy(this.pointer[id].target);
          this.pointer[id].needsUpdate = true;
        }
      } else {
        if (this.pointer[id].tracker) {
          this.pointer[id].tracker.animateOut(() => {
            if (this.pointer[id]) {
              this.pointer[id].tracker.destroy();

              delete this.pointer[id];
            }
          });
        } else {
          delete this.pointer[id];
        }
      }
    });
  };

  onHeartbeat = ({ id/* , time */ }) => {
    if (!this.connected) {
      this.connected = true;
      this.id = id;

      this.pointer[id] = {};
      this.pointer[id].needsUpdate = false;
      this.pointer[id].color = new Color();
      this.pointer[id].last = new Color();
      this.pointer[id].target = new Color();
      this.pointer[id].target.set(Config.LIGHT_COLOR);
      this.pointer[id].color.copy(this.pointer[id].target);
      this.pointer[id].last.copy(this.pointer[id].color);

      this.onColor({ text: Global.COLOR });

      this.resolve();
    }
  };

  onBuffer = ({ array }) => {
    if (!this.enabled) {
      return;
    }

    if (this.buffer.length > 3) {
      this.buffer.shift();
    }

    this.buffer.push(array);
  };

  onContact = ({ body, force }) => {
    AudioController.trigger('gong', body, force);
  };

  /**
   * Public methods
   */

  resize = (width, height) => {
    this.halfScreen.set(width / 2, height / 2);

    if (this.animatedIn) {
      return;
    }

    if (width < height) {
      this.position.y = 5;
      this.position.z = 3;
    } else if (width < Config.BREAKPOINT) {
      this.position.y = 5.25;
      this.position.z = 4;
    } else {
      this.position.y = 4.25;
      this.position.z = 3;
    }

    this.wobble.origin.copy(this.position);
  };

  update = time => {
    if (!this.enabled) {
      return;
    }

    this.camera.updateMatrixWorld();

    const array = this.buffer.shift() || this.array;
    this.array = array;

    if (array) {
      let index = 0;

      for (let i = 0, il = this.objects.length; i < il; i++) {
        const object = this.objects[i];

        if (object.isInstancedMesh) {
          const bodies = this.map.get(object);

          for (let j = 0, jl = bodies.length; j < jl; j++) {
            this.object.position.fromArray(array, index);
            this.object.quaternion.fromArray(array, index + 3);

            if (object.parent === this.view.ball) {
              const id = j.toString();
              const isMove = array[index + 7];
              const isDown = isMove === 2;

              let visibility;

              if (this.pointer[id]) {
                if (this.pointer[id].needsUpdate && !nearEqualsRGB(this.pointer[id].target, this.pointer[id].color)) {
                  this.pointer[id].color.lerp(this.pointer[id].target, this.lerpSpeed);
                  // this.pointer[id].color.lerpHSL(this.pointer[id].target, this.lerpSpeed);

                  this.view.ball.color.copy(this.pointer[id].color);
                  this.view.ball.lights[j].color.copy(this.pointer[id].color);

                  object.setColorAt(j, this.view.ball.color);
                  object.instanceColor.needsUpdate = true;
                } else {
                  this.pointer[id].needsUpdate = false;
                }

                if (id !== this.id) {
                  if (this.pointer[id].tracker) {
                    this.screenSpacePosition.copy(this.object.position).project(this.camera).multiply(this.halfScreen);

                    const centerX = this.halfScreen.x + this.screenSpacePosition.x;
                    const centerY = this.halfScreen.y - this.screenSpacePosition.y;

                    this.pointer[id].tracker.css({ left: Math.round(centerX), top: Math.round(centerY) });

                    if (!this.pointer[id].tracker.animatedIn) {
                      this.pointer[id].tracker.animateIn();
                    }
                  }

                  visibility = isMove ? isDown ? 1.5 : 0.8 : 0;
                } else {
                  if (!this.progress) {
                    this.wobble.update(time);

                    this.object.position.copy(this.position);
                  } else if (this.progress < 1) {
                    this.position.lerp(this.point, this.progress);

                    this.object.position.copy(this.position);
                  } else if (!this.animatedIn) {
                    this.object.position.copy(this.point);
                  }

                  visibility = isDown ? 1.5 : 0.8;
                }
              } else {
                visibility = 0;
              }

              let strength = object.geometry.attributes.instanceVisibility.array[j];
              strength += (visibility - strength) * this.lerpSpeed;

              if (strength < 0.001) {
                strength = 0;
              }

              this.object.scale.setScalar(range(strength, 0, 0.8, 0, 1, true));

              object.geometry.attributes.instanceVisibility.array[j] = strength;
              object.geometry.attributes.instanceVisibility.needsUpdate = true;

              this.view.ball.lights[j].position.copy(this.object.position);
              this.view.ball.lights[j].intensity = strength * this.view.ball.intensity;
              this.view.ball.lights[j].visible = !!strength;
            } else {
              this.object.scale.setScalar(j >= 30 ? 0.5 : 1);
            }

            this.object.updateMatrix();

            object.setMatrixAt(j, this.object.matrix);

            index += 8;
          }

          object.instanceMatrix.needsUpdate = true;
        } else {
          object.position.fromArray(array, index);
          object.quaternion.fromArray(array, index + 3);

          index += 8;
        }
      }
    }
  };

  start = () => {
    this.enabled = true;
  };

  animateIn = () => {
    this.motion({
      isDown: false,
      x: this.point.x,
      y: this.point.y,
      z: this.point.z
    });

    tween(this, { progress: 1 }, 1000, 'easeInOutExpo', 4200);

    delayedCall(7000, () => {
      this.motion({
        isDown: false,
        x: this.point.x,
        y: this.point.y,
        z: this.point.z
      });
    });

    delayedCall(7200, () => {
      this.animatedIn = true;
    });
  };

  color = text => {
    if (!this.connected) {
      return;
    }

    if (this.thread) {
      this.thread.color({ text });
    } else {
      this.socket.color(text);
    }
  };

  pick = event => {
    if (!this.connected) {
      return;
    }

    if (this.thread) {
      this.thread.pick({ event });
    } else {
      this.socket.pick(event);
    }
  };

  motion = event => {
    if (!this.connected) {
      return;
    }

    if (this.thread) {
      this.thread.motion({ event });
    } else {
      this.socket.motion(event);
    }
  };

  ready = () => Promise.all([
    this.init(),
    this.promise
  ]);
}
