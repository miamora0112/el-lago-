// main.js
import Bootloader from "./scenes/Bootloader.js";
import FondoArbol from "./scenes/FondoArbol.js";
import HudHearts from "./scenes/HudHearts.js";
const config = {
  type: Phaser.AUTO,
  width: 1080,
  height: 720,
  parent: "phaser-game",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1100 },
      debug: false
    }
  },
  scene: [Bootloader, FondoArbol, HudHearts]
};

new Phaser.Game(config);
