// import { Color } from 'three/src/math/Color.js';
import { Color } from '../../utils/extras/Color.js';

import { Config } from '../../config/Config.js';
import { Styles } from '../../config/Styles.js';
import { Events } from '../../config/Events.js';
import { Interface } from '../../utils/Interface.js';
import { Stage } from '../../controllers/Stage.js';

export class ColorInputField extends Interface {
  constructor(forceFocus) {
    super('.field');

    this.forceFocus = forceFocus;
    this.lastValue = '';

    this.initHTML();
    this.setAttributes();

    this.addListeners();
  }

  initHTML() {
    this.css({
      width: '100%',
      height: 19,
      pointerEvents: 'none',
      opacity: 0.7
    });

    this.input = new Interface(null, 'input');
    this.input.css({
      margin: 0,
      padding: 0,
      width: '100%',
      height: 19,
      backgroundColor: 'transparent',
      ...Styles.monospaceLabel,
      lineHeight: 'normal',
      color: 'var(--main-color)',
      resize: 'none'
    });
    this.add(this.input);
  }

  setAttributes() {
    this.input.element.setAttribute('name', 'inputField');
    this.input.element.setAttribute('autocomplete', 'off');
    this.input.element.setAttribute('autocapitalize', 'off');
    this.input.element.setAttribute('autocorrect', 'off');
    this.input.element.setAttribute('spellcheck', 'false');
    this.input.element.setAttribute('placeholder', new Color(Config.LIGHT_COLOR).getHexString());
    this.input.element.setAttribute('maxlength', 6);
  }

  addListeners() {
    this.input.element.addEventListener('focus', this.onFocus);
    this.input.element.addEventListener('blur', this.onBlur);
    this.input.element.addEventListener('keydown', this.onKeyDown);
    this.input.element.addEventListener('keyup', this.onKeyUp);
    this.element.addEventListener('mouseenter', this.onHover);
    this.element.addEventListener('mouseleave', this.onHover);

    if (this.forceFocus) {
      Stage.events.on(Events.KEY_PRESS, this.onForceFocus);
    }
  }

  removeListeners() {
    this.input.element.removeEventListener('focus', this.onFocus);
    this.input.element.removeEventListener('blur', this.onBlur);
    this.input.element.removeEventListener('keydown', this.onKeyDown);
    this.input.element.removeEventListener('keyup', this.onKeyUp);
    this.element.removeEventListener('mouseenter', this.onHover);
    this.element.removeEventListener('mouseleave', this.onHover);

    if (this.forceFocus) {
      Stage.events.off(Events.KEY_PRESS, this.onForceFocus);
    }
  }

  /**
   * Event handlers
   */

  onFocus = () => {
    this.onHover({ type: 'mouseenter' });

    this.on = true;
  };

  onBlur = () => {
    this.on = false;

    this.onHover({ type: 'mouseleave' });
  };

  onKeyDown = e => {
    if (e.keyCode === 13) {
      // Enter
      e.preventDefault();
    }
  };

  onKeyUp = e => {
    if (e.keyCode === 13) {
      // Enter
      this.events.emit(Events.COMPLETE);
    }

    const value = this.input.element.value;

    if (value !== this.lastValue) {
      this.lastValue = value;

      this.events.emit(Events.TYPING, { text: value });
    }
  };

  onHover = e => {
    if (this.on) {
      return;
    }

    this.events.emit(Events.HOVER, e);
  };

  onForceFocus = () => {
    if (this.on) {
      return;
    }

    this.focus();
  };

  /**
   * Public methods
   */

  setValue = value => {
    this.input.element.value = value;
    this.lastValue = value;
  };

  focus = () => {
    this.input.element.focus();
    this.onFocus();
  };

  blur = () => {
    this.input.element.blur();
    this.onBlur();
  };

  destroy = () => {
    this.removeListeners();

    return super.destroy();
  };
}
