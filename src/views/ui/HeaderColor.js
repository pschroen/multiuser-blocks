import { Vector2 } from 'three';

import { Config } from '../../config/Config.js';
import { Styles } from '../../config/Styles.js';
import { Events } from '../../config/Events.js';
import { Global } from '../../config/Global.js';
import { Interface } from '../../utils/Interface.js';
import { Stage } from '../../controllers/Stage.js';
import { Panel } from '../panel/Panel.js';
import { PanelItem } from '../panel/PanelItem.js';
import { ColorInput } from './ColorInput.js';

import { formatColor } from '../../utils/MultiuserBlocksUtils.js';

export class HeaderColor extends Interface {
  constructor(display) {
    super('.color');

    this.display = display;

    this.mouse = new Vector2();
    this.delta = new Vector2();
    this.lastTime = null;
    this.lastMouse = new Vector2();
    this.openColor = null;

    this.initHTML();
    this.initLatency();
    this.initPanel();
    this.initColor();

    this.addListeners();
  }

  initHTML() {
    this.css({
      position: 'relative',
      cssFloat: 'left',
      width: 128,
      height: 35
    });
  }

  initLatency() {
    this.latency = new Interface('.latency');
    this.latency.css({
      left: 33,
      top: 10,
      ...Styles.monospaceSmall,
      webkitUserSelect: 'none',
      userSelect: 'none',
      opacity: 0.7
    });
    this.add(this.latency);
  }

  initPanel() {
    this.panel = new Panel();
    this.panel.css({
      left: 0,
      top: 8,
      width: 128
    });
    this.add(this.panel);

    const items = [
      {
        type: 'color',
        value: Config.LIGHT_COLOR,
        noText: true,
        callback: this.onPicking
      }
    ];

    items.forEach(data => {
      const item = new PanelItem(data);
      this.panel.add(item);
    });

    this.colorPicker = this.panel.items[0].color;
    this.colorPicker.swatch.invisible();
  }

  initColor() {
    this.color = new ColorInput();
    this.color.css({
      position: 'absolute',
      top: 0,
      right: 10
    });
    this.panel.add(this.color);
  }

  addListeners() {
    Stage.events.on(Events.COLOR_PICKER, this.onColorPicker);
    this.color.input.events.on(Events.TYPING, this.onTyping);
    this.color.events.on(Events.COMPLETE, this.onComplete);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  removeListeners() {
    Stage.events.off(Events.COLOR_PICKER, this.onColorPicker);
    this.color.input.events.off(Events.TYPING, this.onTyping);
    this.color.events.off(Events.COMPLETE, this.onComplete);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  /**
   * Event handlers
   */

  onColorPicker = ({ open, target }) => {
    if (!this.element.contains(target.element)) {
      return;
    }

    if (open) {
      this.openColor = target;
    } else {
      this.openColor = null;
    }
  };

  onTyping = ({ text }) => {
    this.clearTimeout(this.timeout);

    const style = formatColor(text);

    this.timeout = this.delayedCall(200, () => {
      this.colorPicker.setValue(style || Config.LIGHT_COLOR);
      this.display.ball.setColor(this.colorPicker.value);

      Global.COLOR = this.colorPicker.value.getHexString();

      Stage.events.emit(Events.COLOR, { text: Global.COLOR });
    });
  };

  onPicking = value => {
    this.display.ball.setColor(value);

    Global.COLOR = value.getHexString();

    this.color.input.setValue(Global.COLOR);

    this.clearTimeout(this.timeout);
    this.timeout = this.delayedCall(200, () => {
      Stage.events.emit(Events.COLOR, { text: Global.COLOR });
    });
  };

  onComplete = () => {
    this.color.blur();

    Stage.events.emit(Events.COLOR_PICKER, { open: false, target: this });
  };

  onPointerDown = e => {
    if (!this.openColor) {
      return;
    }

    this.onPointerMove(e);

    window.addEventListener('pointermove', this.onPointerMove);
  };

  onPointerMove = ({ clientX, clientY }) => {
    const event = {
      x: clientX,
      y: clientY
    };

    this.mouse.copy(event);

    if (!this.lastTime) {
      this.lastTime = performance.now();
      this.lastMouse.copy(event);
    }
  };

  onPointerUp = e => {
    if (!this.openColor || !this.lastTime) {
      return;
    }

    window.removeEventListener('pointermove', this.onPointerMove);

    this.onPointerMove(e);

    if (performance.now() - this.lastTime > 750 || this.delta.subVectors(this.mouse, this.lastMouse).length() > 50) {
      this.lastTime = null;
      return;
    }

    if (!this.element.contains(e.target)) {
      Stage.events.emit(Events.COLOR_PICKER, { open: false, target: this });
    }

    this.lastTime = null;
  };

  /**
   * Public methods
   */

  animateIn = () => {
    if (Global.COLOR) {
      const style = `#${Global.COLOR}`;

      this.colorPicker.setValue(style);
      this.display.ball.setColor(this.colorPicker.value);
      this.color.input.setValue(Global.COLOR);
    }

    this.panel.animateIn();
    this.color.animateIn();
  };

  setData = data => {
    if (!data) {
      return;
    }

    if (data.latency) {
      this.latency.text(`${data.latency}ms`);
    }
  };

  destroy = () => {
    this.removeListeners();

    return super.destroy();
  };
}
