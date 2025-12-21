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

    // Somnia - загружаем SVG логотип
    const somniaSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 25 24' fill='none'%3E%3Cpath d='M12.0224 3.58728C12.0281 3.35631 12.3279 3.27146 12.4561 3.46284C14.0002 5.76973 16.6294 7.28848 19.6139 7.28848C20.7329 7.28848 21.8019 7.07448 22.7823 6.68607C20.8309 2.74069 16.7745 0.0227692 12.0809 0.000143355C5.4924 -0.0319099 0.0747474 5.31532 0.0228993 11.9041C0.0125297 13.2249 0.216151 14.4976 0.600769 15.6883C3.43639 15.4536 6.2079 14.2525 8.37704 12.0823C10.73 9.72924 11.9451 6.67004 12.0224 3.58728Z' fill='url(%23paint0_linear_728_4516)'/%3E%3Cpath d='M11.9651 23.9999C18.5526 24.031 23.9694 18.6866 24.0222 12.0987C24.0325 10.7779 23.8289 9.50616 23.4452 8.31548C20.6087 8.55022 17.8381 9.75127 15.668 11.9215C13.315 14.2745 12.1008 17.3337 12.0235 20.4165C12.0179 20.6475 11.7181 20.7323 11.5899 20.5409C10.0458 18.2341 7.41658 16.7153 4.43201 16.7153C3.31398 16.7153 2.24496 16.9284 1.26456 17.3168C3.21688 21.2603 7.27235 23.9772 11.9651 23.9999Z' fill='url(%23paint1_linear_728_4516)'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear_728_4516' x1='22.7823' y1='0' x2='9.57872' y2='18.4678' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%234B1BF9'/%3E%3Cstop offset='1' stop-color='%233ECCEE'/%3E%3C/linearGradient%3E%3ClinearGradient id='paint1_linear_728_4516' x1='24.0225' y1='8.31547' x2='10.8228' y2='26.7809' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23F20A49'/%3E%3Cstop offset='0.52' stop-color='%23C119E7'/%3E%3Cstop offset='1' stop-color='%234675F3'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";
    
    const somniaImg = new Image();
    somniaImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      somniaImg.onload = () => {
        const somniaCanvas = document.createElement('canvas');
        somniaCanvas.width = this.game.SPRITE_SIZE;
        somniaCanvas.height = this.game.SPRITE_SIZE;
        const somniaCtx = somniaCanvas.getContext('2d');
        
        // Рисуем SVG на canvas с правильным размером
        somniaCtx.drawImage(somniaImg, 0, 0, somniaCanvas.width, somniaCanvas.height);
        
        this.emojiSprites.set('somnia', {
          canvas: somniaCanvas,
          width: somniaCanvas.width,
          height: somniaCanvas.height
        });
        
        resolve();
      };
      somniaImg.onerror = reject;
      somniaImg.src = somniaSVG;
    });

    this.emojiLoaded = true;
  }

  /**
   * Рендеринг игрового поля на Canvas
   */
  render() {
    if (!this.game.ctx || !this.emojiLoaded) return;
    
    // Оптимизация: рендерим только если нужно (но всегда для анимаций)
    // Для анимаций (бомбы, flash) нужно рендерить каждый кадр
    const hasAnimatedEffects = this.game.flashEffects.length > 0 || 
                                this.game.explosionEffects.length > 0 ||
                                this.game.objects.some(obj => obj.type === 'bomb');

    // Кэшируем Date.now() один раз за кадр
    const now = Date.now();
    const pulseValue = Math.sin(now / 200) * 0.3 + 0.7;

    // Очистка Canvas
    this.game.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    // Оптимизация: сортируем только если объектов много и только при необходимости
    const objects = this.game.objects;
    const needsSort = objects.length > 10;
    if (needsSort) {
      // Сортируем in-place для экономии памяти
      objects.sort((a, b) => a.y - b.y);
    }
    
    // Оптимизация: предварительно считаем количество бомб для оптимизации
    let bombCount = 0;
    for (const obj of objects) {
      if (obj.type === 'bomb') bombCount++;
    }
    
    // Группируем объекты по типу для батчинга эффектов (только если есть бомбы)
    const bombs = bombCount > 0 ? [] : null;
    const regular = [];
    
    for (const obj of objects) {
      if (obj.type === 'bomb' && bombs) {
        bombs.push(obj);
      } else {
        // Somnia теперь рендерится как обычный объект без эффектов
        regular.push(obj);
      }
    }
    
    // Рендерим обычные объекты (включая Somnia без эффектов)
    for (const obj of regular) {
      const sprite = this.emojiSprites.get(obj.type);
      if (sprite && sprite.canvas) {
        const x = obj.x - sprite.width / 2;
        const y = obj.y - sprite.height / 2;
        this.game.ctx.drawImage(sprite.canvas, x, y);
      }
    }
    
    // Рендерим бомбы с пульсацией (используем кэшированное значение)
    // Оптимизация: shadowBlur очень дорогая операция, используем только для видимых бомб
    if (bombs && bombs.length > 0) {
      this.game.ctx.save();
      // Прозрачность убрана - бомба полностью непрозрачна
      // Оптимизация: уменьшаем shadowBlur для лучшей производительности
      this.game.ctx.shadowBlur = 15; // Уменьшено с 25 для производительности
      this.game.ctx.shadowColor = 'rgba(255, 40, 40, 0.9)';
      this.game.ctx.fillStyle = 'rgba(255, 40, 40, 0.3)';
      
      for (const obj of bombs) {
        const sprite = this.emojiSprites.get(obj.type);
        if (sprite && sprite.canvas) {
          const x = obj.x - sprite.width / 2;
          const y = obj.y - sprite.height / 2;
          this.game.ctx.drawImage(sprite.canvas, x, y);
        }
        // Оптимизация: рисуем круг только если бомба видна на экране
        if (obj.y > -this.game.SPRITE_SIZE && obj.y < window.innerHeight + this.game.SPRITE_SIZE) {
          this.game.ctx.beginPath();
          this.game.ctx.arc(obj.x, obj.y, this.game.OBJECT_SIZE / 2 + 5, 0, Math.PI * 2);
          this.game.ctx.fill();
        }
      }
      this.game.ctx.restore();
    }

    // Flash эффекты (временные вспышки при клике)
    // Оптимизация: рендерим только активные flash эффекты и ограничиваем их количество
    if (this.game.flashEffects.length > 0) {
      this.game.ctx.save();
      for (const flash of this.game.flashEffects) {
        if (flash.life > 0) {
          const alpha = Math.min(flash.life / 250, 1);
          const size = ((250 - flash.life) / 250) * 80;
          
          // Оптимизация: пропускаем слишком маленькие или невидимые эффекты
          if (size < 1 || alpha < 0.01) continue;
          
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
        }
      }
      this.game.ctx.restore();
    }

    // Эффекты взрыва (при клике на бомбе)
    for (const explosion of this.game.explosionEffects) {
      if (explosion.life > 0) {
        const alpha = Math.min(explosion.life / explosion.maxLife, 1);
        const progress = 1 - (explosion.life / explosion.maxLife);
        
        // Центральная вспышка взрыва
        const centerX = explosion.x + Math.cos(explosion.angle) * explosion.size * 0.3;
        const centerY = explosion.y + Math.sin(explosion.angle) * explosion.size * 0.3;
        
        // Основной огненный шар
        this.game.ctx.save();
        this.game.ctx.globalAlpha = alpha * 0.8;
        const gradient = this.game.ctx.createRadialGradient(
          explosion.x, explosion.y, 0,
          explosion.x, explosion.y, explosion.size * 0.5
        );
        gradient.addColorStop(0, 'rgba(255, 200, 0, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 40, 40, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 40, 40, 0)');
        this.game.ctx.fillStyle = gradient;
        this.game.ctx.beginPath();
        this.game.ctx.arc(explosion.x, explosion.y, explosion.size * 0.5, 0, Math.PI * 2);
        this.game.ctx.fill();
        
        // Частицы взрыва (летящие искры)
        this.game.ctx.globalAlpha = alpha;
        this.game.ctx.fillStyle = `rgba(255, ${200 - progress * 100}, 0, ${alpha})`;
        this.game.ctx.beginPath();
        this.game.ctx.arc(centerX, centerY, 3 + progress * 5, 0, Math.PI * 2);
        this.game.ctx.fill();
        
        // Дополнительные искры
        for (let i = 0; i < 3; i++) {
          const sparkAngle = explosion.angle + (Math.random() - 0.5) * 0.5;
          const sparkDist = explosion.size * (0.3 + Math.random() * 0.4);
          const sparkX = explosion.x + Math.cos(sparkAngle) * sparkDist;
          const sparkY = explosion.y + Math.sin(sparkAngle) * sparkDist;
          
          this.game.ctx.globalAlpha = alpha * 0.6;
          this.game.ctx.fillStyle = `rgba(255, ${150 - progress * 50}, 0, ${alpha * 0.8})`;
          this.game.ctx.beginPath();
          this.game.ctx.arc(sparkX, sparkY, 2 + progress * 3, 0, Math.PI * 2);
          this.game.ctx.fill();
        }
        
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

