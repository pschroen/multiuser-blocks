import { Matrix4, Object3D } from 'three';

import { Events } from '../../config/Events.js';
import { Global } from '../../config/Global.js';
import { WebAudio } from '../../utils/audio/WebAudio.js';
import { Sound3D } from '../../utils/audio/Sound3D.js';
import { WorldController } from '../world/WorldController.js';
import { Stage } from '../Stage.js';

import { delayedCall, tween } from '../../tween/Tween.js';
import { clamp, range } from '../../utils/Utils.js';

export class AudioController {
  static init(view) {
    if (!Global.SOUND) {
      WebAudio.mute(true);
    }

    this.view = view;

    this.object = new Object3D();
    this.matrix = new Matrix4();

    this.addListeners();
  }

  static addListeners() {
    Stage.events.on(Events.VISIBILITY, this.onVisibility);
  }

  /**
   * Event handlers
   */

  static onVisibility = () => {
    if (!Global.SOUND) {
      return;
    }

    if (document.hidden) {
      WebAudio.mute();
    } else {
      WebAudio.unmute();
    }
  };

  /**
   * Public methods
   */

  static trigger = (event, body, force) => {
    switch (event) {
      case 'gong': {
        let object;

        if (body > 2) {
          body -= 3;

          this.view.block.mesh.getMatrixAt(body, this.matrix);
          this.matrix.decompose(this.object.position, this.object.quaternion, this.object.scale);

          object = this.object;
        } else if (body === 2) {
          object = this.view.awwwardsBall;
        } else if (body === 1) {
          object = this.view.awwwards;
        } else if (body === 0) {
          object = this.view.fwa;
        }

        const gong = new Sound3D(WorldController.camera, 'gong');
        gong.position.copy(object.position);
        gong.quaternion.copy(object.quaternion);
        gong.updateMatrixWorld();

        const strength = range(force, 0, 4, 0, 1, true);
        gong.sound.gain.set(strength * 0.7);
        gong.sound.playbackRate.set(clamp(0.8 + strength * 0.4, 0.8, 1.2));
        gong.sound.play();

        delayedCall(6000, () => {
          gong.destroy();
        });
        break;
      }
      case 'cymbal':
        WebAudio.play('cymbal', 0.05).gain.fade(0, 2000);
        break;
      case 'blocks_start':
        WebAudio.fadeInAndPlay('nebulous_loop', 0.02, true, 2000, 'linear');
        break;
      case 'about_section':
        tween(WebAudio.gain, { value: 0.3 }, 1000, 'easeOutSine');
        break;
      case 'blocks_section':
        tween(WebAudio.gain, { value: 1 }, 1000, 'easeOutSine');
        break;
      case 'sound_off':
        tween(WebAudio.gain, { value: 0 }, 500, 'easeOutSine');
        break;
      case 'sound_on':
        tween(WebAudio.gain, { value: Global.DETAILS_OPEN ? 0.3 : 1 }, 500, 'easeOutSine');
        break;
    }
  };

  static mute = () => {
    this.trigger('sound_off');
  };

  static unmute = () => {
    this.trigger('sound_on');
  };
}
