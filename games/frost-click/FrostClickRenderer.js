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
    
    // Кэшируем Date.now() один раз за кадр
    const now = Date.now();
    const pulseValue = Math.sin(now / 200) * 0.3 + 0.7;
    
    // Кэшируем размеры экрана для оптимизации проверок видимости
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const spriteSize = this.game.SPRITE_SIZE;
    const halfSpriteSize = spriteSize / 2;
    const minY = -spriteSize;
    const maxY = screenHeight + spriteSize;
    const minX = -spriteSize;
    const maxX = screenWidth + spriteSize;

    // Очистка Canvas
    this.game.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    // Оптимизация: сортируем только если объектов много и только при необходимости
    // И только если изменился порядок (проверяем по первому и последнему объекту)
    const objects = this.game.objects;
    const objCount = objects.length;
    
    // Оптимизация: сортируем только если нужно (проверяем, отсортирован ли массив)
    if (objCount > 10) {
      let needsSort = false;
      // Быстрая проверка: если первый объект выше последнего, нужна сортировка
      if (objCount > 1 && objects[0].y > objects[objCount - 1].y) {
        needsSort = true;
      }
      if (needsSort) {
        objects.sort((a, b) => a.y - b.y);
      }
    }
    
    // Оптимизация: используем предварительно выделенные массивы (переиспользование памяти)
    // Очищаем массивы вместо создания новых
    if (!this._visibleObjects) {
      this._visibleObjects = [];
      this._visibleBombs = [];
    } else {
      this._visibleObjects.length = 0;
      this._visibleBombs.length = 0;
    }
    
    // Фильтруем только видимые объекты (оптимизация рендеринга)
    // Оптимизация: используем более быстрые проверки
    for (let i = 0; i < objCount; i++) {
      const obj = objects[i];
      const objY = obj.y;
      const objX = obj.x;
      
      // Оптимизация: быстрая проверка видимости (избегаем лишних проверок)
      if (objY > minY && objY < maxY && objX > minX && objX < maxX) {
        if (obj.type === 'bomb') {
          this._visibleBombs.push(obj);
        } else {
          this._visibleObjects.push(obj);
        }
      }
    }
    
    // Рендерим обычные объекты (включая Somnia без эффектов) - только видимые
    const visibleCount = this._visibleObjects.length;
    for (let i = 0; i < visibleCount; i++) {
      const obj = this._visibleObjects[i];
      const sprite = this.emojiSprites.get(obj.type);
      if (sprite && sprite.canvas) {
        // Кэшируем вычисления позиции
        this.game.ctx.drawImage(sprite.canvas, obj.x - halfSpriteSize, obj.y - halfSpriteSize);
      }
    }
    
    // Рендерим бомбы с пульсацией (используем кэшированное значение) - только видимые
    const bombCount = this._visibleBombs.length;
    if (bombCount > 0) {
      this.game.ctx.save();
      // Прозрачность убрана - бомба полностью непрозрачна
      // Оптимизация: уменьшаем shadowBlur для лучшей производительности
      this.game.ctx.shadowBlur = 15; // Уменьшено с 25 для производительности
      this.game.ctx.shadowColor = 'rgba(255, 40, 40, 0.9)';
      this.game.ctx.fillStyle = 'rgba(255, 40, 40, 0.3)';
      
      const bombRadius = this.game.OBJECT_SIZE / 2 + 5;
      for (let i = 0; i < bombCount; i++) {
        const obj = this._visibleBombs[i];
        const sprite = this.emojiSprites.get(obj.type);
        if (sprite && sprite.canvas) {
          this.game.ctx.drawImage(sprite.canvas, obj.x - halfSpriteSize, obj.y - halfSpriteSize);
        }
        // Рисуем круг свечения (объект уже проверен на видимость)
        this.game.ctx.beginPath();
        this.game.ctx.arc(obj.x, obj.y, bombRadius, 0, Math.PI * 2);
        this.game.ctx.fill();
      }
      this.game.ctx.restore();
    }

    // Flash эффекты (временные вспышки при клике)
    // Оптимизация: рендерим только активные flash эффекты и ограничиваем их количество
    const flashCount = this.game.flashEffects.length;
    if (flashCount > 0) {
      this.game.ctx.save();
      // Кэшируем константы для вычислений
      const maxLife = 250;
      const maxSize = 80;
      const invMaxLife = 1 / maxLife;
      
      for (let i = 0; i < flashCount; i++) {
        const flash = this.game.flashEffects[i];
        if (flash.life > 0) {
          const lifeRatio = flash.life * invMaxLife; // Оптимизация: умножение вместо деления
          const alpha = lifeRatio; // lifeRatio уже <= 1
          const size = (1 - lifeRatio) * maxSize;
          
          // Оптимизация: пропускаем слишком маленькие или невидимые эффекты
          if (size < 1 || alpha < 0.01) continue;
          
          // Оптимизация: проверка видимости flash эффекта
          const flashX = flash.x;
          const flashY = flash.y;
          if (flashX < -size || flashX > maxX ||
              flashY < -size || flashY > maxY) {
            continue; // Пропускаем невидимые эффекты
          }
          
          this.game.ctx.globalAlpha = alpha;
          // Оптимизация: переиспользуем градиент если возможно, иначе создаем новый
          if (!flash._gradient || flash._size !== size) {
            flash._gradient = this.game.ctx.createRadialGradient(
              flashX, flashY, 0,
              flashX, flashY, size
            );
            flash._gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
            flash._gradient.addColorStop(0.5, 'rgba(77, 255, 204, 0.5)');
            flash._gradient.addColorStop(1, 'rgba(77, 255, 204, 0)');
            flash._size = size;
          }
          this.game.ctx.fillStyle = flash._gradient;
          this.game.ctx.beginPath();
          this.game.ctx.arc(flashX, flashY, size, 0, Math.PI * 2);
          this.game.ctx.fill();
        }
      }
      this.game.ctx.restore();
    }

    // Эффекты взрыва (при клике на бомбе)
    const explosionCount = this.game.explosionEffects.length;
    if (explosionCount > 0) {
      this.game.ctx.save();
      
      for (let i = 0; i < explosionCount; i++) {
        const explosion = this.game.explosionEffects[i];
        if (explosion.life > 0) {
          const invMaxLife = 1 / explosion.maxLife;
          const alpha = explosion.life * invMaxLife; // Уже <= 1
          const progress = 1 - alpha;
          
          const expX = explosion.x;
          const expY = explosion.y;
          const expSize = explosion.size;
          const expAngle = explosion.angle;
          
          // Центральная вспышка взрыва (кэшируем вычисления)
          const cosAngle = Math.cos(expAngle);
          const sinAngle = Math.sin(expAngle);
          const centerX = expX + cosAngle * expSize * 0.3;
          const centerY = expY + sinAngle * expSize * 0.3;
          
          // Основной огненный шар
          // Оптимизация: переиспользуем градиент
          if (!explosion._gradient || explosion._size !== expSize) {
            explosion._gradient = this.game.ctx.createRadialGradient(
              expX, expY, 0,
              expX, expY, expSize * 0.5
            );
            explosion._gradient.addColorStop(0, 'rgba(255, 200, 0, 1)');
            explosion._gradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.8)');
            explosion._gradient.addColorStop(0.6, 'rgba(255, 40, 40, 0.6)');
            explosion._gradient.addColorStop(1, 'rgba(255, 40, 40, 0)');
            explosion._size = expSize;
          }
          
          this.game.ctx.globalAlpha = alpha * 0.8;
          this.game.ctx.fillStyle = explosion._gradient;
          this.game.ctx.beginPath();
          this.game.ctx.arc(expX, expY, expSize * 0.5, 0, Math.PI * 2);
          this.game.ctx.fill();
          
          // Частицы взрыва (летящие искры)
          this.game.ctx.globalAlpha = alpha;
          // Оптимизация: кэшируем цвет
          const sparkColor = `rgba(255, ${200 - Math.floor(progress * 100)}, 0, ${alpha})`;
          this.game.ctx.fillStyle = sparkColor;
          this.game.ctx.beginPath();
          this.game.ctx.arc(centerX, centerY, 3 + progress * 5, 0, Math.PI * 2);
          this.game.ctx.fill();
          
          // Дополнительные искры (оптимизация: меньше искр или кэшируем позиции)
          // Оптимизация: используем предвычисленные углы вместо Math.random каждый кадр
          if (!explosion._sparks) {
            explosion._sparks = [];
            for (let j = 0; j < 3; j++) {
              explosion._sparks.push({
                angle: expAngle + (Math.random() - 0.5) * 0.5,
                dist: 0.3 + Math.random() * 0.4
              });
            }
          }
          
          for (let j = 0; j < 3; j++) {
            const spark = explosion._sparks[j];
            const sparkDist = expSize * spark.dist;
            const sparkX = expX + Math.cos(spark.angle) * sparkDist;
            const sparkY = expY + Math.sin(spark.angle) * sparkDist;
            
            this.game.ctx.globalAlpha = alpha * 0.6;
            this.game.ctx.fillStyle = `rgba(255, ${150 - Math.floor(progress * 50)}, 0, ${alpha * 0.8})`;
            this.game.ctx.beginPath();
            this.game.ctx.arc(sparkX, sparkY, 2 + progress * 3, 0, Math.PI * 2);
            this.game.ctx.fill();
          }
        }
      }
      this.game.ctx.restore();
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

