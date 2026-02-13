import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ViewMode,
  Prompt,
  Category,
  Theme,
  PromptFilters,
  TestState
} from '@/types';

// 应用状态接口
interface AppState {
  // 视图状态
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // 选中的项目
  selectedPromptId: number | null;
  setSelectedPromptId: (id: number | null) => void;

  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;

  // 过滤器
  filters: PromptFilters;
  setFilters: (filters: PromptFilters) => void;
  setSearchQuery: (query: string) => void;

  // 主题
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // UI状态
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // 缓存数据
  categories: Category[];
  setCategories: (categories: Category[]) => void;

  prompts: Prompt[];
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: number, prompt: Partial<Prompt>) => void;
  removePrompt: (id: number) => void;

  // 测试状态
  testState: TestState;
  setTestState: (state: Partial<TestState>) => void;
  resetTestState: () => void;

  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // 错误状态
  error: string | null;
  setError: (error: string | null) => void;
}

// 创建store
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始视图模式
      viewMode: 'list',
      setViewMode: (mode) => set({ viewMode: mode }),

      // 选中的项目
      selectedPromptId: null,
      setSelectedPromptId: (id) => set({ selectedPromptId: id }),

      selectedCategoryId: null,
      setSelectedCategoryId: (id) => set((state) => ({
        selectedCategoryId: id,
        filters: { ...state.filters, categoryId: id || undefined }
      })),

      // 过滤器
      filters: {},
      setFilters: (filters) => set({ filters }),
      setSearchQuery: (query) =>
        set((state) => ({
          filters: { ...state.filters, search: query || undefined }
        })),

      // 主题
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // UI状态
      sidebarWidth: 280,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // 缓存数据
      categories: [],
      setCategories: (categories) => set({ categories }),

      prompts: [],
      setPrompts: (prompts) => set({ prompts }),
      addPrompt: (prompt) => set((state) => ({ prompts: [prompt, ...state.prompts] })),
      updatePrompt: async (id, updates) => {
        try {
          if (window.electronAPI?.database) {
            await window.electronAPI.database.updatePrompt(id, updates);
            set((state) => ({
              prompts: state.prompts.map((p) => (p.id === id ? { ...p, ...updates } : p))
            }));
          }
        } catch (error) {
          console.error('更新提示词失败:', error);
        }
      },
      removePrompt: async (id) => {
        try {
          if (window.electronAPI?.database) {
            await window.electronAPI.database.deletePrompt(id);
            set((state) => ({
              prompts: state.prompts.filter((p) => p.id !== id),
              selectedPromptId: state.selectedPromptId === id ? null : state.selectedPromptId
            }));
          }
        } catch (error) {
          console.error('删除提示词失败:', error);
        }
      },

      // 测试状态
      testState: {
        isRunning: false,
        currentTest: 0,
        totalTests: 0,
        progress: 0,
        results: [],
        error: undefined
      },
      setTestState: (updates) =>
        set((state) => ({
          testState: { ...state.testState, ...updates }
        })),
      resetTestState: () =>
        set({
          testState: {
            isRunning: false,
            currentTest: 0,
            totalTests: 0,
            progress: 0,
            results: [],
            error: undefined
          }
        }),

      // 加载状态
      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),

      // 错误状态
      error: null,
      setError: (error) => set({ error })
    }),
    {
      name: 'prompt-injection-manager-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarWidth: state.sidebarWidth,
        isSidebarOpen: state.isSidebarOpen
      })
    }
  )
);

// 持久化存储的配置键
export const STORAGE_KEYS = {
  DEEPSEEK_API_KEY: 'deepseek_api_key',
  DEEPSEEK_MODEL: 'deepseek_model',
  THEME: 'theme',
  SIDEBAR_WIDTH: 'sidebar_width'
};

// 获取存储的配置
export function getStoredSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// 设置存储的配置
export function setStoredSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Failed to store setting:', error);
  }
}

// 移除存储的配置
export function removeStoredSetting(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove setting:', error);
  }
}
