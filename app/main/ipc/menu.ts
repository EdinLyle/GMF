import { Menu, shell, BrowserWindow, ipcMain } from 'electron';

// 创建应用菜单
export function createMenu(mainWindow: BrowserWindow | null): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建提示词',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            console.log('=== 菜单点击: 新建提示词 ===');
            console.log('时间:', new Date().toISOString());
            if (mainWindow) {
              console.log('主窗口存在，正在发送事件...');
              mainWindow.webContents.send('menu-action', 'menu:new-prompt');
              console.log('已发送 menu:new-prompt 事件到主窗口: menu:new-prompt');
            } else {
              console.log('❌ 主窗口不存在，无法发送事件');
            }
          }
        },
        {
          label: '导入数据',
          click: () => {
            console.log('=== 菜单点击: 导入数据 ===');
            console.log('时间:', new Date().toISOString());
            if (mainWindow) {
              console.log('主窗口存在，正在发送事件...');
              mainWindow.webContents.send('menu-action', 'menu:import');
              console.log('已发送 menu:import 事件到主窗口');
            } else {
              console.log('❌ 主窗口不存在，无法发送事件');
            }
          }
        },
        {
          label: '导出数据',
          click: () => {
            console.log('=== 菜单点击: 导出数据 ===');
            console.log('时间:', new Date().toISOString());
            if (mainWindow) {
              console.log('主窗口存在，正在发送事件...');
              mainWindow.webContents.send('menu-action', 'menu:export');
              console.log('已发送 menu:export 事件到主窗口');
            } else {
              console.log('❌ 主窗口不存在，无法发送事件');
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => {
            console.log('=== 菜单点击: 退出应用 ===');
            console.log('时间:', new Date().toISOString());
            // 应用会由app.on('window-all-closed')处理退出
            if (mainWindow) {
              console.log('正在关闭主窗口...');
              mainWindow.close();
            } else {
              console.log('❌ 主窗口不存在，无法关闭');
            }
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏模式' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '文档',
          click: async () => {
            await shell.openExternal('https://github.com/prompt-injection-manager/docs');
          }
        },
        {
          //搞个问卷星的问卷
          label: '工具Bug/改进反馈',
          click: async () => {
            await shell.openExternal('https://v.wjx.cn/vm/mLNTDOR.aspx#');
          }
        }
      ]
    }
  ];

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: 'GMF(提示词注入管理工具)',
      submenu: [
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏提示词注入管理工具' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
