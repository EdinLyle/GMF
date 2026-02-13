import { contextBridge, ipcRenderer } from 'electron';

// 向渲染进程暴露的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据库操作
  database: {
    getCategories: () => ipcRenderer.invoke('db:getCategories'),
    addCategory: (data: any) => ipcRenderer.invoke('db:addCategory', data),
    updateCategory: (id: number, data: any) => ipcRenderer.invoke('db:updateCategory', id, data),
    deleteCategory: (id: number) => ipcRenderer.invoke('db:deleteCategory', id),

    getPrompts: (filters?: any) => ipcRenderer.invoke('db:getPrompts', filters),
    getPromptById: (id: number) => ipcRenderer.invoke('db:getPromptById', id),
    addPrompt: (data: any) => ipcRenderer.invoke('db:addPrompt', data),
    updatePrompt: (id: number, data: any) => ipcRenderer.invoke('db:updatePrompt', id, data),
    deletePrompt: (id: number) => ipcRenderer.invoke('db:deletePrompt', id),

    getTestResults: (promptId?: number) => ipcRenderer.invoke('db:getTestResults', promptId),
    addTestResult: (data: any) => ipcRenderer.invoke('db:addTestResult', data),
    deleteTestResult: (id: number) => ipcRenderer.invoke('db:deleteTestResult', id),

    getVariants: (basePromptId: number) => ipcRenderer.invoke('db:getVariants', basePromptId),
    addVariant: (data: any) => ipcRenderer.invoke('db:addVariant', data),
    deleteVariant: (id: number) => ipcRenderer.invoke('db:deleteVariant', id),

    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    updateSetting: (key: string, value: any) => ipcRenderer.invoke('db:updateSetting', key, value),
    deleteSetting: (key: string) => ipcRenderer.invoke('db:deleteSetting', key),

    importData: (data: any) => ipcRenderer.invoke('db:importData', data),
    exportData: () => ipcRenderer.invoke('db:exportData'),

    searchPrompts: (query: string) => ipcRenderer.invoke('db:searchPrompts', query)
  },

  // 设置操作
  settings: {
    testDeepSeekConnection: (config: any) => ipcRenderer.invoke('settings:testDeepSeekConnection', config)
  },

  // AI测试操作
  ai: {
    testPrompt: (data: any) => ipcRenderer.invoke('ai:testPrompt', data),
    generateVariants: (data: any) => ipcRenderer.invoke('ai:generateVariants', data),
    analyzePrompt: (data: any) => ipcRenderer.invoke('ai:analyzePrompt', data),
    testConnection: () => ipcRenderer.invoke('ai:testConnection')
  },

  // 变体引擎
  variantEngine: {
    getTechniques: () => ipcRenderer.invoke('variant:getTechniques'),
    generateVariants: (basePrompt: string, techniqueIds: string[]) => ipcRenderer.invoke('variant:generateVariants', basePrompt, techniqueIds)
  },

  // 文件操作
  file: {
    selectFile: (filters: any[]) => ipcRenderer.invoke('file:selectFile', filters),
    selectDirectory: () => ipcRenderer.invoke('file:selectDirectory'),
    saveFile: (defaultPath: string, filters: any[]) => ipcRenderer.invoke('file:saveFile', defaultPath, filters),
    readFile: (path: string) => ipcRenderer.invoke('file:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('file:writeFile', path, content)
  },

  // 报告导出
  report: {
    exportMarkdown: (data: any, filePath: string) => ipcRenderer.invoke('report:exportMarkdown', data, filePath),
    exportJSON: (data: any, filePath: string) => ipcRenderer.invoke('report:exportJSON', data, filePath),
    exportPDF: (data: any, filePath: string) => ipcRenderer.invoke('report:exportPDF', data, filePath)
  },

  // 应用控制
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close')
  },

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'test-progress',
      'test-complete',
      'test-error',
      'database-changed',
      'setting-changed',
      'menu-action'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => {
        console.log('preload: 接收到事件', channel, '参数:', args);
        // 对于menu-action事件，确保第一个参数是action
        if (channel === 'menu-action' && args.length > 0) {
          console.log('preload: 调用回调函数，参数:', args[0]);
          callback(args[0]);
        } else {
          callback(...args);
        }
      });
    }
  },

  // 事件监听移除
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback as any);
  }
});

// 调试日志
console.log('预加载脚本已加载，electronAPI已暴露');

// TypeScript类型声明
declare global {
  interface Window {
    electronAPI: {
      database: any;
      ai: any;
      file: any;
      report: any;
      app: any;
      settings: any;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      off: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}
