// 扩展全局Window接口
export interface ElectronAPI {
  // 数据库操作
  database: {
    getCategories: () => Promise<any[]>;
    addCategory: (data: any) => Promise<number>;
    updateCategory: (id: number, data: any) => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;

    getPrompts: (filters?: any) => Promise<any[]>;
    getPromptById: (id: number) => Promise<any>;
    addPrompt: (data: any) => Promise<number>;
    updatePrompt: (id: number, data: any) => Promise<void>;
    deletePrompt: (id: number) => Promise<void>;

    getTestResults: (promptId?: number) => Promise<any[]>;
    addTestResult: (data: any) => Promise<number>;
    deleteTestResult: (id: number) => Promise<void>;

    getVariants: (basePromptId: number) => Promise<any[]>;
    addVariant: (data: any) => Promise<number>;
    deleteVariant: (id: number) => Promise<void>;

    getSettings: () => Promise<Record<string, any>>;
    updateSetting: (key: string, value: any) => Promise<boolean>;
    deleteSetting: (key: string) => Promise<boolean>;

    importData: (data: any) => Promise<{ success: boolean; imported: number; error?: string }>;
    exportData: () => Promise<any>;
    searchPrompts: (query: string) => Promise<any[]>;
  };

  // 设置操作
  settings: {
    testDeepSeekConnection: (config: any) => Promise<{ success: boolean; message: string }>;
  };

  // AI测试操作
  ai: {
    testPrompt: (data: any) => Promise<any>;
    generateVariants: (data: any) => Promise<any>;
    analyzePrompt: (data: any) => Promise<any>;
    testConnection: () => Promise<{ success: boolean; message: string }>;
  };

  // 变体引擎
  variantEngine: {
    getTechniques: () => Promise<VariantTechnique[]>;
    generateVariants: (basePrompt: string, techniqueIds: string[]) => Promise<Variant[]>;
  };

  // 文件操作
  file: {
    selectFile: (filters: any[]) => Promise<string | null>;
    selectDirectory: () => Promise<string | null>;
    saveFile: (defaultPath: string, filters: any[]) => Promise<string | null>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<boolean>;
  };

  // 报告导出
  report: {
    exportMarkdown: (data: any, filePath: string) => Promise<boolean>;
    exportJSON: (data: any, filePath: string) => Promise<boolean>;
    exportPDF: (data: any, filePath: string) => Promise<boolean>;
  };

  // 应用控制
  app: {
    getVersion: () => string;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };

  // 事件监听
  on: (channel: string, listener: (...args: any[]) => void) => void;
  off: (channel: string, listener: (...args: any[]) => void) => void;
}

// 变体技术接口
export interface VariantTechnique {
  id: string;
  name: string;
  description: string;
  category: string;
  generate: (basePrompt: string) => string;
}

// 变体接口
export interface Variant {
  id: string;
  title: string;
  content: string;
  technique: string;
  category: string;
  description: string;
  created_at: string;
}

// 扩展全局Window接口
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};