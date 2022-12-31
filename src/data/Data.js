import { Global } from '../config/Global.js';

export class Data {
  /**
   * Public methods
   */

  static getUser = id => {
    for (let i = 0, l = Global.USERS.length; i < l; i++) {
      if (Global.USERS[i].id === id) {
        return Global.USERS[i];
      }
    }

    return null;
  };
}
