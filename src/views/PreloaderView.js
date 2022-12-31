import { Config } from '../config/Config.js';
import { Device } from '../config/Device.js';
import { Styles } from '../config/Styles.js';
import { Events } from '../config/Events.js';
import { Global } from '../config/Global.js';
import { Interface } from '../utils/Interface.js';
import { Stage } from '../controllers/Stage.js';
import { Panel } from './panel/Panel.js';
import { PanelItem } from './panel/PanelItem.js';
import { ColorInput } from './ui/ColorInput.js';

import { clearTween, tween } from '../tween/Tween.js';
import { formatColor } from '../utils/MultiuserBlocksUtils.js';

export class PreloaderView extends Interface {
  constructor() {
    super('.preloader');

    this.progress = 0;

    this.initHTML();
    this.initBackground();
    this.initContainer();
    this.initPanel();
    this.initColor();
    this.initNumber();
    this.initTitle();

    this.addListeners();
    this.onResize();
  }

  initHTML() {
    this.css({
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      zIndex: 100,
      pointerEvents: 'none'
    });
  }

  initBackground() {
    this.bg = new Interface('.bg');
    this.bg.css({
      width: '100%',
      height: '100%',
      backgroundColor: 'var(--main-bg-color)'
    });
    this.add(this.bg);
  }

  initContainer() {
    this.container = new Interface('.container');
    this.container.css({
      left: '50%',
      top: '50%',
      width: 128,
      height: 74,
      marginLeft: -128 / 2,
      marginTop: -108
    });
    this.add(this.container);
  }

  initPanel() {
    this.panel = new Panel();
    this.panel.css({
      position: 'relative',
      marginBottom: 30
    });
    this.container.add(this.panel);

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
    this.colorPicker.fastClose = true;
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

  initNumber() {
    this.number = new Interface('.number');
    this.number.css({
      position: 'relative',
      left: '50%',
      width: 150,
      height: 25,
      marginLeft: -150 / 2,
      webkitUserSelect: 'none',
      userSelect: 'none'
    });
    this.container.add(this.number);

    this.number.inner = new Interface('.inner');
    this.number.inner.css({
      width: '100%',
      ...Styles.monospaceLabel,
      lineHeight: 25,
      textAlign: 'center',
      whiteSpace: 'nowrap',
      opacity: 0.4
    });
    this.number.inner.text(0);
    this.number.add(this.number.inner);
  }

  initTitle() {
    this.title = new Interface('.title');
    this.title.css({
      position: 'relative',
      left: '50%',
      width: 600,
      height: 25,
      marginLeft: -600 / 2,
      webkitUserSelect: 'none',
      userSelect: 'none',
      opacity: 0
    });
    this.container.add(this.title);

    this.title.inner = new Interface('.inner');
    this.title.inner.css({
      width: '100%',
      ...Styles.monospaceLabel,
      lineHeight: 25,
      textAlign: 'center',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      opacity: 0.4
    });
    this.title.inner.text(Device.mobile ? 'Put on your headphones' : 'Turn up your speakers');
    this.title.add(this.title.inner);
  }

  addStartButton() {
    this.number.tween({ opacity: 0 }, 200, 'easeOutSine', () => {
      this.number.hide();
      this.title.css({ y: 10, opacity: 0 }).tween({ y: 0, opacity: 1 }, 1000, 'easeOutQuart', 100);

      this.delayedCall(7000, () => this.swapTitle((Device.mobile ? 'Tap' : 'Click') + ' anywhere'));
      this.delayedCall(14000, () => this.swapTitle(Device.mobile ? 'Tap tap!' : 'Click!'));
    });
  }

  swapTitle(text) {
    this.title.tween({ y: -10, opacity: 0 }, 300, 'easeInSine', () => {
      if (!this.title) {
        return;
      }

      this.title.inner.text(text);
      this.title.css({ y: 10 }).tween({ y: 0, opacity: 1 }, 1000, 'easeOutCubic');
    });
  }

  addListeners() {
    Stage.events.on(Events.RESIZE, this.onResize);
    this.bg.element.addEventListener('pointerdown', this.onPointerDown);
    this.color.input.events.on(Events.TYPING, this.onTyping);
    this.color.events.on(Events.COMPLETE, this.onComplete);
  }

  removeListeners() {
    Stage.events.off(Events.RESIZE, this.onResize);
    this.bg.element.removeEventListener('pointerdown', this.onPointerDown);
    this.color.input.events.off(Events.TYPING, this.onTyping);
    this.color.events.off(Events.COMPLETE, this.onComplete);
  }

  /**
   * Event handlers
   */

  onResize = () => {
    if (Stage.width < Stage.height) {
      this.container.css({ marginTop: -108 });
    } else if (Stage.width < Config.BREAKPOINT) {
      this.container.css({ marginTop: -74 / 2 });
    } else {
      this.container.css({ marginTop: -108 });
    }
  };

  onTyping = ({ text }) => {
    this.clearTimeout(this.timeout);

    const style = formatColor(text);

    this.timeout = this.delayedCall(200, () => {
      this.colorPicker.setValue(style || Config.LIGHT_COLOR);

      Global.COLOR = this.colorPicker.value.getHexString();

      Stage.events.emit(Events.COLOR, { text: Global.COLOR });
    });
  };

  onPicking = value => {
    Global.COLOR = value.getHexString();

    this.color.input.setValue(Global.COLOR);

    this.clearTimeout(this.timeout);
    this.timeout = this.delayedCall(200, () => {
      Stage.events.emit(Events.COLOR, { text: Global.COLOR });
    });
  };

  onPointerDown = () => {
    this.events.emit(Events.START);
  };

  onComplete = () => {
    if (!this.isComplete) {
      return;
    }

    this.events.emit(Events.START);
  };

  onProgress = ({ progress }) => {
    clearTween(this);
    tween(this, { progress }, 2000, 'easeInOutSine', null, () => {
      this.number.inner.text(Math.round(100 * this.progress));

      if (this.progress === 1 && !this.isComplete) {
        this.isComplete = true;

        this.events.emit(Events.COMPLETE);

        if (this.color.isComplete) {
          this.events.emit(Events.START);
        } else {
          this.bg.css({ pointerEvents: 'auto' });
          this.bg.tween({ opacity: 0 }, 2000, 'easeOutSine');

          this.addStartButton();
        }
      }
    });
  };

  /**
   * Public methods
   */

  animateIn = async () => {
    this.panel.animateIn(true);
    await this.color.animateIn();
    this.color.focus();
  };

  animateOut = callback => {
    this.number.clearTween().tween({ opacity: 0 }, 200, 'easeOutSine');
    this.title.clearTween().tween({ opacity: 0 }, 200, 'easeOutSine');
    this.panel.tween({ opacity: 0 }, 600, 'easeInOutSine');
    this.tween({ opacity: 0 }, 2000, 'easeOutCubic', 500, callback);
  };

  destroy = () => {
    this.removeListeners();

    return super.destroy();
  };
}
