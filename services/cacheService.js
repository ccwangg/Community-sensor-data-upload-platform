/**
 * 快取服務 (Cache Service)
 * 使用記憶體快取減少資料庫讀取次數，提升回應速度
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * 獲取快取值
   * @param {string} key - 快取鍵
   * @returns {any|null} 快取值或 null
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (item) {
      // 檢查是否過期
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }
      this.stats.hits++;
      return item.value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * 設置快取值
   * @param {string} key - 快取鍵
   * @param {any} value - 快取值
   * @param {number} ttl - 存活時間（毫秒），預設 5 分鐘
   */
  set(key, value, ttl = 5 * 60 * 1000) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    this.stats.sets++;
  }

  /**
   * 刪除快取值
   * @param {string} key - 快取鍵
   */
  delete(key) {
    if (this.cache.delete(key)) {
      this.stats.deletes++;
    }
  }

  /**
   * 清空所有快取
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * 獲取快取統計
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
      totalRequests: total
    };
  }

  /**
   * 清理過期項目（定期執行）
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * 生成快取鍵
   * @param {string} prefix - 前綴
   * @param {Object} params - 參數物件
   * @returns {string} 快取鍵
   */
  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams || 'default'}`;
  }
}

// 單例模式
const cacheService = new CacheService();

// 定期清理過期項目（每 5 分鐘）
setInterval(() => {
  const cleaned = cacheService.cleanup();
  if (cleaned > 0) {
    console.log(`🧹 快取清理: 刪除 ${cleaned} 個過期項目`);
  }
}, 5 * 60 * 1000);

module.exports = cacheService;

