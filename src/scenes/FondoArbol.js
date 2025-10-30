import HudHearts from './HudHearts.js';

class FondoArbol extends Phaser.Scene {
  constructor() { super({ key: "FondoArbol" }); }

  preload() {
    this.load.image("fondoarbol", "assets/fondoarbol.png");
    this.load.atlas("ongui_walk", "assets/ongui_walk/ongui_walk.png", "assets/ongui_walk/ongui_walk_atlas.json");
    this.load.animation("onguiWalkAnim", "assets/ongui_walk/ongui_walk_anim.json");
    this.load.atlas("ongui", "assets/ongui_salto/ongui.png", "assets/ongui_salto/ongui_atlas.json");
    this.load.animation("onguiJumpAnim", "assets/ongui_salto/ongui_anim.json");
    this.load.atlas("ongui_enemy", "assets/ongui_enemy/ongui_enemy.png", "assets/ongui_enemy/ongui_enemy_atlas.json");
    this.load.animation("onguiEnemyAnim", "assets/ongui_enemy/ongui_enemy_anim.json");
    this.load.atlas("ongui_enemy_atack", "assets/ongui_enemy/ongui_enemy_atack.png", "assets/ongui_enemy/ongui_enemy_atack_atlas.json");
    this.load.animation("onguiEnemyAtackAnim", "assets/ongui_enemy/ongui_enemy_atack_anim.json");
  }

  create() {
    this.W = 1080; this.H = 720;
    this.add.image(this.W / 2, this.H / 2, "fondoarbol").setDepth(0);

    const groundY = 690;
    const ground = this.add.rectangle(this.W / 2, groundY, this.W, 60, 0x000000, 0).setDepth(0);
    this.physics.add.existing(ground, true);

    const plat1 = this.add.rectangle(930, 620, 260, 30, 0x00ff88, 0.18).setStrokeStyle(3, 0x12f7ff, 1).setDepth(1);
    const plat2 = this.add.rectangle(680, 380, 220, 28, 0x00ff88, 0.18).setStrokeStyle(3, 0x12f7ff, 1).setDepth(1);
    const plat3 = this.add.rectangle(980, 220, 200, 26, 0xffd000, 0.18).setStrokeStyle(3, 0xff9900, 1).setDepth(1);
    const plat4 = this.add.rectangle(680, 80, 180, 24, 0xff6ad5, 0.18).setStrokeStyle(3, 0xff2fbf, 1).setDepth(1);
    [plat1, plat2, plat3, plat4].forEach(p => { this.physics.add.existing(p, true); p.body.checkCollision.left = p.body.checkCollision.right = p.body.checkCollision.down = true; });

    this.player = this.physics.add.sprite(200, 560, "ongui_walk").setDepth(2).setScale(0.6);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(1200);
    this.player.setMaxVelocity(340, 1000);
    this.player.body.setSize(100, 220).setOffset(60, 80);
    this.player.play("onguiwalk_idle");

    this.physics.add.collider(this.player, ground);
    [plat1, plat2, plat3, plat4].forEach(p => this.physics.add.collider(this.player, p));

    this.enemy = new EnemyFSM(this, 820, 560, "ongui_enemy", this.player, {
      patrolLeft: 720, patrolRight: 1000,
      runSpeed: 90, chaseSpeed: 160,
      viewRange: 360, loseRange: 540,
      attackRange: 70, attackCooldown: 650,
      recoverTime: 280, staggerTime: 220,
      attackDuration: 280
    });
    this.add.existing(this.enemy).setDepth(2).setScale(0.5);
    this.physics.add.existing(this.enemy);
    this.enemy.initPhysics();
    this.enemy.play("onguienemy_idle");
    this.enemy.setMaxHp(5);

    this.physics.add.collider(this.enemy, ground);
    [plat1, plat2, plat3, plat4].forEach(p => this.physics.add.collider(this.enemy, p));

    //VIDAS + HUD
    this.playerLives = 3;
    this.maxLives = 3;
    this.registry.set('lives', this.playerLives);

    if (!this.scene.get('HudHearts')) {
      this.scene.add('HudHearts', HudHearts, false);
    }
    this.scene.launch('HudHearts', {
      max: this.maxLives,
      value: this.playerLives,
      texKeyFull: 'corazon',
      spacing: 6,
      pos: { x: 16, y: 16 },
      scale: 1
    });

    this.hitCooldownMs = 800;
    this.invulnUntil = 0;
    this.controlsEnabled = true;

    this.inIntro = true;
    this.aiEnabled = false;

    // Partículas de impacto
    const g = this.add.graphics();
    g.fillStyle(0xffd66b, 1); g.fillCircle(4, 4, 4);
    g.generateTexture('pSpark', 8, 8); g.destroy();
    this.hitEmitter = this.add.particles(0, 0, 'pSpark', {
      speed: { min: 160, max: 320 },
      gravityY: 700,
      lifespan: 600,
      quantity: 24,
      scale: { start: 1, end: 0 },
      emitting: false
    });

    this.physics.add.collider(this.player, this.enemy, (player, enemy) => {
      if (this.inIntro || !this.enemy.isAlive()) return;
      const now = this.time.now;
      if (now >= this.invulnUntil && this.controlsEnabled) this.onPlayerHit(player, enemy);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.ACCEL = 1400;
    this.SPEED = 300;
    this.JUMP = 600;
    this.isJumping = false;

    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.playerAttacking = false;
    this.attackDuration = 180;
    this.attackCooldown = 300;
    this.nextSwing = 0;
    this.attackBox = this.add.rectangle(0, 0, 90, 90, 0xffffff, 0).setDepth(5);
    this.physics.add.existing(this.attackBox, true);
    this.physics.add.overlap(this.attackBox, this.enemy, () => {
      if (!this.playerAttacking || this.inIntro || !this.enemy.isAlive()) return;
      this.enemy.takeDamage(1);
      this.enemy.stagger();
      this.cameras.main.shake(120, 0.005);
      this.playerAttacking = false;
    }, null, this);

    this.enemyHpBg = this.add.rectangle(0, 0, 60, 8, 0x000000, 0.5).setDepth(20);
    this.enemyHpBar = this.add.rectangle(0, 0, 60, 8, 0xff4040, 1).setDepth(21);

    this.startIntroCinematic();
  }

  startIntroCinematic() {
    const leftStartX = 260;
    const rightStartX = 900;
    const meetX = this.W / 2;
    const meetY = 560;

    this.player.setPosition(leftStartX, meetY).setFlipX(false);
    this.enemy.setPosition(rightStartX, meetY).setFlipX(true);
    this.player.play("ongui_walk", true);
    this.enemy.play("onguienemy_walk", true);
    this.controlsEnabled = false;
    this.aiEnabled = false;

    let aDone = false, bDone = false;
    const impact = () => {
      if (!(aDone && bDone)) return;
      this.hitEmitter.emitParticleAt(meetX, meetY - 40, 36);
      this.cameras.main.shake(220, 0.012);
      this.player.setVelocity(-260, -120);
      this.enemy.setVelocity(260, -120);
      this.player.play("onguiwalk_idle", true);
      this.enemy.play("onguienemy_idle", true);
      this.time.delayedCall(350, () => {
        this.inIntro = false;
        this.controlsEnabled = true;
        this.aiEnabled = true;
        this.invulnUntil = this.time.now + 600;
      });
    };

    this.tweens.add({
      targets: this.player,
      x: meetX - 40,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => { aDone = true; impact(); }
    });

    this.tweens.add({
      targets: this.enemy,
      x: meetX + 40,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => { bDone = true; impact(); }
    });
  }

  onPlayerHit(player, enemy) {
    if (this.inIntro) return;
    this.playerLives = Math.max(0, this.playerLives - 1);

    // Actualiza HUD
    this.registry.set('lives', this.playerLives);

    const dir = (player.x < enemy.x) ? -1 : 1;
    player.setVelocityX(-dir * 260);
    player.setVelocityY(-120);
    player.setTint(0xff5555);
    this.tweens.add({ targets: player, alpha: 0.2, yoyo: true, repeat: 4, duration: 80, onComplete: () => { player.clearTint(); player.setAlpha(1); } });

    this.invulnUntil = this.time.now + this.hitCooldownMs;
    if (this.playerLives <= 0) this.playerDie();
  }

  playerDie() {
    this.controlsEnabled = false;
    this.player.setTint(0x333333);
    this.player.setVelocity(0, -200);
    this.time.delayedCall(1200, () => {
      this.scene.restart();
    });
  }

  updateEnemyHpBar() {
    if (!this.enemy.isAlive()) {
      this.enemyHpBg.setVisible(false);
      this.enemyHpBar.setVisible(false);
      return;
    }
    const w = 60 * (this.enemy.hp / this.enemy.maxHp);
    this.enemyHpBg.setVisible(true).setPosition(this.enemy.x, this.enemy.y - 140);
    this.enemyHpBar.setVisible(true).setPosition(this.enemy.x - (60 - w) / 2, this.enemy.y - 140).setDisplaySize(w, 8);
  }

  update(time, delta) {
    if (this.controlsEnabled) {
      const onFloor = this.player.body.blocked.down || this.player.body.touching.down;
      if (this.cursors.left.isDown) { this.player.setAccelerationX(-1400); this.player.setFlipX(true); }
      else if (this.cursors.right.isDown) { this.player.setAccelerationX(1400); this.player.setFlipX(false); }
      else { this.player.setAccelerationX(0); }
      if (Math.abs(this.player.body.velocity.x) > 300) this.player.body.velocity.x = Phaser.Math.Clamp(this.player.body.velocity.x, -300, 300);

      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && onFloor) {
        this.player.setTexture("ongui");
        this.player.play("salto");
        this.player.setVelocityY(-600);
        this.isJumping = true;
      }

      if (Phaser.Input.Keyboard.JustDown(this.attackKey) && !this.playerAttacking && this.time.now >= this.nextSwing && !this.inIntro) {
        this.playerAttacking = true;
        this.nextSwing = this.time.now + this.attackCooldown;
        const dir = this.player.flipX ? -1 : 1;
        const x = this.player.x + dir * 70;
        const y = this.player.y - 30;
        this.attackBox.setPosition(x, y);
        this.attackBox.body.updateFromGameObject();
        this.time.delayedCall(this.attackDuration, () => { this.playerAttacking = false; });
      }

      if (onFloor) {
        if (this.isJumping) {
          this.isJumping = false;
          this.player.setTexture("ongui_walk");
          if (Math.abs(this.player.body.velocity.x) > 10) {
            if (this.player.anims.currentAnim?.key !== "ongui_walk") this.player.play("ongui_walk", true);
          } else {
            if (this.player.anims.currentAnim?.key !== "onguiwalk_idle") this.player.play("onguiwalk_idle");
          }
        } else {
          if (Math.abs(this.player.body.velocity.x) > 10) {
            if (this.player.anims.currentAnim?.key !== "ongui_walk") this.player.play("ongui_walk", true);
          } else {
            if (this.player.anims.currentAnim?.key !== "onguiwalk_idle") this.player.play("onguiwalk_idle");
          }
        }
      } else {
        if (this.player.anims.currentAnim?.key !== "salto") this.player.play("salto");
      }
    }
    if (this.aiEnabled) this.enemy.update(time, delta);
    this.updateEnemyHpBar();
  }
}

class EnemyFSM extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key, target, cfg = {}) {
    super(scene, x, y, key);
    this.scene = scene;
    this.target = target;
    this.cfg = Object.assign({
      patrolLeft: x - 120, patrolRight: x + 120,
      runSpeed: 100, chaseSpeed: 170,
      viewRange: 320, loseRange: 480,
      attackRange: 64, attackCooldown: 700,
      recoverTime: 300, staggerTime: 250,
      attackDuration: 280
    }, cfg);
    this.state = "IDLE";
    this.dir = -1;
    this.nextAttackAt = 0;
    this.recoverUntil = 0;
    this.staggerUntil = 0;
    this.maxHp = 3;
    this.hp = this.maxHp;
    this.play("onguienemy_idle");
  }

  initPhysics() {
    if (!this.body) this.scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDragX(800);
    if (this.body?.setSize) this.body.setSize(100, 220).setOffset(60, 80);
  }

  setMaxHp(v) { this.maxHp = v; this.hp = v; }
  isAlive() { return this.state !== "DEAD" && this.hp > 0; }

  takeDamage(d) {
    if (!this.isAlive()) return;
    this.hp = Math.max(0, this.hp - d);
    this.setTint(0xffffff);
    this.scene.tweens.add({ targets: this, alpha: 0.3, yoyo: true, repeat: 2, duration: 60, onComplete: () => { this.clearTint(); this.setAlpha(1); } });
    if (this.hp <= 0) {
      this.setState("DEAD");
      this.disableBody(false, false);
      this.setVelocity(0,0);
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 300, onComplete: () => { this.setVisible(false); this.setActive(false); } });
    }
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    switch (s) {
      case "IDLE": this.setVelocityX(0); this.play("onguienemy_idle", true); break;
      case "PATROL":
      case "CHASE": this.play("onguienemy_walk", true); break;
      case "ATTACK":
        this.setVelocityX(0);
        if (this.scene.anims.exists("ongui_enemy_atack")) this.play("ongui_enemy_atack", true);
        else this.play("onguienemy_idle", true);
        break;
      case "RECOVER": this.setVelocityX(0); this.play("onguienemy_idle", true); break;
      case "STAGGER": this.setVelocityX(0); this.play("onguienemy_idle", true); break;
      case "DEAD": this.setVelocity(0,0).setTint(0x555555); break;
    }
  }

  canSeeTarget() {
    const dx = this.target.x - this.x;
    const dy = Math.abs(this.target.y - this.y);
    const dist = Math.hypot(dx, dy);
    return dist <= this.cfg.viewRange && dy < 70;
  }
  targetLost() {
    const dx = this.target.x - this.x;
    const dy = Math.abs(this.target.y - this.y);
    return Math.hypot(dx, dy) > this.cfg.loseRange || dy >= 100;
  }
  inAttackRange() {
    const dx = this.target.x - this.x;
    const dy = Math.abs(this.target.y - this.y);
    const dist = Math.hypot(dx, dy);
    const facingOK = Math.sign(dx) === (this.flipX ? -1 : 1);
    return dist <= this.cfg.attackRange && dy < 50 && facingOK;
  }

  patrolMove() {
    if (this.x <= this.cfg.patrolLeft) this.dir = 1;
    if (this.x >= this.cfg.patrolRight) this.dir = -1;
    this.setVelocityX(this.dir * this.cfg.runSpeed);
    this.setFlipX(this.dir < 0);
  }
  chaseMove() {
    const dx = this.target.x - this.x;
    const dir = Math.sign(dx) || 1;
    this.setVelocityX(dir * this.cfg.chaseSpeed);
    this.setFlipX(dir < 0);
  }

  stagger() {
    if (this.state === "DEAD") return;
    this.staggerUntil = this.scene.time.now + this.cfg.staggerTime;
    this.setState("STAGGER");
    const kb = this.flipX ? 120 : -120;
    this.setVelocityX(kb);
  }

  // ✅ doAttack con "guard timer" y limpieza de listeners
  doAttack(time) {
    if (!this.isAlive()) return;

    this.setState("ATTACK");

    const dir = this.flipX ? -1 : 1;
    this.setVelocityX(dir * (this.cfg.chaseSpeed + 40));

    const attackKeys = ["ongui_enemy_atack", "onguienemy_atack", "enemy_attack"];
    const foundKey = attackKeys.find(k => this.scene.anims.exists(k));

    // Evita listeners acumulados
    this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);

    // Sólo uno (evento o timer) debe terminar el ataque
    let finished = false;
    const endAttack = () => {
      if (finished) return;
      finished = true;
      this.nextAttackAt = time + this.cfg.attackCooldown;
      this.recoverUntil = this.scene.time.now + this.cfg.recoverTime;
      this.setState("RECOVER");
    };

    if (foundKey) this.play(foundKey, true);

    // Si la animación termina (y no es loop), salimos
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, endAttack);

    // Respaldo por si está en loop o no existe
    this.scene.time.delayedCall(this.cfg.attackDuration, endAttack);
  }

  update(time) {
    if (!this.body || this.state === "DEAD") return;
    if (this.state === "STAGGER") { if (time >= this.staggerUntil) this.setState("IDLE"); return; }
    if (this.state === "RECOVER") { if (time >= this.recoverUntil) this.setState("IDLE"); return; }

    switch (this.state) {
      case "IDLE":
        if (this.canSeeTarget()) this.setState("CHASE"); else this.setState("PATROL");
        break;
      case "PATROL":
        if (this.canSeeTarget()) { this.setState("CHASE"); break; }
        this.patrolMove();
        break;
      case "CHASE":
        if (this.targetLost()) { this.setState("PATROL"); break; }
        if (this.inAttackRange() && time >= this.nextAttackAt) this.doAttack(time);
        else this.chaseMove();
        break;
      case "ATTACK":
        break;
    }
  }
}

export default FondoArbol;
