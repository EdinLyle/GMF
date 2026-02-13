import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import PromptList from '../prompt/PromptList';
import PromptDetail from '../prompt/PromptDetail';
import SettingsPage from '../pages/SettingsPage';
import CategoriesPage from '../pages/CategoriesPage';
import VariantsPage from '@/components/prompt/VariantsPage';

export default function MainContent() {
  const { viewMode, selectedPromptId, filters, prompts, setPrompts, isLoading, setIsLoading, setError, error, setCategories } = useStore();

  // 加载提示词列表
  useEffect(() => {
    if (viewMode === 'list') {
      loadPrompts();
    }
  }, [viewMode, filters]);

  // 加载分类数据
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      if (window.electronAPI?.database) {
        const categoryData = await window.electronAPI.database.getCategories();
        setCategories(categoryData);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadPrompts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI?.database) {
        const data = await window.electronAPI.database.getPrompts(filters);
        setPrompts(data);
      } else {
        throw new Error('Electron API 不可用，请检查预加载脚本是否正确加载');
      }
    } catch (error) {
      console.error('加载提示词失败:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 显示错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 mb-2 text-lg font-semibold">加载失败</div>
          <div className="text-sm text-muted-foreground mb-4">{error}</div>
          <button
            onClick={loadPrompts}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 根据视图模式渲染内容
  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return <PromptList prompts={prompts} isLoading={isLoading} />;

      case 'detail':
        return <PromptDetail promptId={selectedPromptId} />;

      case 'settings':
        return <SettingsPage />;

      case 'categories':
        return <CategoriesPage />;

      case 'variants':
        return <VariantsPage promptId={selectedPromptId} />;

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">未知视图模式</p>
          </div>
        );
    }
  };

  return (
    <main className="flex-1 overflow-hidden">
      {renderContent()}
    </main>
  );
}
