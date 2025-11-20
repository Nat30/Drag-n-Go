/**
 * 拖拽即走 Chrome 插件 - 选项页面脚本
 * 处理设置的保存、加载和重置功能
 */

class OptionsManager {
  constructor() {
    this.blacklistTextarea = document.getElementById('blacklist');
    this.searchEngineSelect = document.getElementById('searchEngine');
    this.saveButton = document.getElementById('save');
    this.resetButton = document.getElementById('reset');
    this.statusDiv = document.getElementById('status');
    
    this.init();
  }

  /**
   * 初始化选项页面
   */
  init() {
    this.loadSettings();
    this.bindEvents();
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    EventHelper.bindEventMap(this, {
      'save': { 'click': this.saveSettings },
      'reset': { 'click': this.resetSettings }
    });
    
    // 自动保存功能
    this.blacklistTextarea.addEventListener('input', debounce(this.autoSave.bind(this), 1000));
    this.searchEngineSelect.addEventListener('change', this.autoSave.bind(this));
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    const defaultSettings = {
      blacklist: this.getDefaultBlacklist(),
      searchEngine: 'google'
    };
    
    const settings = await SettingsManager.loadSettings(['blacklist', 'searchEngine'], defaultSettings);
    
    this.blacklistTextarea.value = settings.blacklist.join('\n');
    this.searchEngineSelect.value = settings.searchEngine;
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    const blacklistText = this.blacklistTextarea.value.trim();
    const blacklist = blacklistText ? 
      blacklistText.split('\n').map(line => line.trim()).filter(line => line) : 
      [];
    
    const settings = {
      blacklist: blacklist,
      searchEngine: this.searchEngineSelect.value
    };
    
    const success = await SettingsManager.saveSettings(settings);
    this.showStatus(success ? '✅ 设置已保存' : '❌ 保存设置失败', success ? 'success' : 'error');
  }

  /**
   * 自动保存设置
   */
  async autoSave() {
    await this.saveSettings();
  }

  /**
   * 重置为默认设置
   */
  async resetSettings() {
    if (confirm('确定要恢复默认设置吗？这将清除所有自定义配置。')) {
      const defaultSettings = {
        blacklist: this.getDefaultBlacklist(),
        searchEngine: 'google'
      };
      
      const success = await SettingsManager.saveSettings(defaultSettings);
      
      if (success) {
        // 更新界面
        this.blacklistTextarea.value = defaultSettings.blacklist.join('\n');
        this.searchEngineSelect.value = defaultSettings.searchEngine;
        this.showStatus('🔄 已恢复默认设置', 'success');
      } else {
        this.showStatus('❌ 重置设置失败', 'error');
      }
    }
  }

  /**
   * 获取默认黑名单
   */
  getDefaultBlacklist() {
    return [
      '*.trello.com/*',
      '*.figma.com/*',
      '*.miro.com/*',
      '*.draw.io/*',
      '*.canva.com/*',
      '*.notion.so/*',
      '*.airtable.com/*',
      '*.monday.com/*'
    ];
  }

  /**
   * 显示状态消息
   */
  showStatus(message, type = 'success') {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.statusDiv.style.display = 'none';
    }, 3000);
  }


}

// 页面加载完成后初始化
initializeWhenReady(OptionsManager);