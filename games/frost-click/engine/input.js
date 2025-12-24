/**
 * Input - универсальный pointer events handler
 * Работает с mouse и touch
 */
export function initInput(canvas, handler) {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    handler(x, y);
  });
}

