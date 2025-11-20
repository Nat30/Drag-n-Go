/**
 * 拖拽即走 Chrome 插件 - 通用工具类
 * 提供设置管理、日志记录等通用功能
 */

/**
 * 设置管理器
 */
class SettingsManager {
    // 静态缓存属性
    static _cache = null;
    static _cacheTimestamp = 0;
    static _cacheTimeout = 30000; // 30秒缓存
    static _isLoading = false;
    
    /**
     * 检查缓存是否有效
     */
    static isCacheValid() {
        return this._cache && 
               (Date.now() - this._cacheTimestamp) < this._cacheTimeout;
    }
    
    /**
     * 清除缓存
     */
    static clearCache() {
        this._cache = null;
        this._cacheTimestamp = 0;
    }
    
    /**
     * 加载设置
     * @param {Array} keys - 要加载的设置键
     * @param {Object} defaultValues - 默认值
     * @returns {Object} 设置对象
     */
    static async loadSettings(keys, defaultValues = {}) {
        // 如果缓存有效，直接返回缓存的数据
        if (this.isCacheValid()) {
            const cachedResult = { ...defaultValues };
            keys.forEach(key => {
                if (this._cache && this._cache.hasOwnProperty(key)) {
                    cachedResult[key] = this._cache[key];
                }
            });
            return cachedResult;
        }
        
        // 防止并发加载
        if (this._isLoading) {
            // 等待当前加载完成
            let attempts = 0;
            while (this._isLoading && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
            }
            
            // 如果加载完成且缓存有效，返回缓存数据
            if (this.isCacheValid()) {
                const cachedResult = { ...defaultValues };
                keys.forEach(key => {
                    if (this._cache && this._cache.hasOwnProperty(key)) {
                        cachedResult[key] = this._cache[key];
                    }
                });
                return cachedResult;
            }
        }
        
        this._isLoading = true;
        
        try {
            // 检查Chrome扩展API是否可用
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
                // 只在首次检查时显示警告
                if (!this._cache) {
                    // 调试信息已移除
                }
                return defaultValues;
            }

            // 检查扩展上下文是否有效
            if (chrome.runtime && !chrome.runtime.id) {
                // 只在首次检查时显示警告
                if (!this._cache) {
                    // 调试信息已移除
                }
                return defaultValues;
            }

            const result = await chrome.storage.sync.get(keys);
            
            // 更新缓存
            this._cache = { ...(this._cache || {}), ...result };
            this._cacheTimestamp = Date.now();
            
            return { ...defaultValues, ...result };
        } catch (error) {
            const errorMessage = error.message || error.toString();

            if (errorMessage.includes('Extension context invalidated') ||
                errorMessage.includes('message port closed') ||
                errorMessage.includes('receiving end does not exist')) {
                // 使用节流日志，防止频繁警告
                // 调试信息已移除
            } else {
                // 调试信息已移除
            }

            return defaultValues;
        } finally {
            this._isLoading = false;
        }
    }

    /**
     * 保存设置
     * @param {Object} settings - 要保存的设置
     * @returns {boolean} 是否保存成功
     */
    static async saveSettings(settings) {
        try {
            // 检查Chrome扩展API是否可用
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
                // 调试信息已移除
                return false;
            }

            // 检查扩展上下文是否有效
            if (chrome.runtime && !chrome.runtime.id) {
                // 调试信息已移除
                return false;
            }

            await chrome.storage.sync.set(settings);
            
            // 更新缓存
            this._cache = { ...(this._cache || {}), ...settings };
            this._cacheTimestamp = Date.now();
            
            return true;
        } catch (error) {
            const errorMessage = error.message || error.toString();

            if (errorMessage.includes('Extension context invalidated') ||
                errorMessage.includes('message port closed') ||
                errorMessage.includes('receiving end does not exist')) {
                // 调试信息已移除
            } else {
                // 调试信息已移除
            }

            return false;
        }
    }
}

/**
 * 日志管理器
 */
class Logger {
    // 静态属性用于控制日志级别
    static _suppressWarnings = false;
    static _warningThrottle = new Map();
    static _throttleWindow = 10000; // 10秒内相同警告只显示一次
    
    /**
     * 设置是否抑制警告
     */
    static setSuppressWarnings(suppress) {
        this._suppressWarnings = suppress;
    }
    
    /**
     * 节流警告消息，防止相同警告频繁出现
     */
    static shouldShowWarning(message) {
        const now = Date.now();
        const lastShown = this._warningThrottle.get(message);
        
        if (!lastShown || (now - lastShown) > this._throttleWindow) {
            this._warningThrottle.set(message, now);
            return true;
        }
        
        return false;
    }
    
    static log(message, data = null) {
        // 调试信息已移除
    }

    static warn(message, data = null) {
        // 调试信息已移除
    }

    static error(message, data = null) {
        // 调试信息已移除
    }
}

/**
 * 事件绑定辅助器
 */
class EventHelper {
    /**
     * 批量绑定事件
     * @param {Object} context - 上下文对象
     * @param {Object} eventMap - 事件映射 {元素ID: {事件类型: 处理函数}}
     */
    static bindEventMap(context, eventMap) {
        for (const [elementId, events] of Object.entries(eventMap)) {
            const element = document.getElementById(elementId);
            if (element) {
                for (const [eventType, handler] of Object.entries(events)) {
                    element.addEventListener(eventType, handler.bind(context));
                }
            }
        }
    }
}

/**
 * 通用初始化函数
 * @param {Function} ClassName - 要初始化的类
 */
function initializeWhenReady(ClassName) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new ClassName());
    } else {
        new ClassName();
    }
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 检查扩展上下文是否有效
 * @returns {boolean} 扩展上下文是否有效
 */
function isExtensionContextValid() {
    try {
        return typeof chrome !== 'undefined' &&
            chrome.runtime &&
            chrome.runtime.id &&
            !chrome.runtime.lastError;
    } catch (error) {
        return false;
    }
}

/**
 * 安全执行扩展API调用
 * @param {Function} apiCall - 要执行的API调用
 * @param {Function} fallback - 降级处理函数
 * @returns {Promise} 执行结果
 */
async function safeExtensionCall(apiCall, fallback = null) {
    try {
        if (!isExtensionContextValid()) {
            throw new Error('Extension context invalidated');
        }
        return await apiCall();
    } catch (error) {
        const errorMessage = error.message || error.toString();

        if (errorMessage.includes('Extension context invalidated') ||
            errorMessage.includes('message port closed') ||
            errorMessage.includes('receiving end does not exist')) {
            // 调试信息已移除

            if (fallback && typeof fallback === 'function') {
                return await fallback();
            }
        } else {
            // 调试信息已移除
        }

        throw error;
    }
}

// 导出工具类（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SettingsManager,
        Logger,
        EventHelper,
        initializeWhenReady,
        debounce,
        isExtensionContextValid,
        safeExtensionCall
    };
}