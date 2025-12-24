/**
 * Engine - фиксированный FPS RAF цикл
 * Для стабильной работы на слабых устройствах
 */
export class Engine {
  constructor(update, render, fps = 30) {
    this.update = update;
    this.render = render;
    this.running = false;

    this.last = 0;
    this.acc = 0;
    this.step = 1000 / fps; // миллисекунды на шаг
  }

  start() {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  loop = (now) => {
    if (!this.running) return;

    let delta = now - this.last;
    this.last = now;
    this.acc += delta;

    // Update фиксированным шагом (fixed timestep)
    while (this.acc >= this.step) {
      this.update(this.step / 1000); // конвертируем в секунды
      this.acc -= this.step;
    }

    // Render один раз за кадр
    this.render();
    requestAnimationFrame(this.loop);
  };
}

