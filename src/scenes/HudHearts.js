class HudHearts extends Phaser.Scene {
  constructor() { super({ key: 'HudHearts' }); }

  init(data) {
    this.max = data?.max ?? 3;                // número máximo de corazones
    this.value = data?.value ?? this.max;     // vidas actuales
    this.texKeyFull = data?.texKeyFull ?? 'corazon';   // 50x50 lleno
    this.texKeyEmpty = data?.texKeyEmpty ?? null;      // 50x50 vacío (opcional)
    this.spacing = data?.spacing ?? 8;        // separación entre corazones
    this.pos = data?.pos ?? { x: 16, y: 16 }; // posición
    this.scale = data?.scale ?? 1;            // escala del sprite
  }

  preload() {
    // Si no existen, los carga (puedes comentar si ya los cargas en Bootloader)
    if (!this.textures.exists(this.texKeyFull)) {
      this.load.image(this.texKeyFull, 'assets/corazon.png'); // 50x50
    }
    if (this.texKeyEmpty && !this.textures.exists(this.texKeyEmpty)) {
      this.load.image(this.texKeyEmpty, 'assets/corazon_empty.png'); // 50x50
    }
  }

  create() {
    // Contenedor fijo a cámara
    this.ui = this.add.container(this.pos.x, this.pos.y).setDepth(1000);
    this.ui.setScrollFactor(0);

    // Slots de corazones
    this.slotsFull = [];
    this.slotsEmpty = [];

    for (let i = 0; i < this.max; i++) {
      const x = i * (50 * this.scale + this.spacing);

      // capa de vacío (si existe textura)
      let emptyImg = null;
      if (this.texKeyEmpty) {
        emptyImg = this.add.image(x, 0, this.texKeyEmpty).setOrigin(0, 0).setScale(this.scale);
        this.ui.add(emptyImg);
      }

      // capa de lleno
      const fullImg = this.add.image(x, 0, this.texKeyFull).setOrigin(0, 0).setScale(this.scale);
      this.ui.add(fullImg);

      this.slotsEmpty.push(emptyImg);
      this.slotsFull.push(fullImg);
    }

    this.renderHearts();

    // Escuchar cambios en registry
    this.registry.events.on('changedata-lives', this.onLivesChanged, this);

    // Limpiar al cerrar
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-lives', this.onLivesChanged, this);
    });
  }

  onLivesChanged(parent, value) {
    this.value = Phaser.Math.Clamp(value, 0, this.max);
    this.renderHearts();
  }

  setValue(v) {
    this.registry.set('lives', v);
  }

  renderHearts() {
    for (let i = 0; i < this.max; i++) {
      const full = i < this.value;

      // Si tienes textura de vacío, muestra/oculta capas
      if (this.texKeyEmpty) {
        if (this.slotsEmpty[i]) this.slotsEmpty[i].setVisible(true);
        this.slotsFull[i].setVisible(full);
      } else {
        // Sin textura de vacío: usar opacidad
        this.slotsFull[i].setVisible(true).setAlpha(full ? 1 : 0.25);
      }
    }
  }
}

export default HudHearts;
