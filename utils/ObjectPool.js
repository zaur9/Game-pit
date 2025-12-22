/**
 * ObjectPool - оптимизированный пул объектов
 * Исключает GC паузы, сохраняет hidden classes V8
 */
export class ObjectPool {
  constructor(createFn, initialSize = 50) {
    this.createFn = createFn;
    this.pool = [];
    this.active = [];
    this._needsCompact = false;
    
    // Счётчики по типам для быстрого доступа
    this.typeCounts = {
      snow: 0,
      bomb: 0,
      gift: 0,
      ice: 0,
      somnia: 0
    };
    
    // Предзаполняем пул
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  /**
   * Получить объект из пула
   */
  acquire() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFn();
    }
    
    // НЕ удаляем свойства - сохраняем hidden class
    obj.active = true;
    this.active.push(obj);
    return obj;
  }
  
  /**
   * Инициализировать объект (после acquire)
   */
  init(obj, type, x, y, speed) {
    obj.type = type;
    obj.x = x;
    obj.y = y;
    obj.speed = speed;
    
    // Обновляем счётчик типа
    if (this.typeCounts[type] !== undefined) {
      this.typeCounts[type]++;
    }
  }
  
  /**
   * Вернуть объект в пул
   */
  release(obj) {
    if (!obj || !obj.active) return;
    
    // Обновляем счётчик типа
    if (obj.type && this.typeCounts[obj.type] !== undefined) {
      this.typeCounts[obj.type]--;
    }
    
    // НЕ удаляем свойства - просто сбрасываем в дефолт
    obj.active = false;
    obj.type = 'snow';
    obj.x = 0;
    obj.y = 0;
    obj.speed = 0;
    
    this.pool.push(obj);
    this._needsCompact = true;
  }
  
  /**
   * Освободить все активные объекты
   */
  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (obj.active) {
        obj.active = false;
        obj.type = 'snow';
        obj.x = 0;
        obj.y = 0;
        obj.speed = 0;
        this.pool.push(obj);
      }
    }
    this.active.length = 0;
    this._needsCompact = false;
    
    // Сбрасываем счётчики
    for (const key in this.typeCounts) {
      this.typeCounts[key] = 0;
    }
  }
  
  /**
   * Компактификация массива активных объектов
   * Вызывать только когда нужно (не каждый кадр)
   */
  compact() {
    if (!this._needsCompact) return;
    
    let writeIndex = 0;
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i].active) {
        if (writeIndex !== i) {
          this.active[writeIndex] = this.active[i];
        }
        writeIndex++;
      }
    }
    this.active.length = writeIndex;
    this._needsCompact = false;
  }
  
  /**
   * Получить все активные объекты (без компактификации)
   */
  getActive() {
    return this.active;
  }
  
  /**
   * Количество активных объектов
   */
  getActiveCount() {
    // Компактифицируем только при запросе точного количества
    this.compact();
    return this.active.length;
  }
  
  /**
   * Проверить есть ли объекты типа
   */
  hasType(type) {
    return this.typeCounts[type] > 0;
  }
  
  /**
   * Получить количество объектов типа
   */
  getTypeCount(type) {
    return this.typeCounts[type] || 0;
  }
}
