/**
 * ObjectPool - пул объектов для переиспользования
 * Исключает GC паузы от splice/shift
 */
export class ObjectPool {
  constructor(createFn, initialSize = 50) {
    this.createFn = createFn;
    this.pool = [];
    this.active = [];
    this.activeCount = 0;
    
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
      // Если пул пуст, создаем новый объект
      obj = this.createFn();
    }
    
    obj.active = true;
    this.active.push(obj);
    this.activeCount++;
    return obj;
  }
  
  /**
   * Вернуть объект в пул
   */
  release(obj) {
    if (!obj) return;
    obj.active = false;
    // Очищаем свойства объекта
    for (const key in obj) {
      if (key !== 'active') {
        delete obj[key];
      }
    }
    this.pool.push(obj);
    this.activeCount--;
  }
  
  /**
   * Освободить все активные объекты
   */
  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.release(this.active[i]);
    }
    this.active.length = 0;
    this.activeCount = 0;
  }
  
  /**
   * Получить все активные объекты
   */
  getActive() {
    // Очищаем неактивные объекты из массива
    let writeIndex = 0;
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i].active) {
        if (writeIndex !== i) {
          this.active[writeIndex] = this.active[i];
        }
        writeIndex++;
      } else {
        // Объект неактивен, возвращаем в пул
        this.pool.push(this.active[i]);
      }
    }
    this.active.length = writeIndex;
    this.activeCount = writeIndex;
    return this.active;
  }
  
  /**
   * Количество активных объектов
   */
  getActiveCount() {
    return this.activeCount;
  }
}

