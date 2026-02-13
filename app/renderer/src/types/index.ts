// ==================== 数据库类型 ====================

// 分类
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: number;
  sort_order?: number;
  created_at: string;
}

// 提示词
export interface Prompt {
  id: number;
  title: string;
  content: string;
  category_id?: number;
  tags?: string;
  created_at: string;
  updated_at: string;
  risk_level: RiskLevel;
  description?: string;
  is_template?: boolean;
  category_name?: string;
}

// 风险等级
export type RiskLevel = 'unknown' | 'low' | 'medium' | 'high' | 'critical';

// 测试结果
export interface TestResult {
  id: number;
  prompt_id?: number;
  model_name: string;
  model_version?: string;
  success: boolean;
  response: string;
  risk_score: number;
  attack_vector?: string;
  detection_difficulty?: number;
  tested_at: string;
}

// 变体
export interface Variant {
  id: number;
  base_prompt_id: number;
  title?: string;
  content: string;
  technique?: string;
  category?: string;
  created_at: string;
}

// 设置
export interface Setting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  updated_at: string;
}

// ==================== 应用类型 ====================

// 视图模式
export type ViewMode = 'list' | 'detail' | 'settings' | 'categories' | 'variants';

// 提示词过滤器
export interface PromptFilters {
  categoryId?: number;
  riskLevel?: RiskLevel;
  search?: string;
}

// 测试配置
export interface TestConfig {
  promptId: number;
  model: string;
  systemPrompt?: string;
  maxTokens?: number;
}

// 测试会话
export interface TestSession {
  id: number;
  name: string;
  model_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  total_tests: number;
  successful_tests: number;
}

// ==================== UI类型 ====================

// 主题
export type Theme = 'system' | 'dark' | 'light' | 'green' | 'gray';

// 主题配置
export interface ThemeConfig {
  name: string;
  value: Theme;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    danger: string;
    warning: string;
    success: string;
  };
}

// 导出格式
export type ExportFormat = 'markdown' | 'json' | 'pdf';

// 导出选项
export interface ExportOptions {
  format: ExportFormat;
  includeResults: boolean;
  includeVariants: boolean;
  filePath?: string;
}

// ==================== AI类型 ====================

// AI模型
export type AIModel = 'deepseek-chat' | 'deepseek-coder';

// AI测试请求
export interface AITestRequest {
  prompt: string;
  model?: AIModel;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

// AI测试响应
export interface AITestResponse {
  success: boolean;
  response: string;
  riskScore: number;
  attackVector: string;
  detectionDifficulty: number;
  model: string;
  modelVersion: string;
  tokensUsed?: number;
}

// 变体生成请求
export interface VariantGenerationRequest {
  basePrompt: string;
  count?: number;
  techniques?: string[];
}

// 变体生成响应
export interface VariantGenerationResponse {
  variants: Variant[];
  totalCount: number;
  generatedAt: string;
}

// ==================== 分析类型 ====================

// 攻击向量
export interface AttackVector {
  name: string;
  description: string;
  severity: RiskLevel;
  examples: string[];
}

// 提示词分析
export interface PromptAnalysis {
  id: string;
  prompt: string;
  attackVectors: AttackVector[];
  riskScore: number;
  riskLevel: RiskLevel;
  mitigationSuggestions: string[];
  generatedVariants?: string[];
}

// ==================== 报告类型 ====================

// 报告摘要
export interface ReportSummary {
  title: string;
  generatedAt: string;
  totalPrompts: number;
  successfulAttacks: number;
  failedAttacks: number;
  riskDistribution: Record<RiskLevel, number>;
}

// 完整报告
export interface FullReport {
  summary: ReportSummary;
  prompts: Prompt[];
  testResults: TestResult[];
  variants?: Variant[];
  recommendations?: string[];
}

// ==================== 状态类型 ====================

// 应用状态
export interface AppState {
  viewMode: ViewMode;
  selectedPromptId: number | null;
  selectedCategoryId: number | null;
  filters: PromptFilters;
  theme: Theme;
  sidebarWidth: number;
  isSidebarOpen: boolean;
  settings: Record<string, any>;
}

// 测试状态
export interface TestState {
  isRunning: boolean;
  currentTest: number;
  totalTests: number;
  progress: number;
  results: TestResult[];
  error?: string;
}

// ==================== Electron API 类型 ====================

export interface ElectronAPI {
  database: {
    getCategories: () => Promise<Category[]>;
    addCategory: (data: Partial<Category>) => Promise<number>;
    updateCategory: (id: number, data: Partial<Category>) => Promise<boolean>;
    deleteCategory: (id: number) => Promise<boolean>;

    getPrompts: (filters?: PromptFilters) => Promise<Prompt[]>;
    getPromptById: (id: number) => Promise<Prompt>;
    addPrompt: (data: Partial<Prompt>) => Promise<number>;
    updatePrompt: (id: number, data: Partial<Prompt>) => Promise<boolean>;
    deletePrompt: (id: number) => Promise<boolean>;

    getTestResults: (promptId?: number) => Promise<TestResult[]>;
    addTestResult: (data: Partial<TestResult>) => Promise<number>;
    deleteTestResult: (id: number) => Promise<boolean>;

    getVariants: (basePromptId: number) => Promise<Variant[]>;
    addVariant: (data: Partial<Variant>) => Promise<number>;
    deleteVariant: (id: number) => Promise<boolean>;

    getSettings: () => Promise<Setting[]>;
    updateSetting: (key: string, value: any) => Promise<boolean>;

    importData: (data: any) => Promise<any>;
    exportData: () => Promise<string>;

    searchPrompts: (query: string) => Promise<Prompt[]>;
  };

  ai: {
    testPrompt: (data: AITestRequest) => Promise<AITestResponse>;
    generateVariants: (data: VariantGenerationRequest) => Promise<VariantGenerationResponse>;
    analyzePrompt: (data: any) => Promise<PromptAnalysis>;
  };

  file: {
    selectFile: (filters: any[]) => Promise<string | null>;
    selectDirectory: () => Promise<string | null>;
    saveFile: (defaultPath: string, filters: any[]) => Promise<string | null>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<boolean>;
  };

  report: {
    exportMarkdown: (data: any, filePath: string) => Promise<boolean>;
    exportJSON: (data: any, filePath: string) => Promise<boolean>;
    exportPDF: (data: any, filePath: string) => Promise<boolean>;
  };

  app: {
    getVersion: () => Promise<string>;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };

  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

