import { Events } from '../../config/Events.js';
import { Interface } from '../../utils/Interface.js';
import { ColorInputField } from './ColorInputField.js';

export class ColorInput extends Interface {
  constructor() {
    super('.input');

    this.initHTML();
    this.initViews();

    this.addListeners();
  }

  initHTML() {
    this.invisible();
    this.css({
      position: 'relative',
      width: 47,
      height: 19,
      zIndex: 99999,
      opacity: 0
    });
  }

  initViews() {
    this.input = new ColorInputField();
    this.add(this.input);
  }

  addListeners() {
    this.input.events.on(Events.HOVER, this.onHover);
    this.input.events.on(Events.COMPLETE, this.onComplete);
  }

  removeListeners() {
    this.input.events.off(Events.HOVER, this.onHover);
    this.input.events.off(Events.COMPLETE, this.onComplete);
  }

  /**
   * Event handlers
   */

  onHover = ({ type }) => {
    if (type === 'mouseenter') {
      this.input.tween({ opacity: 1 }, 200, 'easeOutSine');
    } else {
      this.input.tween({ opacity: 0.7 }, 200, 'easeOutSine');
    }
  };

  onComplete = () => {
    this.isComplete = true;

    this.events.emit(Events.COMPLETE);
  };

  /**
   * Public methods
   */

  focus = () => {
    this.input.focus();
  };

  blur = () => {
    this.input.blur();
  };

  animateIn = () => {
    this.visible();

    return this.tween({ opacity: 1 }, 400, 'easeOutCubic', () => {
      this.input.css({ pointerEvents: 'auto' });
    });
  };

  animateOut = () => {
    this.input.css({ pointerEvents: 'none' });

    return this.tween({ opacity: 0 }, 600, 'easeInOutSine', () => {
      this.invisible();
    });
  };

  destroy = () => {
    this.removeListeners();

    this.clearTimeout(this.timeout);

    return super.destroy();
  };
}
