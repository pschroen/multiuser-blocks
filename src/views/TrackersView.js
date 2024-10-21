import { Interface } from '@alienkitty/space.js/three';

export class TrackersView extends Interface {
	constructor() {
		super('.trackers');

		this.init();
	}

	init() {
		this.hide();
		this.css({
			position: 'absolute',
			left: 0,
			top: 0,
			width: '100%',
			height: '100%',
			pointerEvents: 'none',
			webkitUserSelect: 'none',
			userSelect: 'none',
			opacity: 0
		});
	}

	// Public methods

	animateIn = () => {
		this.show();
		this.clearTween().tween({ opacity: 1 }, 2000, 'easeOutSine');
	};

	animateOut = () => {
		this.clearTween().tween({ opacity: 0 }, 400, 'easeOutCubic', () => {
			this.hide();
		});
	};
}
