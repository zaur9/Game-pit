/**
 * Pool - object pool для нулевого GC
 * Переиспользование объектов вместо создания/удаления
 */
export class Pool {
  constructor(createFn, size = 32) {
    this.items = [];
    for (let i = 0; i < size; i++) {
      this.items.push(createFn());
    }
  }

  /**
   * Получить свободный объект из пула
   */
  get() {
    return this.items.find(o => !o.active) || null;
  }

  /**
   * Итерация только по активным объектам
   */
  forEach(fn) {
    for (const o of this.items) {
      if (o.active) fn(o);
    }
  }

  /**
   * Количество активных объектов
   */
  getActiveCount() {
    let count = 0;
    for (const o of this.items) {
      if (o.active) count++;
    }
    return count;
  }

  /**
   * Освободить все объекты
   */
  releaseAll() {
    for (const o of this.items) {
      o.active = false;
    }
  }
}

