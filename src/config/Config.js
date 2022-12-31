export class Config {
  static LIGHT_COLOR = 0xf44336;

  static BREAKPOINT = 1000;

  static ASSETS = [
    'assets/textures/env.jpg',
    'assets/textures/waterdudv.jpg',
    'assets/textures/pbr/pitted_metal_basecolor.jpg',
    'assets/textures/pbr/pitted_metal_normal.jpg',
    'assets/textures/pbr/pitted_metal_orm.jpg',
    'assets/textures/pbr/pitted_metal_height.jpg',
    'assets/textures/lens_dirt.jpg',
    'assets/sounds/cymbal.mp3',
    'assets/sounds/nebulous_loop.mp3',
    'assets/sounds/gong.mp3'
  ];

  static ORBIT = /[?&]orbit/.test(location.search);
  static DEBUG = /[?&]debug/.test(location.search);
}
