import { Interface } from '../utils/Interface.js';

export class Trackers extends Interface {
  constructor() {
    super('.trackers');

    this.initHTML();
  }

  initHTML() {
    this.hide();
    this.css({
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      zIndex: 2,
      pointerEvents: 'none',
      webkitUserSelect: 'none',
      userSelect: 'none',
      opacity: 0
    });
  }

  animateIn = () => {
    this.show();
    this.clearTween().tween({ opacity: 1 }, 4000, 'easeOutSine');
  };

  animateOut = () => {
    this.clearTween().tween({ opacity: 0 }, 350, 'linear', () => {
      this.hide();
    });
  };
}
