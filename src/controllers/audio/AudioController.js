import { Matrix4, Object3D } from 'three';
import { Sound3D, WebAudio, clamp, delayedCall, mapLinear, tween } from '@alienkitty/space.js/three';

import { store } from '../../config/Config.js';

export class AudioController {
	static init(camera, view, ui) {
		this.camera = camera;
		this.view = view;
		this.ui = ui;

		if (!store.sound) {
			WebAudio.mute(true);
		}

		this.object = new Object3D();
		this.matrix = new Matrix4();

		this.addListeners();
	}

	static addListeners() {
		document.addEventListener('visibilitychange', this.onVisibility);
		window.addEventListener('beforeunload', this.onBeforeUnload);
	}

	// Event handlers

	static onVisibility = () => {
		if (!store.sound) {
			return;
		}

		if (document.hidden) {
			WebAudio.mute();
		} else {
			WebAudio.unmute();
		}
	};

	static onBeforeUnload = () => {
		WebAudio.mute();
	};

	// Public methods

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

				const gong = new Sound3D(this.camera, 'gong');
				gong.position.copy(object.position);
				gong.quaternion.copy(object.quaternion);
				gong.updateMatrixWorld();

				const strength = clamp(mapLinear(force, 0, 4, 0, 1), 0, 1);
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
				tween(WebAudio.gain, { value: this.ui.isDetailsOpen ? 0.3 : 1 }, 500, 'easeOutSine');
				break;
		}
	};

	static start = () => {
		this.trigger('blocks_start');
		this.trigger('cymbal');
	};

	static mute = () => {
		this.trigger('sound_off');
	};

	static unmute = () => {
		this.trigger('sound_on');
	};
}
