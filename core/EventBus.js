/**
 * EventBus - централизованная система событий для коммуникации между модулями
 * Оптимизирована для производительности
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * Подписаться на событие
   * @param {string} event - название события
   * @param {Function} callback - функция-обработчик
   * @returns {Function} функция для отписки
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Возвращаем функцию для отписки
    return () => this.off(event, callback);
  }

  /**
   * Подписаться на событие один раз
   */
  once(event, callback) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event).add(callback);
  }

  /**
   * Отписаться от события
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    if (this.onceListeners.has(event)) {
      this.onceListeners.get(event).delete(callback);
    }
  }

  /**
   * Отправить событие
   * @param {string} event - название события
   * @param {*} data - данные события
   */
  emit(event, data = null) {
    // Обрабатываем обычные подписчики
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    // Обрабатываем одноразовые подписчики
    if (this.onceListeners.has(event)) {
      const callbacks = Array.from(this.onceListeners.get(event));
      this.onceListeners.get(event).clear();
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in once event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Очистить все подписки
   */
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
  }
}

// Создаем глобальный экземпляр
export const eventBus = new EventBus();

