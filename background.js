/**
 * 拖拽即走 Chrome 插件 - 背景脚本
 * 处理标签页操作和消息传递
 */

/**
 * 监听来自内容脚本的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openTab') {
    openNewTab(request.url);
    sendResponse({ success: true });
  }
  return true; // 保持消息通道开放
});

/**
 * 在新标签页中打开URL
 * @param {string} url - 要打开的URL
 */
async function openNewTab(url) {
  try {
    // 创建新标签页并激活
    await chrome.tabs.create({
      url: url,
      active: true // 在前台打开并激活
    });
  } catch (error) {
    // 错误处理已移除调试信息
  }
}

/**
 * 插件安装时的初始化
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装时设置默认配置
    chrome.storage.sync.set({
      blacklist: [
        '*.trello.com/*',
        '*.figma.com/*',
        '*.miro.com/*',
        '*.draw.io/*'
      ]
    });

    // 打开选项页面
    chrome.runtime.openOptionsPage();
  }
});