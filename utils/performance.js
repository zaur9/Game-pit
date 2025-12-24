/**
 * Утилиты для оптимизации производительности
 */

/**
 * Object Pool - переиспользование объектов для уменьшения GC
 */
export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = new Set();
    
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
    this.active.add(obj);
    return obj;
  }

  /**
   * Вернуть объект в пул
   */
  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.pool.push(obj);
    }
  }

  /**
   * Освободить все активные объекты
   */
  releaseAll() {
    this.active.forEach(obj => {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.pool.push(obj);
    });
    this.active.clear();
  }

  /**
   * Очистить пул
   */
  clear() {
    this.pool = [];
    this.active.clear();
  }
}

/**
 * Throttle - ограничение частоты вызовов функции
 */
export function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = performance.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * Debounce - задержка выполнения функции
 */
export function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Batch DOM updates - группировка обновлений DOM
 */
export class DOMBatcher {
  constructor() {
    this.updates = [];
    this.scheduled = false;
  }

  /**
   * Добавить обновление в очередь
   */
  add(updateFn) {
    this.updates.push(updateFn);
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  /**
   * Выполнить все обновления
   */
  flush() {
    const updates = this.updates;
    this.updates = [];
    this.scheduled = false;
    
    updates.forEach(update => {
      try {
        update();
      } catch (error) {
        console.error('Error in batched DOM update:', error);
      }
    });
  }
}

/**
 * Измерение производительности
 */
export class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = [];
  }

  /**
   * Начать измерение
   */
  mark(name) {
    this.marks.set(name, performance.now());
  }

  /**
   * Завершить измерение
   */
  measure(name, startMark) {
    const start = this.marks.get(startMark);
    if (start) {
      const duration = performance.now() - start;
      this.measures.push({ name, duration });
      return duration;
    }
    return null;
  }

  /**
   * Получить статистику
   */
  getStats() {
    return this.measures;
  }

  /**
   * Очистить измерения
   */
  clear() {
    this.marks.clear();
    this.measures = [];
  }
}

