/**
 * @author pschroen / https://ufo.ai/
 */

import { Styles } from '../../config/Styles.js';
import { Interface } from '../../utils/Interface.js';
import { ColorPicker } from './ColorPicker.js';
import { List } from './List.js';
import { Slider } from './Slider.js';

export class PanelItem extends Interface {
  constructor(data) {
    super('.panel-item');

    this.data = data;

    this.width = 128;

    this.initHTML();
  }

  initHTML() {
    const width = this.width;

    let height;

    if (!this.data.type) {
      height = 28;

      this.css({
        position: 'relative',
        width,
        height,
        padding: '10px 10px 0'
      });

      this.text = new Interface('.text');
      this.text.css({
        position: 'relative',
        ...Styles.monospace,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      });
      this.text.text(this.data.label);
      this.add(this.text);
    } else if (this.data.type === 'spacer') {
      height = 10;

      this.css({
        position: 'relative',
        width,
        height
      });
    } else if (this.data.type === 'divider') {
      height = 15;

      this.css({
        position: 'relative',
        width,
        height,
        padding: '7px 10px'
      });

      this.line = new Interface('.line');
      this.line.css({
        position: 'relative',
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(var(--main-color-triplet), 0.25)',
        transformOrigin: 'left center'
      });
      this.add(this.line);
    } else if (this.data.type === 'color') {
      height = 19;

      this.css({
        position: 'relative',
        width,
        height,
        padding: '0 10px'
      });

      this.color = new ColorPicker(this.data);
      this.add(this.color);
    } else if (this.data.type === 'list') {
      height = 20;

      this.css({
        position: 'relative',
        width,
        height,
        padding: '2px 10px'
      });

      const list = Object.keys(this.data.list);
      const index = list.indexOf(this.data.value);
      const callback = this.data.callback;

      this.text = new List({ list, index, callback });
      this.add(this.text);
    } else if (this.data.type === 'slider') {
      height = 28;

      this.css({
        position: 'relative',
        width,
        height,
        padding: '0 10px'
      });

      this.text = new Slider(this.data);
      this.add(this.text);
    }
  }

  /**
   * Public methods
   */

  animateIn = (delay, fast) => {
    if (this.data && this.data.type === 'group') {
      this.line.css({ scaleX: 0, opacity: 1 }).tween({ scaleX: 1 }, 400, 'easeInOutCubic', delay);
    }

    this.css({ y: fast ? 0 : -10, opacity: 0 }).tween({ y: 0, opacity: 1 }, 400, 'easeOutCubic', delay);
  };

  animateOut = (index, total, delay, callback) => {
    if (this.data && this.data.type === 'group') {
      this.line.tween({ scaleX: 0, opacity: 0 }, 500, 'easeInCubic', delay);
    }

    this.tween({ y: -10, opacity: 0 }, 500, 'easeInCubic', delay, () => {
      if (index === 0 && callback) {
        callback();
      }
    });
  };
}
