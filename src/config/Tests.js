import { Device } from './Device.js';

export class Tests {
  static highQuality = navigator.hardwareConcurrency > 4 || (!navigator.hardwareConcurrency && !Device.tablet);
}
