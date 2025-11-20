/**
 * 拖拽即走 Chrome 插件 - 弹出窗口脚本
 * 处理当前网站状态检查和快速操作
 */

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.blacklist = [];
    this.isCurrentSiteBlacklisted = false;
    
    this.statusIcon = document.getElementById('statusIcon');
    this.statusText = document.getElementById('statusText');

    this.toggleButton = document.getElementById('toggleSite');
    this.toggleText = document.getElementById('toggleText');
    this.openOptionsButton = document.getElementById('openOptions');
    
    this.init();
  }

  /**
   * 初始化弹出窗口
   */
  async init() {
    await this.loadCurrentTab();
    await this.loadSettings();
    this.checkCurrentSiteStatus();
    this.bindEvents();
  }

  /**
   * 获取当前活动标签页
   */
  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      // 错误处理已移除调试信息
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    const settings = await SettingsManager.loadSettings(['blacklist'], { blacklist: [] });
    this.blacklist = settings.blacklist;
  }

  /**
   * 检查当前网站状态
   */
  checkCurrentSiteStatus() {
    if (!this.currentTab || !this.currentTab.url) {
      this.updateStatus(false, '无法检查状态');
      return;
    }

    const url = this.currentTab.url;
    const hostname = new URL(url).hostname;
    
    // 检查是否为特殊页面
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
      this.updateStatus(false, '特殊页面，插件不可用');
      this.toggleButton.style.display = 'none';
      return;
    }

    // 检查是否在黑名单中
    this.isCurrentSiteBlacklisted = this.isUrlBlacklisted(url, hostname);
    
    if (this.isCurrentSiteBlacklisted) {
      this.updateStatus(false, '已在黑名单中，插件已禁用');
      this.toggleText.textContent = '从黑名单移除';
      this.toggleButton.className = 'btn btn-secondary remove';
    } else {
      this.updateStatus(true, '插件已启用');
      this.toggleText.textContent = '添加到黑名单';
      this.toggleButton.className = 'btn btn-secondary';
    }
  }

  /**
   * 检查URL是否在黑名单中
   */
  isUrlBlacklisted(url, hostname) {
    return this.blacklist.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(url) || regex.test(hostname);
    });
  }

  /**
   * 更新状态显示
   */
  updateStatus(enabled, statusText) {
    if (enabled) {
      this.statusIcon.textContent = '✅';
      this.statusText.textContent = '插件已启用';
      document.querySelector('.status-item').className = 'status-item';
    } else {
      this.statusIcon.textContent = '❌';
      this.statusText.textContent = '插件已禁用';
      document.querySelector('.status-item').className = 'status-item disabled';
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    EventHelper.bindEventMap(this, {
      'toggleSite': { 'click': this.toggleCurrentSite },
      'openOptions': { 'click': this.openOptionsPage }
    });
  }

  /**
   * 切换当前网站的黑名单状态
   */
  async toggleCurrentSite() {
    if (!this.currentTab || !this.currentTab.url) {
      return;
    }

    try {
      const hostname = new URL(this.currentTab.url).hostname;
      const pattern = `*.${hostname}/*`;
      
      let newBlacklist;
      
      if (this.isCurrentSiteBlacklisted) {
        // 从黑名单中移除
        newBlacklist = this.blacklist.filter(item => {
          const regex = new RegExp(item.replace(/\*/g, '.*'));
          return !regex.test(this.currentTab.url) && !regex.test(hostname);
        });
      } else {
        // 添加到黑名单
        newBlacklist = [...this.blacklist, pattern];
      }
      
      await chrome.storage.sync.set({ blacklist: newBlacklist });
      this.blacklist = newBlacklist;
      this.checkCurrentSiteStatus();
      
      // 重新加载当前标签页以应用更改
      chrome.tabs.reload(this.currentTab.id);
      
    } catch (error) {
      // 错误处理已移除调试信息
    }
  }

  /**
   * 打开选项页面
   */
  openOptionsPage() {
    chrome.runtime.openOptionsPage();
    window.close();
  }
}

// 页面加载完成后初始化
initializeWhenReady(PopupManager);