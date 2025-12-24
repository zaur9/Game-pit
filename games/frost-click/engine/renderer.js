/**
 * Renderer - canvas с фиксированным разрешением
 * Для снижения нагрузки на слабые устройства
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Фиксированное внутреннее разрешение (mobile-first)
    this.W = 360;
    this.H = 640;

    // Устанавливаем внутреннее разрешение
    canvas.width = this.W;
    canvas.height = this.H;

    // CSS масштабирование для любого экрана
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated'; // для четкости на масштабе

    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = '#05070c';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  drawImage(img, x, y, w, h) {
    this.ctx.drawImage(img, x, y, w, h);
  }

  drawCircle(x, y, r, color) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  // Для эффектов - простые круги без градиентов
  drawEffect(x, y, size, alpha, color) {
    if (size <= 0 || alpha <= 0) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

