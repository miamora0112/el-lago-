// Bootloader.js
class Bootloader extends Phaser.Scene {
  constructor() { super({ key: "Bootloader" }); }

  preload() {
    this.load.image("menuvij", "assets/menuvij.png");
    this.load.image("boton1", "assets/boton 1.png");
    this.load.image("boton2", "assets/boton 2.png");
    this.load.image("boton3", "assets/boton 3.png");
  }

  create() {
    this.add.image(540, 360, "menuvij");
    const b1 = this.add.image(540, 200, "boton1").setInteractive({ useHandCursor: true });
    const b2 = this.add.image(270, 540, "boton2").setInteractive({ useHandCursor: true });
    const b3 = this.add.image(820, 540, "boton3").setInteractive({ useHandCursor: true });

    this.hoverZoom(b1, 1, 1.15, 150);
    this.hoverZoom(b2, 1, 1.15, 150);
    this.hoverZoom(b3, 1, 1.15, 150);

    b1.on("pointerup", () => this.scene.start("FondoArbol"));
  }

  hoverZoom(obj, base = 1, over = 1.15, dur = 150) {
    obj.setScale(base);
    obj.on("pointerover", () => {
      this.tweens.killTweensOf(obj);
      this.tweens.add({ targets: obj, scale: over, duration: dur, ease: "Power2" });
    });
    obj.on("pointerout", () => {
      this.tweens.killTweensOf(obj);
      this.tweens.add({ targets: obj, scale: base, duration: dur, ease: "Power2" });
    });
  }
}

export default Bootloader;

