import React, { useState } from 'react';
import { Search, Plus, Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { applyTheme } from '@/lib/themes';

interface HeaderProps {}

export default function Header({}: HeaderProps) {
  const {
    viewMode,
    setViewMode,
    setSearchQuery,
    filters,
    theme,
    setTheme,
    isSidebarOpen,
    toggleSidebar
  } = useStore();

  const [searchValue, setSearchValue] = useState(filters.search || '');

  // 处理搜索
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchQuery(searchValue);
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchValue('');
    setSearchQuery('');
  };

  // 切换主题 - 修复主题切换功能
  const handleThemeChange = () => {
    console.log('Header: 开始切换主题，当前主题:', theme);
    const themes: Array<'dark' | 'light' | 'green' | 'gray'> = ['dark', 'light', 'green', 'gray'];
    const currentIndex = themes.indexOf(theme as any);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    console.log('Header: 切换到下一个主题:', nextTheme);
    
    // 更新store中的主题
    setTheme(nextTheme);
    
    // 应用主题到DOM
    applyTheme(nextTheme);
    
    // 保存主题到localStorage
    try {
      localStorage.setItem('theme', nextTheme);
      console.log('Header: 主题已保存到localStorage:', nextTheme);
    } catch (error) {
      console.error('Header: 保存主题失败:', error);
    }
    
    console.log('Header: 主题切换完成');
  };

  // 获取主题图标
  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'green':
        return '🌿';
      case 'gray':
        return '⚪';
      default:
        return '🌙';
    }
  };

  return (
    <header className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 electron-drag">
      {/* 左侧：侧边栏切换和搜索 */}
      <div className="flex items-center gap-3">
        {/* 侧边栏切换按钮 */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-muted rounded transition-colors electron-no-drag"
          title={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        >
          {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="relative electron-no-drag flex items-center">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜索提示词..."
            className="w-64 h-8 pl-8 pr-8 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded transition-colors"
              title="清除搜索"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
          <button
            type="submit"
            className="ml-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            搜索
          </button>
        </form>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2 electron-no-drag">
        {/* 新建按钮 */}
        <button
          onClick={() => {
            useStore.getState().setViewMode('detail');
            useStore.getState().setSelectedPromptId(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          <span>新建</span>
        </button>

        {/* 分隔符 */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* 主题切换按钮 - 点击切换不同主题 */}
        <button
          onClick={handleThemeChange}
          className="p-1.5 hover:bg-muted rounded transition-colors electron-no-drag"
          title={`切换主题 (${theme}) - 点击切换到下一个主题`}
        >
          <span className="text-base cursor-pointer">{getThemeIcon()}</span>
        </button>

        {/* 设置按钮 */}
        <button
          onClick={() => setViewMode('settings')}
          className={cn(
            'p-1.5 hover:bg-muted rounded transition-colors',
            viewMode === 'settings' && 'bg-muted text-primary'
          )}
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}