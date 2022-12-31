import { Events } from '../config/Events.js';
import { Global } from '../config/Global.js';
import { Interface } from '../utils/Interface.js';
import { AudioController } from '../controllers/audio/AudioController.js';
import { Stage } from '../controllers/Stage.js';
import { Details } from './ui/Details.js';
import { Header } from './ui/Header.js';
import { DetailsButton } from './ui/DetailsButton.js';
import { MuteButton } from './ui/MuteButton.js';

export class UI extends Interface {
  constructor(display, trackers) {
    super('.ui');

    this.display = display;
    this.trackers = trackers;

    this.invertColors = {
      light: Stage.rootStyle.getPropertyValue('--main-invert-light-color').trim(),
      lightTriplet: Stage.rootStyle.getPropertyValue('--main-invert-light-color-triplet').trim(),
      dark: Stage.rootStyle.getPropertyValue('--main-invert-dark-color').trim(),
      darkTriplet: Stage.rootStyle.getPropertyValue('--main-invert-dark-color-triplet').trim()
    };

    this.buttons = [];

    this.initHTML();
    this.initViews();

    this.addListeners();
  }

  initHTML() {
    this.css({
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    });
  }

  initViews() {
    this.details = new Details();
    this.add(this.details);

    this.header = new Header(this.display);
    this.add(this.header);

    this.detailsButton = new DetailsButton();
    this.add(this.detailsButton);

    this.muteButton = new MuteButton();
    this.add(this.muteButton);

    this.buttons.push(this.detailsButton);
    this.buttons.push(this.muteButton);
  }

  addListeners() {
    Stage.events.on(Events.UPDATE, this.onUsers);
    Stage.events.on(Events.KEY_UP, this.onKeyUp);
    Stage.events.on(Events.INVERT, this.onInvert);
    this.details.events.on(Events.CLICK, this.onDetails);
    this.detailsButton.events.on(Events.CLICK, this.onDetails);
  }

  /**
   * Event handlers
   */

  onUsers = () => {
    this.detailsButton.swapIndex();
  };

  onKeyUp = e => {
    if (e.keyCode === 27) {
      // Esc
      this.onDetails();
    }
  };

  onInvert = ({ invert }) => {
    Stage.root.style.setProperty('--main-color', invert ? this.invertColors.light : this.invertColors.dark);
    Stage.root.style.setProperty('--main-color-triplet', invert ? this.invertColors.lightTriplet : this.invertColors.darkTriplet);
    Stage.root.style.setProperty('--main-selection-bg-color', invert ? this.invertColors.light : this.invertColors.dark);
    Stage.root.style.setProperty('--main-selection-color', invert ? this.invertColors.dark : this.invertColors.light);

    this.buttons.forEach(button => button.invert());
  };

  onDetails = () => {
    if (!Global.DETAILS_OPEN) {
      Global.DETAILS_OPEN = true;

      this.detailsButton.open();
      this.details.animateIn();
      this.trackers.animateIn();

      if (Global.SOUND) {
        AudioController.trigger('about_section');
      }
    } else {
      Global.DETAILS_OPEN = false;

      this.trackers.animateOut();
      this.details.animateOut();
      this.detailsButton.close();

      if (Global.SOUND) {
        AudioController.trigger('blocks_section');
      }
    }
  };

  /**
   * Public methods
   */

  update = () => {
    this.buttons.forEach(button => {
      if (button.needsUpdate) {
        button.update();
      }
    });

    this.header.info.update();
  };

  animateIn = () => {
    this.header.animateIn();

    this.buttons.forEach(button => {
      button.animateIn();
    });
  };

  animateOut = () => {
    this.header.animateOut();

    this.buttons.forEach(button => {
      button.animateOut();
    });
  };
}
