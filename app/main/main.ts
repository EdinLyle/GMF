import { app, BrowserWindow, ipcMain, dialog, Menu, session } from 'electron';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { initializeDatabase } from './database/database';
import { setupIPCHandlers, setupVariantEngineHandlers } from './ipc/handlers';
import { createMenu } from './ipc/menu';

// 全局窗口引用
let mainWindow: BrowserWindow | null = null;

// 扩展全局类型
declare global {
  var mainWindow: BrowserWindow | null;
}

// 获取当前目录（兼容 CommonJS 环境）
function getCurrentDir(): string {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // 运行时获取目录
  return path.dirname((require.main as any)?.filename || process.execPath);
}

// 查找preload.js文件的稳健方法
function findPreloadPath(): string {
  const currentDir = getCurrentDir();
  console.log('当前目录:', currentDir);
  
  // 方法1: 如果当前目录是dist目录，直接查找
  if (currentDir.includes('dist') && currentDir.endsWith('app\\main\\dist')) {
    const directPath = path.join(currentDir, 'preload.js');
    console.log('尝试直接路径:', directPath);
    if (require('fs').existsSync(directPath)) {
      console.log('✅ 使用直接路径');
      return directPath;
    }
  }
  
  // 方法2: 从当前目录向上查找，直到找到项目根目录
  let searchDir = currentDir;
  let attempts = 0;
  const maxAttempts = 5; // 防止无限循环
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`尝试 ${attempts}: 在 ${searchDir} 中查找`);
    
    // 尝试多种可能的路径组合
    const possiblePaths = [
      path.join(searchDir, 'app', 'main', 'dist', 'preload.js'),           // 标准路径
      path.join(searchDir, 'main', 'dist', 'preload.js'),                  // 如果已经在app目录
      path.join(searchDir, 'dist', 'preload.js'),                          // 如果已经在main目录
      path.join(searchDir, 'preload.js')                                   // 如果已经在dist目录
    ];
    
    for (const testPath of possiblePaths) {
      console.log('  检查路径:', testPath);
      if (require('fs').existsSync(testPath)) {
        console.log('✅ 找到preload.js:', testPath);
        return testPath;
      }
    }
    
    // 向上移动一级目录
    const parentDir = path.dirname(searchDir);
    if (parentDir === searchDir) {
      // 已经到达根目录
      break;
    }
    searchDir = parentDir;
  }
  
  // 方法3: 回退到项目根目录的绝对路径
  const projectRoot = path.join(__dirname, '..', '..');
  const fallbackPath = path.join(projectRoot, 'app', 'main', 'dist', 'preload.js');
  console.log('使用回退路径:', fallbackPath);
  return fallbackPath;
}

// 从文件或环境变量读取Vite服务器端口
function getViteServerPort(): number {
  const defaultPort = 5174; // 与vite.config.ts中的配置保持一致
  
  try {
    // 首先检查环境变量
    if (process.env.VITE_SERVER_PORT) {
      const port = parseInt(process.env.VITE_SERVER_PORT, 10);
      if (!isNaN(port) && port > 1024 && port < 65536) {
        console.log(`使用环境变量中的端口: ${port}`);
        return port;
      }
    }
    
    // 然后检查端口文件
    const projectRoot = path.join(__dirname, '..', '..');
    const portFile = path.join(projectRoot, '.vite-port');
    
    if (fsSync.existsSync(portFile)) {
      const portData = fsSync.readFileSync(portFile, 'utf8').trim();
      const port = parseInt(portData, 10);
      if (!isNaN(port) && port > 1024 && port < 65536) {
        console.log(`使用端口文件中的端口: ${port}`);
        return port;
      }
    }
    
    // 回退到默认端口
    console.log(`使用默认端口: ${defaultPort}`);
    return defaultPort;
  } catch (error) {
    console.error('读取端口信息失败:', error);
    return defaultPort;
  }
}

// 创建主窗口
function createWindow() {
  // 使用新的路径查找方法
  const preloadPath = findPreloadPath();
  console.log('预加载脚本路径:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#18181B',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    titleBarStyle: 'default',
    show: false
  });

  // 设置Content Security Policy
  const filter = {
    urls: ['http://localhost:*/*', 'file://*']
  };

  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: https:; " +
          "connect-src 'self' http://localhost:* ws://localhost:*;"
        ]
      }
    });
  });

  // 开发环境加载本地服务器，生产环境加载打包后的文件
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('app.isPackaged:', app.isPackaged);
  
  // 正确的模式判断
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  console.log('应用模式:', isDev ? '开发模式' : '生产模式');
  console.log('模式判断逻辑:', {
    nodeEnv: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development',
    isPackaged: app.isPackaged,
    notPackaged: !app.isPackaged,
    finalIsDev: isDev,
    forceDev: true
  });
  
  if (isDev) {
    handleDevMode(mainWindow);
  } else {
    handleProdMode(mainWindow);
  }

  // 处理开发模式
  function handleDevMode(window: BrowserWindow | null) {
    if (!window) {
      console.error('主窗口未创建，无法加载开发模式');
      return;
    }
    
    console.log('等待Vite开发服务器启动...');
    
    // 获取Vite服务器端口（从配置、环境变量或端口文件）
    const vitePort = getViteServerPort();
    console.log(`使用Vite服务器端口: ${vitePort}`);
    
    // 简化的重试机制
    const maxRetries = 15;
    let retryCount = 0;
    
    const tryLoadWithPort = (port: number) => {
      retryCount++;
      console.log(`尝试连接Vite服务器 (尝试 ${retryCount}/${maxRetries}) - 端口: ${port}`);
      
      window.loadURL(`http://localhost:${port}`)
        .then(() => {
          console.log(`✅ 成功连接到Vite服务器 (端口: ${port})`);
          window.webContents.openDevTools();
        })
        .catch((error) => {
          console.log(`连接失败: ${error.message}`);
          if (retryCount < maxRetries) {
            console.log(`将在 ${retryCount * 1000}ms 后重试...`);
            setTimeout(() => tryLoadWithPort(port), retryCount * 1000); // 递增等待时间
          } else {
            console.error('无法连接到Vite服务器，尝试加载生产版本');
            // 尝试加载生产版本
            const indexPath = path.join(__dirname, '..', '..', 'app', 'renderer', 'dist', 'index.html');
            if (require('fs').existsSync(indexPath)) {
              window.loadFile(indexPath);
            } else {
              console.error('生产版本文件也不存在');
            }
          }
        });
    };
    
    // 初始等待一段时间，给Vite服务器启动时间
    setTimeout(() => {
      // 使用获取到的端口开始重试连接
      tryLoadWithPort(vitePort);
    }, 2000); // 给Vite服务器更多启动时间
  }

  // 处理生产模式
  function handleProdMode(window: BrowserWindow | null) {
    if (!window) {
      console.error('主窗口未创建，无法加载生产模式');
      return;
    }
    
    // 生产环境路径：在打包后的应用中，资源通常位于 resources 目录
    let indexPath = '';
    
    // 尝试多种可能的生产环境路径
    const possiblePaths = [
      path.join(process.cwd(), 'resources', 'app', 'renderer', 'dist', 'index.html'), // 打包后路径
      path.join(process.cwd(), 'resources', 'app.asar', 'app', 'renderer', 'dist', 'index.html'), // ASAR 路径
      path.join(__dirname, '..', '..', 'app', 'renderer', 'dist', 'index.html'), // 开发环境路径
      path.join(__dirname, '..', '..', 'renderer', 'dist', 'index.html') // 备用路径
    ];
    
    let foundPath = null;
    for (const testPath of possiblePaths) {
      console.log('检查生产环境文件路径:', testPath);
      if (require('fs').existsSync(testPath)) {
        console.log('✅ 找到生产文件:', testPath);
        foundPath = testPath;
        break;
      } else {
        console.log('❌ 文件不存在:', testPath);
      }
    }
    
    if (foundPath) {
      console.log('加载生产文件:', foundPath);
      window.loadFile(foundPath);
    } else {
      console.error('所有生产文件路径都不存在，将显示错误页面');
      // 创建一个简单的错误页面
      window.loadURL('data:text/html,<h1>应用加载失败</h1><p>无法找到应用资源文件。</p>');
    }
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 阻止新窗口打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 应用就绪时创建窗口
app.whenReady().then(async () => {
  try {
    console.log('应用就绪，开始初始化...');
    console.log('当前工作目录:', process.cwd());
    console.log('__dirname:', __dirname);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('应用是否打包:', app.isPackaged);

    // 检查用户数据目录权限
    const userDataPath = app.getPath('userData');
    console.log('用户数据目录:', userDataPath);

    try {
      // 测试写入权限
      const testFile = path.join(userDataPath, 'test_permission.txt');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      console.log('写入权限测试成功');
    } catch (error) {
      console.error('写入权限测试失败:', error);
    }

    // 初始化数据库
    console.log('开始初始化数据库...');
    await initializeDatabase();
    console.log('数据库初始化完成');

    // 创建窗口
    console.log('创建主窗口...');
    createWindow();
    console.log('主窗口创建完成');

    // 设置IPC处理器
    setupIPCHandlers();
    setupVariantEngineHandlers();
    console.log('IPC处理器设置完成');

    // 创建菜单
    createMenu(mainWindow);
    console.log('应用菜单创建完成');

    // macOS特有的窗口创建逻辑
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('应用初始化失败:', error);
    dialog.showErrorBox('启动错误', '应用初始化失败，请查看控制台获取详细信息。');
    app.quit();
  }
});

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理退出前的清理
app.on('before-quit', () => {
  // 清理数据库连接等资源
});

// 导出mainWindow供其他模块使用
export { mainWindow };

// 添加到全局变量以便测试脚本访问
global.mainWindow = mainWindow;
console.log('=== 主窗口已设置到全局变量 ===');
