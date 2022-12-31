import { ACESFilmicToneMapping, CineonToneMapping, LinearToneMapping, NoToneMapping, ReinhardToneMapping } from 'three';

import { Events } from '../../config/Events.js';
import { RenderManager } from '../world/RenderManager.js';
import { Stage } from '../Stage.js';
import { PanelItem } from '../../views/panel/PanelItem.js';

import { brightness } from '../../utils/Utils.js';

export class PanelController {
  static init(ui, renderer, scene, view, display) {
    this.panel = ui.header.info.panel;
    this.details = ui.details;
    this.renderer = renderer;
    this.scene = scene;
    this.view = view;
    this.display = display;

    this.lastInvert = null;

    this.initPanel();
    this.setInvert(this.scene.background);
  }

  static initPanel() {
    const { luminosityMaterial, bloomCompositeMaterial, compositeMaterial, dirtMaterial } = RenderManager;

    // https://threejs.org/examples/#webgl_tonemapping
    const toneMappingOptions = {
      None: NoToneMapping,
      Linear: LinearToneMapping,
      Reinhard: ReinhardToneMapping,
      Cineon: CineonToneMapping,
      ACESFilmic: ACESFilmicToneMapping
    };

    const dirtOptions = {
      Off: false,
      Dirt: true
    };

    const matrixFilterOptions = {
      Off: false,
      Matrix: true
    };

    const items = [
      {
        label: 'FPS'
      },
      {
        type: 'divider'
      },
      {
        type: 'color',
        value: this.scene.background,
        callback: value => {
          this.scene.background.copy(value);

          this.details.bg.css({ backgroundColor: `#${value.getHexString()}` });

          this.setInvert(value);
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'list',
        list: toneMappingOptions,
        value: 'ACESFilmic',
        callback: value => {
          this.renderer.toneMapping = toneMappingOptions[value];

          this.scene.traverse(object => {
            if (object.isMesh) {
              object.material.needsUpdate = true;
            }
          });

          this.display.ball.update();
        }
      },
      {
        type: 'slider',
        label: 'Exp',
        min: 0,
        max: 2,
        step: 0.01,
        precision: 2,
        value: this.renderer.toneMappingExposure,
        callback: value => {
          this.renderer.toneMappingExposure = value;

          this.display.ball.update();
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'slider',
        label: 'Chroma',
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        value: RenderManager.distortion,
        callback: value => {
          compositeMaterial.uniforms.uDistortion.value = value;
        }
      },
      {
        type: 'slider',
        label: 'Boost',
        min: 0,
        max: 2,
        step: 0.01,
        precision: 2,
        value: RenderManager.boost,
        callback: value => {
          compositeMaterial.uniforms.uBoost.value = value;
        }
      },
      {
        type: 'slider',
        label: 'Reduce',
        min: 0,
        max: 2,
        step: 0.01,
        precision: 2,
        value: RenderManager.reduction,
        callback: value => {
          compositeMaterial.uniforms.uReduction.value = value;
        }
      },
      {
        type: 'slider',
        label: 'Grain',
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        value: RenderManager.grainAmount,
        callback: value => {
          compositeMaterial.uniforms.uGrainAmount.value = value;
        }
      },
      {
        type: 'list',
        list: matrixFilterOptions,
        value: 'Off',
        callback: value => {
          compositeMaterial.uniforms.uMatrixFilter.value = matrixFilterOptions[value] ? 1 : 0;
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'slider',
        label: 'Thresh',
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        value: RenderManager.luminosityThreshold,
        callback: value => {
          luminosityMaterial.uniforms.uThreshold.value = value;
        }
      },
      {
        type: 'slider',
        label: 'Smooth',
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        value: RenderManager.luminositySmoothing,
        callback: value => {
          luminosityMaterial.uniforms.uSmoothing.value = value;
        }
      },
      {
        type: 'slider',
        label: 'Strength',
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        value: RenderManager.bloomStrength,
        callback: value => {
          RenderManager.bloomStrength = value;
          bloomCompositeMaterial.uniforms.uBloomFactors.value = RenderManager.bloomFactors();
        }
      },
      {
        type: 'slider',
        label: 'Radius',
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        value: RenderManager.bloomRadius,
        callback: value => {
          RenderManager.bloomRadius = value;
          bloomCompositeMaterial.uniforms.uBloomFactors.value = RenderManager.bloomFactors();
        }
      },
      {
        type: 'slider',
        label: 'Chroma',
        min: 0,
        max: 1,
        step: 0.01,
        precision: 2,
        value: RenderManager.bloomDistortion,
        callback: value => {
          dirtMaterial.uniforms.uDistortion.value = value;
        }
      },
      {
        type: 'list',
        list: dirtOptions,
        value: 'Dirt',
        callback: value => {
          dirtMaterial.uniforms.uLensDirt.value = dirtOptions[value] ? 1 : 0;
        }
      },
      {
        type: 'spacer'
      }
    ];

    items.forEach(data => {
      const item = new PanelItem(data);
      this.panel.add(item);
    });
  }

  /**
   * Public methods
   */

  static setInvert = value => {
    const invert = brightness(value) > 0.6; // Light colour is inverted

    if (invert !== this.lastInvert) {
      this.lastInvert = invert;

      Stage.events.emit(Events.INVERT, { invert });
    }
  };
}
