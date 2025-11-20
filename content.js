/**
 * 拖拽即走 Chrome 插件 - 内容脚本
 * 实现拖拽文本搜索、图片和链接在新标签页打开的功能
 */

/**
 * 事件管理器 - 负责事件的绑定和解绑
 */
class EventManager {
  constructor(dragToGo) {
    this.dragToGo = dragToGo;
    this.handlers = new Map();
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const events = [
      ['mousedown', this.dragToGo.handleMouseDown.bind(this.dragToGo)],
      ['mousemove', this.dragToGo.handleMouseMove.bind(this.dragToGo)],
      ['mouseup', this.dragToGo.handleMouseUp.bind(this.dragToGo)],
      ['keydown', this.dragToGo.handleKeyDown.bind(this.dragToGo)],
      ['dragstart', this.dragToGo.handleDragStart.bind(this.dragToGo)],
      ['dragend', this.dragToGo.handleDragEnd.bind(this.dragToGo)],
      ['scroll', this.dragToGo.handleScroll.bind(this.dragToGo)]
    ];

    events.forEach(([event, handler]) => {
      this.handlers.set(event, handler);
      document.addEventListener(event, handler);
    });

    // 点击事件需要在捕获和冒泡阶段都监听
    const clickHandler = this.dragToGo.handleClick.bind(this.dragToGo);
    this.handlers.set('click-capture', clickHandler);
    this.handlers.set('click-bubble', clickHandler);
    document.addEventListener('click', clickHandler, true);
    document.addEventListener('click', clickHandler, false);
  }

  /**
   * 解绑事件监听器
   */
  unbindEvents() {
    this.handlers.forEach((handler, event) => {
      if (event === 'click-capture') {
        document.removeEventListener('click', handler, true);
      } else if (event === 'click-bubble') {
        document.removeEventListener('click', handler, false);
      } else {
        document.removeEventListener(event, handler);
      }
    });
    this.handlers.clear();
  }
}

/**
 * UI管理器 - 负责UI元素的创建和管理
 */
class UIManager {
  constructor() {
    this.tooltip = null;
    this.dragPreview = null;
    this.messageContainer = null;
    this.animationFrameId = null;
    this.pendingUpdate = false;
  }

  /**
   * 创建拖拽提示工具
   */
  createTooltip() {
    try {
      // 检查DOM环境是否可用
      if (typeof document === 'undefined' || !document.createElement) {
        // 调试信息已移除
        return false;
      }
      
      // 检查document.body是否存在
      if (!document.body) {
        // 调试信息已移除
        // 延迟创建，等待DOM加载完成
        setTimeout(() => {
          if (document.body && !this.tooltip) {
            this.createTooltip();
          }
        }, 100);
        return false;
      }
      
      this.tooltip = document.createElement('div');
      
      // 防御性检查createElement的结果
      if (!this.tooltip) {
        // 调试信息已移除
        return false;
      }
      
      this.tooltip.className = 'drag-to-go-tooltip';
      
      // 安全设置样式
      if (this.tooltip.style) {
        this.tooltip.style.cssText = `
          position: fixed;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 10000;
          pointer-events: none;
          display: none;
          font-family: Arial, sans-serif;
        `;
      } else {
        // 调试信息已移除
        return false;
      }
      
      document.body.appendChild(this.tooltip);
      this.createUserMessageSystem();
      return true;
    } catch (error) {
      // 调试信息已移除
      return false;
    }
  }

  /**
   * 创建用户消息提示系统
   */
  createUserMessageSystem() {
    try {
      // 检查DOM环境
      if (typeof document === 'undefined' || !document.createElement || !document.body) {
        // 调试信息已移除
        return false;
      }
      
      this.messageContainer = document.createElement('div');
      
      // 防御性检查
      if (!this.messageContainer) {
        // 调试信息已移除
        return false;
      }
      
      this.messageContainer.className = 'drag-to-go-message-container';
      
      // 安全设置样式
      if (this.messageContainer.style) {
        this.messageContainer.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10001;
          pointer-events: none;
        `;
      } else {
        // 调试信息已移除
        return false;
      }
      
      document.body.appendChild(this.messageContainer);
      return true;
    } catch (error) {
      // 调试信息已移除
      return false;
    }
  }

  /**
   * 显示用户消息
   */
  showUserMessage(message, type = 'info') {
    // 如果消息容器不存在，尝试创建
    if (!this.messageContainer) {
      const created = this.createUserMessageSystem();
      if (!created) {
        // 调试信息已移除
        return;
      }
    }
    
    try {
      // 检查DOM环境
      if (typeof document === 'undefined' || !document.createElement) {
        // 调试信息已移除
        return;
      }
      
      const messageElement = document.createElement('div');
      
      // 防御性检查
      if (!messageElement) {
        // 调试信息已移除
        return;
      }
      
      messageElement.className = `drag-to-go-message drag-to-go-message-${type}`;
      messageElement.textContent = message;
      
      const colors = {
        info: { bg: '#3b82f6', border: '#2563eb' },
        warning: { bg: '#f59e0b', border: '#d97706' },
        error: { bg: '#ef4444', border: '#dc2626' },
        success: { bg: '#10b981', border: '#059669' }
      };
      
      const color = colors[type] || colors.info;
      
      // 安全设置样式
      if (messageElement.style) {
        messageElement.style.cssText = `
          background: ${color.bg};
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-left: 4px solid ${color.border};
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
          pointer-events: auto;
          cursor: pointer;
          max-width: 300px;
          word-wrap: break-word;
        `;
      } else {
        // 调试信息已移除
        return;
      }
      
      this.messageContainer.appendChild(messageElement);
      
      setTimeout(() => {
        if (messageElement.style) {
          messageElement.style.opacity = '1';
          messageElement.style.transform = 'translateX(0)';
        }
      }, 10);
      
      messageElement.addEventListener('click', () => {
        this.hideUserMessage(messageElement);
      });
      
      setTimeout(() => {
        this.hideUserMessage(messageElement);
      }, type === 'error' ? 5000 : 3000);
    } catch (error) {
      // 调试信息已移除
    }
  }

  /**
   * 隐藏用户消息
   */
  hideUserMessage(messageElement) {
    if (!messageElement || !messageElement.parentNode) return;
    
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 300);
  }

  /**
   * 显示拖拽提示
   */
  showTooltip(event, tooltipText) {
    if (!this.tooltip || !tooltipText) return;

    try {
      // 安全设置内容和位置
      if (this.tooltip.textContent !== undefined) {
        this.tooltip.textContent = tooltipText;
      }
      
      if (this.tooltip.style) {
        this.tooltip.style.left = (event.clientX + 10) + 'px';
        this.tooltip.style.top = (event.clientY - 30) + 'px';
        this.tooltip.style.display = 'block';
      }
    } catch (error) {
      // 调试信息已移除
    }
  }

  /**
   * 隐藏拖拽提示
   */
  hideTooltip() {
    if (this.tooltip) {
      try {
        if (this.tooltip.style) {
          this.tooltip.style.display = 'none';
        }
      } catch (error) {
        // 调试信息已移除
      }
    }
  }

  /**
   * 更新拖拽预览位置
   */
  updateDragPreviewPosition(x, y) {
    if (!this.dragPreview) return;
    
    if (this.pendingUpdate) return;
    
    this.pendingUpdate = true;
    this.animationFrameId = requestAnimationFrame(() => {
      try {
        if (this.dragPreview && this.dragPreview.style) {
          this.dragPreview.style.left = x + 'px';
          this.dragPreview.style.top = y + 'px';
        }
      } catch (error) {
        // 调试信息已移除
      }
      this.pendingUpdate = false;
    });
  }

  /**
   * 移除拖拽预览
   */
  removeDragPreview() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.pendingUpdate = false;
    
    if (this.dragPreview) {
      document.body.removeChild(this.dragPreview);
      this.dragPreview = null;
    }
  }

  /**
   * 清理所有UI元素
   */
  cleanup() {
    this.hideTooltip();
    this.removeDragPreview();
    
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
      this.tooltip = null;
    }
    
    if (this.messageContainer && this.messageContainer.parentNode) {
      this.messageContainer.parentNode.removeChild(this.messageContainer);
      this.messageContainer = null;
    }
  }
}

/**
 * 安全管理器 - 负责URL安全检查和验证
 */
class SecurityManager {
  /**
   * 检查URL是否安全
   */
  static isUrlSafe(url) {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.toLowerCase();
      
      const safeProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
      const dangerousProtocols = [
        'javascript:', 'data:', 'file:', 'vbscript:', 
        'chrome:', 'chrome-extension:', 'moz-extension:',
        'ms-browser-extension:', 'edge:'
      ];
      
      if (dangerousProtocols.includes(protocol)) {
        return false;
      }
      
      if (!safeProtocols.includes(protocol)) {
        return false;
      }
      
      const hostname = urlObj.hostname.toLowerCase();
      const localHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (localHosts.includes(hostname)) {
        return false;
      }
      
      if (SecurityManager.isPrivateIP(hostname)) {
        return false;
      }
      
      return true;
    } catch (error) {
      // 调试信息已移除
      return false;
    }
  }

  /**
   * 检查IP是否为私有地址
   */
  static isPrivateIP(hostname) {
    const privateIPv4Patterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./
    ];
    
    return privateIPv4Patterns.some(pattern => pattern.test(hostname));
  }
}

class DragToGo {
  constructor() {
    // 拖拽状态
    this.isDragging = false;
    this.dragStartElement = null;
    this.dragStartPosition = { x: 0, y: 0 };
    this.currentMousePosition = { x: 0, y: 0 };
    this.selectedText = '';
    this.dragContent = null;
    this.hasActuallyDragged = false;
    
    // 控制标志
    this.ignoreNextMouseUp = false;
    this.blockClicksAfterEsc = false;
    this.escCancelledDrag = false;
    this.preventAllClicks = false;
    this._pluginDisabled = false;
    
    // 设置和配置
    this.blacklist = [];
    this.searchEngine = 'google';
    this.dragThreshold = 5;
    this._blacklistRegexps = [];
    this._currentUrl = '';
    this._currentHost = '';
    
    // 设置缓存和状态
    this._settingsCache = null;
    this._settingsLastLoaded = 0;
    this._settingsCacheTimeout = 30000; // 30秒缓存有效期
    this._isLoadingSettings = false;
    
    // 管理器实例
    this.eventManager = new EventManager(this);
    this.uiManager = new UIManager();
    
    // 初始化
    this.init();
  }

  /**
   * 初始化插件功能
   */
  async init() {
    try {
      // 设置日志级别，在生产环境中减少不必要的警告
      const isProduction = !chrome.runtime.getManifest().name.includes('Dev');
      if (isProduction) {
        // 调试信息已移除
      }
      
      await this.loadSettings();
      if (this.isBlacklisted()) {
        return;
      }

      this.eventManager.bindEvents();
      
      // 安全创建 UI 元素
      const tooltipCreated = this.uiManager.createTooltip();
      if (!tooltipCreated) {
        // 调试信息已移除
      }
      
      this.setupSPASupport();
      this.addGlobalEventBlocker();
    } catch (error) {
      // 调试信息已移除
    }
  }

  /**
   * 设置SPA支持，监听路由变化
   */
  setupSPASupport() {
    // 防抖处理路由变化
    const debouncedRouteChange = this.debounce(() => {
      this.handleRouteChange();
    }, 500); // 500ms 防抖
    
    // 监听 History API 变化
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => debouncedRouteChange(), 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => debouncedRouteChange(), 100);
    };
    
    // 监听 popstate 事件
    window.addEventListener('popstate', () => {
      setTimeout(() => debouncedRouteChange(), 100);
    });
    
    // 监听 hashchange 事件
    window.addEventListener('hashchange', () => {
      setTimeout(() => debouncedRouteChange(), 100);
    });
  }

  /**
   * 防抖函数
   */
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * 处理路由变化
   */
  async handleRouteChange() {
    // 检查URL是否真的发生了变化
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;
    
    if (currentUrl === this._currentUrl && currentHost === this._currentHost) {
      return; // URL没有变化，不需要处理
    }
    
    // 使用缓存的设置，避免频繁重新加载
    const needsReload = this.shouldReloadSettings();
    
    if (needsReload) {
      await this.loadSettings();
    } else {
      // 仅重新编译黑名单正则表达式以检查新URL
      this.compileBlacklistRegexps();
    }
    
    if (this.isBlacklisted()) {
      // 如果新路由在黑名单中，禁用功能
      this.disablePlugin();
    } else {
      // 如果不在黑名单中，确保功能已启用
      this.enablePlugin();
    }
  }

  /**
   * 禁用插件功能
   */
  disablePlugin() {
    this.resetDragState();
    this.eventManager.unbindEvents();
    this.uiManager.hideTooltip();
    this._pluginDisabled = true;
  }

  /**
   * 启用插件功能
   */
  enablePlugin() {
    if (this._pluginDisabled) {
      this.eventManager.bindEvents();
      this._pluginDisabled = false;
    }
  }

  /**
   * 检查是否需要重新加载设置
   */
  shouldReloadSettings() {
    // 如果没有缓存或缓存已过期，需要重新加载
    const now = Date.now();
    return !this._settingsCache || 
           (now - this._settingsLastLoaded) > this._settingsCacheTimeout;
  }

  /**
   * 加载插件设置（带缓存机制）
   */
  async loadSettings() {
    // 防止并发加载
    if (this._isLoadingSettings) {
      return;
    }
    
    // 检查缓存是否仍然有效
    if (!this.shouldReloadSettings()) {
      return;
    }
    
    this._isLoadingSettings = true;
    
    const defaultSettings = {
      blacklist: [],
      searchEngine: 'google'
    };

    try {
      const settings = await SettingsManager.loadSettings(['blacklist', 'searchEngine'], defaultSettings);
      
      // 缓存设置
      this._settingsCache = settings;
      this._settingsLastLoaded = Date.now();
      
      this.blacklist = settings.blacklist;
      this.searchEngine = settings.searchEngine;
      
      // 重新编译黑名单正则表达式
      this.compileBlacklistRegexps();
    } catch (error) {
      // 调试信息已移除
      this.blacklist = defaultSettings.blacklist;
      this.searchEngine = defaultSettings.searchEngine;
      this.compileBlacklistRegexps();
    } finally {
      this._isLoadingSettings = false;
    }
  }

  /**
   * 编译黑名单正则表达式（性能优化）
   */
  compileBlacklistRegexps() {
    this._blacklistRegexps = this.blacklist.map(pattern => {
      try {
        return new RegExp(pattern.replace(/\*/g, '.*'), 'i'); // 添加忽略大小写标志
      } catch (error) {
        // 调试信息已移除
        return null;
      }
    }).filter(regex => regex !== null);
    
    // 缓存当前网址信息以优化性能
    this._currentUrl = window.location.href;
    this._currentHost = window.location.hostname;
  }

  /**
   * 检查当前网站是否在黑名单中
   */
  isBlacklisted() {
    // 如果网址发生变化，重新编译正则表达式
    if (this._currentUrl !== window.location.href || this._currentHost !== window.location.hostname) {
      this.compileBlacklistRegexps();
    }
    
    // 使用缓存的正则表达式
    if (!this._blacklistRegexps || this._blacklistRegexps.length === 0) {
      return false;
    }

    return this._blacklistRegexps.some(regex => {
      try {
        return regex.test(this._currentUrl) || regex.test(this._currentHost);
      } catch (error) {
        // 调试信息已移除
        return false;
      }
    });
  }



  /**
   * 添加全局事件拦截器 - 最高优先级
   */
  addGlobalEventBlocker() {
    const superBlocker = (event) => {
      // 如果是ESC取消拖拽后的状态，无条件阻止所有相关事件
      if (this.escCancelledDrag || this.blockClicksAfterEsc) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        if (event.type === 'click') {
          this.temporarilyDisableClickHandlers(event.target);
        }
        
        return false;
      }
      
      // 如果刚刚完成拖拽，也阻止点击
      if (this.hasActuallyDragged && event.type === 'click') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };

    document.addEventListener('click', superBlocker, true);
    document.addEventListener('mouseup', superBlocker, true);
    document.addEventListener('mousedown', superBlocker, true);
    window.addEventListener('click', superBlocker, true);
    window.addEventListener('mouseup', superBlocker, true);
    
    if (document.documentElement) {
      document.documentElement.addEventListener('click', superBlocker, true);
      document.documentElement.addEventListener('mouseup', superBlocker, true);
    }
    
    this.superBlocker = superBlocker;
  }

  /**
   * 临时禁用元素的点击处理器
   */
  temporarilyDisableClickHandlers(element) {
    if (!element || !element.onclick) return;
    
    // 临时保存原始的onclick处理器
    const originalOnClick = element.onclick;
    
    // 清除onclick处理器
    element.onclick = null;
    
    // 200ms后恢复
    setTimeout(() => {
      if (element && !this.escCancelledDrag && !this.blockClicksAfterEsc) {
        element.onclick = originalOnClick;
      }
    }, 200);
  }



  /**
   * 创建拖拽预览元素
   * 创建跟随鼠标指针的预览效果，保持原网页样式
   */
  createDragPreview(content) {
    try {
      // 验证内容有效性
      if (!content || !content.type) {
        // 调试信息已移除
        return null;
      }
      
      // 检查DOM环境
      if (typeof document === 'undefined' || !document.createElement || !document.body) {
        // 调试信息已移除
        return null;
      }
      
      // 创建拖拽预览元素
      const dragPreview = document.createElement('div');
      
      if (!dragPreview) {
        // 调试信息已移除
        return null;
      }
      
      dragPreview.className = 'drag-to-go-cursor-preview';
      
      // 安全设置样式
      if (dragPreview.style) {
        dragPreview.style.cssText = `
          position: fixed;
          z-index: 10001;
          pointer-events: none;
          transform: translate(10px, -10px);
          opacity: 0;
          transition: opacity 0.2s ease;
        `;
      }

      // 根据内容类型设置预览内容
      if (content && content.type === 'text') {
        // 创建文本预览，保持原选中文字的样式
        const textElement = document.createElement('span');
        if (textElement) {
          // 安全设置文本内容，防止空值
          textElement.textContent = content.fullText || content.text || '文本';

          // 复制原始文本的样式
          try {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const selectedElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
                ? range.commonAncestorContainer.parentElement
                : range.commonAncestorContainer;

              if (selectedElement && selectedElement.nodeType === Node.ELEMENT_NODE) {
                const computedStyle = window.getComputedStyle(selectedElement);
                if (textElement.style) {
                  textElement.style.cssText = `
                    font-family: ${computedStyle.fontFamily};
                    font-size: ${computedStyle.fontSize};
                    font-weight: ${computedStyle.fontWeight};
                    color: ${computedStyle.color};
                    line-height: ${computedStyle.lineHeight};
                    text-decoration: ${computedStyle.textDecoration};
                    background: ${computedStyle.backgroundColor};
                  `;
                }
              }
            }
          } catch (styleError) {
            // 调试信息已移除
          }

          dragPreview.appendChild(textElement);
        }
      } else if (content && content.type === 'image') {
        // 创建图片预览，显示100px宽度的缩略图
        const imgElement = document.createElement('img');
        if (imgElement) {
          imgElement.src = content.src || '';
          imgElement.alt = content.alt || '图片';
          
          if (imgElement.style) {
            imgElement.style.cssText = `
              width: 100px;
              height: auto;
              max-height: 100px;
              object-fit: contain;
              border-radius: ${this.dragStartElement && this.dragStartElement.style ? this.dragStartElement.style.borderRadius || '0' : '0'};
            `;
          }

          // 复制原图片的一些样式属性
          try {
            if (this.dragStartElement) {
              const originalStyle = window.getComputedStyle(this.dragStartElement);
              if (originalStyle.borderRadius && imgElement.style) {
                imgElement.style.borderRadius = originalStyle.borderRadius;
              }
              if (originalStyle.filter && imgElement.style) {
                imgElement.style.filter = originalStyle.filter;
              }
            }
          } catch (styleError) {
            // 调试信息已移除
          }

          dragPreview.appendChild(imgElement);
        }
      } else if (content && content.type === 'link') {
        // 创建链接预览，显示链接网址
        const linkElement = document.createElement('a');
        if (linkElement) {
          linkElement.href = content.href || '#';
          linkElement.textContent = content.href || '链接';
          
          if (linkElement.style) {
            linkElement.style.cssText = `
              text-decoration: none;
              pointer-events: none;
            `;
          }

          // 复制原链接的样式
          try {
            const originalLink = this.dragStartElement && this.dragStartElement.tagName === 'A'
              ? this.dragStartElement
              : this.dragStartElement && this.dragStartElement.closest('a');

            if (originalLink) {
              const computedStyle = window.getComputedStyle(originalLink);
              if (linkElement.style) {
                linkElement.style.cssText += `
                  font-family: ${computedStyle.fontFamily};
                  font-size: ${computedStyle.fontSize};
                  font-weight: ${computedStyle.fontWeight};
                  color: ${computedStyle.color};
                  text-decoration: ${computedStyle.textDecoration};
                `;
              }
            }
          } catch (styleError) {
            // 调试信息已移除
          }

          dragPreview.appendChild(linkElement);
        }
      }

      document.body.appendChild(dragPreview);
      this.dragPreview = dragPreview;

      // 初始化位置
      this.uiManager.updateDragPreviewPosition(this.currentMousePosition.x, this.currentMousePosition.y);

      // 显示预览
      setTimeout(() => {
        if (this.dragPreview && this.dragPreview.style) {
          this.dragPreview.style.opacity = '1';
        }
      }, 10);
      
      return dragPreview;
    } catch (error) {
      // 调试信息已移除
      return null;
    }
  }



  /**
   * 处理鼠标按下事件
   */
  handleMouseDown(event) {
    // 只处理左键点击
    if (event.button !== 0) return;

    this.dragStartElement = event.target;
    this.dragStartPosition = { x: event.clientX, y: event.clientY };
    this.currentMousePosition = { x: event.clientX, y: event.clientY };
    this.selectedText = window.getSelection().toString().trim();
    this.hasActuallyDragged = false;
    this.ignoreNextMouseUp = false;

    // 准备拖拽内容信息
    this.prepareDragContent();
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(event) {
    if (!this.dragStartElement) return;

    this.currentMousePosition = { x: event.clientX, y: event.clientY };

    const distance = Math.sqrt(
      Math.pow(event.clientX - this.dragStartPosition.x, 2) +
      Math.pow(event.clientY - this.dragStartPosition.y, 2)
    );

    if (distance > this.dragThreshold && !this.isDragging) {
      this.isDragging = true;
      this.hasActuallyDragged = true;
      this.startDragging();
    }

    if (this.isDragging) {
      this.uiManager.updateDragPreviewPosition(this.currentMousePosition.x, this.currentMousePosition.y);
      this.showTooltip(event);
    }
  }

  /**
   * 使用UIManager显示用户消息
   */
  showUserMessage(message, type = 'info') {
    this.uiManager.showUserMessage(message, type);
  }

  /**
   * 显示拖拽提示
   */
  showTooltip(event) {
    let tooltipText = '';
    const element = this.dragStartElement;

    if (this.selectedText) {
      const text = this.selectedText.substring(0, 20);
      tooltipText = `搜索: ${text}${this.selectedText.length > 20 ? '...' : ''}`;
    } else if (element && element.tagName === 'IMG') {
      tooltipText = '在新标签页打开图片';
    } else if (element && (element.tagName === 'A' || element.closest('a'))) {
      tooltipText = '在新标签页打开链接';
    }

    if (tooltipText) {
      this.uiManager.showTooltip(event, tooltipText);
    }
  }

  /**
   * 隐藏拖拽提示
   */
  hideTooltip() {
    this.uiManager.hideTooltip();
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp(event) {
    // 如果需要忽略这次鼠标弹起事件（ESC后的第一次）
    if (this.ignoreNextMouseUp || this.escCancelledDrag) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      this.ignoreNextMouseUp = false;
      this.preventAllClicks = true;
      setTimeout(() => {
        this.preventAllClicks = false;
      }, 500);
      
      this.resetDragState();
      return false;
    }

    // 如果真正进行了拖拽，则处理拖拽动作
    if (this.isDragging && this.dragContent && this.hasActuallyDragged) {
      this.processDragAction();
      event.preventDefault();
      event.stopPropagation();
    }

    this.resetDragState();
  }

  /**
   * 处理点击事件
   */
  handleClick(event) {
    // 如果设置了preventAllClicks标记，无条件阻止
    if (this.preventAllClicks) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }

    // 如果刚刚进行了拖拽操作或ESC取消了拖拽，阻止点击事件
    if (this.hasActuallyDragged || this.blockClicksAfterEsc || this.escCancelledDrag) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }

  /**
   * 处理键盘事件
   */
  handleKeyDown(event) {
    // ESC键取消拖拽操作
    if (event.key === 'Escape' && this.isDragging) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      

      this.ignoreNextMouseUp = true;
      this.blockClicksAfterEsc = true;
      this.escCancelledDrag = true;
      
      this.addTemporarySuperBlocker();
      setTimeout(() => {
        this.blockClicksAfterEsc = false;
        this.escCancelledDrag = false;
        this.removeTemporarySuperBlocker();
      }, 300);
      
      this.cancelDrag();
      return false;
    }
  }

  /**
   * 添加临时的超级拦截器
   */
  addTemporarySuperBlocker() {
    this.tempSuperBlocker = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    };
    
    // 在所有可能的级别添加拦截器
    document.addEventListener('click', this.tempSuperBlocker, true);
    document.addEventListener('mouseup', this.tempSuperBlocker, true);
    window.addEventListener('click', this.tempSuperBlocker, true);
    window.addEventListener('mouseup', this.tempSuperBlocker, true);
    
    if (document.documentElement) {
      document.documentElement.addEventListener('click', this.tempSuperBlocker, true);
      document.documentElement.addEventListener('mouseup', this.tempSuperBlocker, true);
    }
    
    if (document.body) {
      document.body.addEventListener('click', this.tempSuperBlocker, true);
      document.body.addEventListener('mouseup', this.tempSuperBlocker, true);
    }
  }

  /**
   * 移除临时的超级拦截器
   */
  removeTemporarySuperBlocker() {
    if (!this.tempSuperBlocker) return;
    
    document.removeEventListener('click', this.tempSuperBlocker, true);
    document.removeEventListener('mouseup', this.tempSuperBlocker, true);
    window.removeEventListener('click', this.tempSuperBlocker, true);
    window.removeEventListener('mouseup', this.tempSuperBlocker, true);
    
    if (document.documentElement) {
      document.documentElement.removeEventListener('click', this.tempSuperBlocker, true);
      document.documentElement.removeEventListener('mouseup', this.tempSuperBlocker, true);
    }
    
    if (document.body) {
      document.body.removeEventListener('click', this.tempSuperBlocker, true);
      document.body.removeEventListener('mouseup', this.tempSuperBlocker, true);
    }
    
    this.tempSuperBlocker = null;
  }

  /**
   * 处理页面滚动事件
   */
  handleScroll(event) {
    if (this.isDragging) {
      this.uiManager.updateDragPreviewPosition(this.currentMousePosition.x, this.currentMousePosition.y);
    }
  }

  /**
   * 检查鼠标位置是否在选中文本区域内
   */
  isMouseInSelectedText(x, y) {
    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || selection.toString().trim() === '') {
        return false;
      }

      // 获取选中文本的所有矩形区域
      const range = selection.getRangeAt(0);
      if (!range) {
        return false;
      }
      
      const rects = range.getClientRects();
      if (!rects || rects.length === 0) {
        return false;
      }
      
      // 检查鼠标位置是否在任何一个矩形区域内
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      // 调试信息已移除
      return false;
    }
  }

  /**
   * 准备拖拽内容
   */
  prepareDragContent() {
    const element = this.dragStartElement;

    // 防御性编程：检查起始元素是否存在
    if (!element) {
      // 调试信息已移除
      this.dragContent = null;
      return;
    }

    // 如果有选中文本，检查鼠标是否在选中文本区域内
    if (this.selectedText && this.selectedText.trim()) {
      // 只有当鼠标在选中文本区域内时才准备文本拖拽内容
      if (this.isMouseInSelectedText(this.dragStartPosition.x, this.dragStartPosition.y)) {
        const fullText = this.selectedText.trim();
        if (fullText) {
          const shortText = fullText.length > 50 
            ? fullText.substring(0, 50) + '...' 
            : fullText;
          
          this.dragContent = {
            type: 'text',
            text: shortText,
            fullText: fullText
          };
          return;
        }
      }
    }
    
    // 检查图片拖拽
    if (element.tagName === 'IMG') {
      const imageSrc = element.src;
      if (imageSrc && imageSrc.trim()) {
        this.dragContent = {
          type: 'image',
          src: imageSrc,
          alt: element.alt || '图片'
        };
        return;
      }
    }
    
    // 检查链接拖拽
    if (element.tagName === 'A' || element.closest('a')) {
      const linkElement = element.tagName === 'A' ? element : element.closest('a');
      if (linkElement && linkElement.href && linkElement.href.trim()) {
        const linkText = linkElement.textContent ? linkElement.textContent.trim() : '';
        const displayText = linkText.length > 50 
          ? linkText.substring(0, 50) + '...' 
          : (linkText || linkElement.href);
        
        this.dragContent = {
          type: 'link',
          href: linkElement.href,
          text: displayText
        };
        return;
      }
    }
    
    // 如果没有找到有效的拖拽内容，设置为 null
    this.dragContent = null;
  }

  /**
   * 开始拖拽
   */
  startDragging() {
    if (!this.dragContent) return;

    // 添加拖拽样式到body
    document.body.classList.add('drag-to-go-dragging');

    // 创建拖拽预览
    const preview = this.createDragPreview(this.dragContent);
    if (preview) {
      this.uiManager.dragPreview = preview;
    }

    // 阻止页面选择
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // 隐藏鼠标指针，让预览元素看起来像是鼠标指针的一部分
    document.body.style.cursor = 'none';
  }

  /**
   * 取消拖拽
   */
  cancelDrag() {
    this.resetDragState();
  }

  /**
   * 处理拖拽开始事件
   */
  handleDragStart(event) {
    // 阻止默认的拖拽行为，使用我们自定义的逻辑
    event.preventDefault();
  }

  /**
   * 处理拖拽结束事件
   */
  handleDragEnd(event) {
    this.resetDragState();
  }

  /**
   * 处理拖拽动作
   */
  async processDragAction() {
    // 防御性编程：先检查拖拽内容是否存在
    if (!this.dragContent) {
      // 调试信息已移除
      return;
    }

    // 防御性编程：检查拖拽内容类型是否有效
    if (!this.dragContent.type) {
      // 调试信息已移除
      return;
    }

    try {
      switch (this.dragContent.type) {
        case 'text':
          // 防御性编程：检查文本内容
          const fullText = this.dragContent?.fullText;
          if (!fullText || fullText.trim() === '') {
            // 调试信息已移除
            return;
          }
          
          await this.searchText(fullText);
          break;
          
        case 'image':
          // 防御性编程：检查图片地址
          const imageSrc = this.dragContent?.src;
          if (!imageSrc || imageSrc.trim() === '') {
            // 调试信息已移除
            return;
          }
          
          await this.openImageByUrl(imageSrc);
          break;
          
        case 'link':
          // 防御性编程：检查链接地址
          const linkHref = this.dragContent?.href;
          if (!linkHref || linkHref.trim() === '') {
            // 调试信息已移除
            return;
          }
          
          await this.openLinkByUrl(linkHref);
          break;
          
        default:
          // 调试信息已移除
          break;
      }
    } catch (error) {
      // 调试信息已移除
    }
  }

  /**
   * 安全地发送消息到背景脚本
   * @param {Object} message - 要发送的消息对象
   */
  async safeSendMessage(message) {
    const fallback = async () => {
      // 降级处理：直接在新窗口打开链接
      if (message.action === 'openTab' && message.url) {
        try {
          window.open(message.url, '_blank');
          return { success: true, fallback: true };
        } catch (openError) {
          // 调试信息已移除
          throw openError;
        }
      }
      throw new Error('No fallback available for this action');
    };

    try {
      const response = await safeExtensionCall(
        () => chrome.runtime.sendMessage(message),
        fallback
      );
      
      if (!response.success) {
        throw new Error(response.error || '未知错误');
      }
      
      return response;
    } catch (error) {
      // 调试信息已移除
      
      // 尝试降级处理
      if (message.action === 'openTab' && message.url) {
        try {
          await fallback();
          return { success: true, fallback: true };
        } catch (fallbackError) {
          // 静默处理错误，不显示用户提示
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 搜索选中的文本
   */
  async searchText(text) {
    if (!text || text.trim() === '') {
      // 调试信息已移除
      return;
    }
    
    const searchUrl = this.getSearchUrl(text);
    await this.safeSendMessage({
      action: 'openTab',
      url: searchUrl
    });
  }

  /**
   * 根据设置获取搜索URL
   */
  getSearchUrl(text) {
    const encodedText = encodeURIComponent(text);

    switch (this.searchEngine) {
      case 'bing':
        return `https://www.bing.com/search?q=${encodedText}`;
      case 'baidu':
        return `https://www.baidu.com/s?wd=${encodedText}`;
      case 'duckduckgo':
        return `https://duckduckgo.com/?q=${encodedText}`;
      case 'google':
      default:
        return `https://www.google.com/search?q=${encodedText}`;
    }
  }

  /**
   * 在新标签页打开URL
   * @param {string} url - 要打开的URL
   */
  async openUrl(url) {
    if (url && SecurityManager.isUrlSafe(url)) {
      await this.safeSendMessage({
        action: 'openTab',
        url: url
      });
    } else if (url) {
      // 调试信息已移除
    }
  }



  /**
   * 在新标签页打开图片
   */
  async openImage(imgElement) {
    await this.openUrl(imgElement.src);
  }

  /**
   * 通过URL在新标签页打开图片
   */
  async openImageByUrl(imageUrl) {
    await this.openUrl(imageUrl);
  }

  /**
   * 在新标签页打开链接
   */
  async openLink(linkElement) {
    await this.openUrl(linkElement.href);
  }

  /**
   * 通过URL在新标签页打开链接
   */
  async openLinkByUrl(linkUrl) {
    await this.openUrl(linkUrl);
  }

  /**
   * 重置拖拽状态
   */
  resetDragState() {
    this.isDragging = false;
    this.dragStartElement = null;
    // 不要清空selectedText，保持用户的文本选择
    // this.selectedText = '';
    this.dragContent = null;
    this.hideTooltip();
    this.uiManager.removeDragPreview();

    // 移除拖拽样式
    document.body.classList.remove('drag-to-go-dragging');

    // 恢复页面选择和鼠标指针
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.body.style.cursor = '';

    // 延迟重置拖拽标记，确保点击事件能够正确处理
    setTimeout(() => {
      this.hasActuallyDragged = false;
    }, 50);
  }
}

// 初始化插件
// 确保DOM完全加载后再初始化
function initializeDragToGo() {
  try {
    // 检查基本的DOM环境
    if (typeof document === 'undefined') {
      // 调试信息已移除
      return;
    }
    
    // 如果document.body不存在，等待DOM加载
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDragToGo);
        return;
      } else {
        // DOM已加载但body不存在，延迟重试
        setTimeout(initializeDragToGo, 100);
        return;
      }
    }
    
    // DOM准备就绪，初始化插件
    new DragToGo();
  } catch (error) {
    // 调试信息已移除
  }
}

// 使用安全的初始化方式
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDragToGo);
} else {
  // DOM已经加载完成，直接初始化
  initializeDragToGo();
}