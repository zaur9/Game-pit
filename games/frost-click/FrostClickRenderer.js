/**
 * FrostClickRenderer - модуль рендеринга для Frost Click
 * Отвечает за загрузку спрайтов и отрисовку на Canvas
 */
export class FrostClickRenderer {
  constructor(game) {
    this.game = game;
    this.emojiSprites = new Map();
    this.emojiLoaded = false;
  }

  /**
   * Предзагрузка emoji как спрайтов для быстрого рендеринга
   * Используем Canvas элементы вместо ImageData для правильной композиции
   */
  async loadEmojiSprites() {
    const emojis = {
      'snow': '❄️',
      'bomb': '💣',
      'gift': '🎁',
      'ice': '🧊'
    };

    // Создаем временный canvas для рендеринга emoji
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.game.OBJECT_SIZE * 2;
    tempCanvas.height = this.game.OBJECT_SIZE * 2;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${this.game.OBJECT_SIZE * 1.5}px Arial`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';

    for (const [key, emoji] of Object.entries(emojis)) {
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.fillText(emoji, tempCanvas.width / 2, tempCanvas.height / 2);
      
      // Создаем новый canvas для каждого спрайта (для правильной композиции)
      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = tempCanvas.width;
      spriteCanvas.height = tempCanvas.height;
      const spriteCtx = spriteCanvas.getContext('2d');
      spriteCtx.drawImage(tempCanvas, 0, 0);
      
      // Сохраняем Canvas элемент вместо ImageData
      this.emojiSprites.set(key, {
        canvas: spriteCanvas,
        width: spriteCanvas.width,
        height: spriteCanvas.height
      });
    }

    // Somnia - специальный спрайт (градиентный круг)
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    const gradient = tempCtx.createRadialGradient(
      tempCanvas.width / 2, tempCanvas.height / 2, 0,
      tempCanvas.width / 2, tempCanvas.height / 2, tempCanvas.width / 2
    );
    gradient.addColorStop(0, '#4B1BF9');
    gradient.addColorStop(0.5, '#3ECCEE');
    gradient.addColorStop(1, '#F20A49');
    tempCtx.fillStyle = gradient;
    tempCtx.beginPath();
    tempCtx.arc(tempCanvas.width / 2, tempCanvas.height / 2, tempCanvas.width / 2 - 2, 0, Math.PI * 2);
    tempCtx.fill();
    
    const somniaCanvas = document.createElement('canvas');
    somniaCanvas.width = tempCanvas.width;
    somniaCanvas.height = tempCanvas.height;
    const somniaCtx = somniaCanvas.getContext('2d');
    somniaCtx.drawImage(tempCanvas, 0, 0);
    
    this.emojiSprites.set('somnia', {
      canvas: somniaCanvas,
      width: somniaCanvas.width,
      height: somniaCanvas.height
    });

    this.emojiLoaded = true;
  }

  /**
   * Рендеринг игрового поля на Canvas
   */
  render() {
    if (!this.game.ctx || !this.emojiLoaded) return;

    // Очистка Canvas
    this.game.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    // Рендеринг всех объектов (сортируем по Y для правильного порядка)
    const sortedObjects = [...this.game.objects].sort((a, b) => a.y - b.y);
    
    for (const obj of sortedObjects) {
      const sprite = this.emojiSprites.get(obj.type);
      if (sprite && sprite.canvas) {
        // Используем drawImage вместо putImageData для правильной композиции
        const x = obj.x - sprite.width / 2;
        const y = obj.y - sprite.height / 2;
        this.game.ctx.drawImage(sprite.canvas, x, y);
      }

      // Дополнительные эффекты для бомб (пульсация и свечение)
      if (obj.type === 'bomb') {
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        this.game.ctx.save();
        this.game.ctx.globalAlpha = pulse * 0.5;
        this.game.ctx.shadowBlur = 25;
        this.game.ctx.shadowColor = 'rgba(255, 40, 40, 0.9)';
        this.game.ctx.beginPath();
        this.game.ctx.arc(obj.x, obj.y, this.game.OBJECT_SIZE / 2 + 5, 0, Math.PI * 2);
        this.game.ctx.fillStyle = 'rgba(255, 40, 40, 0.3)';
        this.game.ctx.fill();
        this.game.ctx.restore();
      }

      // Эффект свечения для Somnia
      if (obj.type === 'somnia') {
        this.game.ctx.save();
        this.game.ctx.globalAlpha = 0.6;
        this.game.ctx.shadowBlur = 15;
        this.game.ctx.shadowColor = 'rgba(78, 145, 255, 0.8)';
        this.game.ctx.beginPath();
        this.game.ctx.arc(obj.x, obj.y, this.game.OBJECT_SIZE / 2 + 3, 0, Math.PI * 2);
        this.game.ctx.fillStyle = 'rgba(78, 145, 255, 0.2)';
        this.game.ctx.fill();
        this.game.ctx.restore();
      }
    }

    // Flash эффекты (временные вспышки при клике)
    for (const flash of this.game.flashEffects) {
      if (flash.life > 0) {
        const alpha = Math.min(flash.life / 250, 1);
        const size = ((250 - flash.life) / 250) * 80;
        this.game.ctx.save();
        this.game.ctx.globalAlpha = alpha;
        const gradient = this.game.ctx.createRadialGradient(
          flash.x, flash.y, 0,
          flash.x, flash.y, size
        );
        gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(77, 255, 204, 0.5)');
        gradient.addColorStop(1, 'rgba(77, 255, 204, 0)');
        this.game.ctx.fillStyle = gradient;
        this.game.ctx.beginPath();
        this.game.ctx.arc(flash.x, flash.y, size, 0, Math.PI * 2);
        this.game.ctx.fill();
        this.game.ctx.restore();
      }
    }

    // Freeze overlay (если активен)
    if (this.game.isFrozen) {
      this.game.ctx.fillStyle = 'rgba(200, 240, 255, 0.3)';
      this.game.ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    }
  }

  /**
   * Получить спрайт по типу
   */
  getSprite(type) {
    return this.emojiSprites.get(type);
  }

  /**
   * Проверка загрузки спрайтов
   */
  isLoaded() {
    return this.emojiLoaded;
  }
}

