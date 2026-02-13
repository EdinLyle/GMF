import { useEffect, useState } from 'react';
import { Folder, FileText, Settings, ChevronRight, ChevronDown, Plus, Edit, Trash } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { showInputDialog } from '@/components/ui/InputDialog';
import { showConfirmDialog } from '@/components/ui/ConfirmDialog';

// 添加调试日志
console.log('Sidebar组件加载完成');
console.log('electronAPI可用性:', typeof window.electronAPI !== 'undefined');
console.log('database API:', window.electronAPI?.database ? '可用' : '不可用');

export default function Sidebar() {
  const {
    viewMode,
    setViewMode,
    selectedCategoryId,
    setSelectedCategoryId,
    categories,
    setCategories,
    setPrompts,
    setSelectedPromptId
  } = useStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [stats] = useState<Record<string, number>>({});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    categoryId?: number;
  }>({ visible: false, x: 0, y: 0 });
  const [categoryPrompts, setCategoryPrompts] = useState<Record<number, any[]>>({});

  // 加载分类
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      if (window.electronAPI?.database) {
        const cats = await window.electronAPI.database.getCategories();
        setCategories(cats);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadPromptsByCategory = async (categoryId: number) => {
    try {
      if (window.electronAPI?.database) {
        const promptsData = await window.electronAPI.database.getPrompts({ categoryId });
        setCategoryPrompts(prev => ({
          ...prev,
          [categoryId]: promptsData
        }));
        setPrompts(promptsData);
      }
    } catch (error) {
      console.error('加载分类提示词失败:', error);
    }
  };

  // 切换分类展开/收起
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // 选择分类
  const selectCategory = (categoryId: number) => {
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
    } else {
      setSelectedCategoryId(categoryId);
      loadPromptsByCategory(categoryId);
    }
    setViewMode('list');
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, categoryId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('右键菜单触发', { categoryId, x: e.clientX, y: e.clientY });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      categoryId
    });
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    console.log('关闭右键菜单');
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  // 新增分类
  const handleAddCategory = async () => {
    console.log('新增分类被点击');
    const name = await showInputDialog('新增分类', '请输入新分类名称:');
    if (name && window.electronAPI?.database?.addCategory) {
      try {
        await window.electronAPI.database.addCategory({
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          description: '',
          color: '#3B82F6',
          icon: 'folder',
          parent_id: null,
          sort_order: 0
        } as any);
        loadCategories();
        console.log('分类添加成功');
      } catch (error) {
        console.error('添加分类失败:', error);
      }
    }
    closeContextMenu();
  };

  // 重命名分类
  const handleRenameCategory = async () => {
    console.log('重命名分类被点击', contextMenu.categoryId);
    if (!contextMenu.categoryId) return;
    
    const category = categories.find(c => c.id === contextMenu.categoryId);
    if (!category) return;
    
    const newName = await showInputDialog('重命名分类', '请输入新的分类名称:', category.name);
    if (newName && window.electronAPI?.database?.updateCategory) {
      try {
        await window.electronAPI.database.updateCategory(contextMenu.categoryId, {
          name: newName,
          slug: newName.toLowerCase().replace(/\s+/g, '-')
        });
        loadCategories();
        console.log('分类重命名成功');
      } catch (error) {
        console.error('重命名分类失败:', error);
      }
    }
    closeContextMenu();
  };

  // 删除分类
  const handleDeleteCategory = async () => {
    console.log('删除分类被点击', contextMenu.categoryId);
    if (!contextMenu.categoryId) return;
    
    const category = categories.find(c => c.id === contextMenu.categoryId);
    if (!category) return;
    
    const confirmed = await showConfirmDialog('删除分类', `确定要删除分类"${category.name}"吗？此操作不可恢复。`);
    if (confirmed && window.electronAPI?.database?.deleteCategory) {
      try {
        await window.electronAPI.database.deleteCategory(contextMenu.categoryId);
        loadCategories();
        // 如果当前选中的分类被删除，清除选中状态
        if (selectedCategoryId === contextMenu.categoryId) {
          setSelectedCategoryId(null);
        }
        console.log('分类删除成功');
      } catch (error) {
        console.error('删除分类失败:', error);
      }
    }
    closeContextMenu();
  };

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // 导航项配置
  const navItems = [
    { id: 'all', label: '全部提示词', icon: FileText, count: stats['all'] || 0 }
  ];

  return (
    <div className="flex flex-col h-full" onContextMenu={(e) => handleContextMenu(e)}>
      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-2">
          {/* 主要导航 */}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                (item.id === 'all' && viewMode === 'list' && !selectedCategoryId);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'all') {
                      setViewMode('list');
                      setSelectedCategoryId(null);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50 text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span className="text-xs opacity-70">{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 分隔符 */}
          <div className="my-2 h-px bg-border" />

          {/* 分类列表 */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase">
              <span>分类</span>
            </div>

            {categories.map((category) => {
              const hasChildren = categories.some((c) => c.parent_id === category.id);
              const isExpanded = expandedCategories.has(category.id);
              const isActive = selectedCategoryId === category.id && viewMode === 'list';
              const categoryPromptsList = categoryPrompts[category.id] || [];
              const showPrompts = isActive && categoryPromptsList.length > 0;

              return (
                <div key={category.id}>
                  <button
                    onClick={() => selectCategory(category.id)}
                    onContextMenu={(e) => handleContextMenu(e, category.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50 text-foreground'
                    )}
                    style={{ paddingLeft: '12px' }}
                  >
                    {hasChildren && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(category.id);
                        }}
                        className="p-0.5 hover:bg-muted/50 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </button>
                    )}
                    {!hasChildren && <div className="w-4" />}
                    <Folder size={16} className="shrink-0" />
                    <span className="truncate">{category.name}</span>
                    {categoryPromptsList.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {categoryPromptsList.length}
                      </span>
                    )}
                  </button>

                  {/* 显示分类下的提示词列表 */}
                  {showPrompts && (
                    <div className="ml-6 mt-1 space-y-1">
                      {categoryPromptsList.map((prompt) => (
                         <button
                           key={prompt.id}
                           onClick={() => {
                             setSelectedPromptId(prompt.id);
                             setViewMode('detail');
                           }}
                           className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-muted/50 text-foreground transition-colors"
                           title={prompt.title}
                         >
                           <FileText size={12} className="shrink-0" />
                           <span className="truncate">{prompt.title}</span>
                         </button>
                       ))}
                    </div>
                  )}

                  {/* 子分类 */}
                  {hasChildren && isExpanded && (
                    <div className="ml-4 space-y-0.5">
                      {categories
                        .filter((c) => c.parent_id === category.id)
                        .map((subCategory) => (
                          <button
                            key={subCategory.id}
                            onClick={() => selectCategory(subCategory.id)}
                            onContextMenu={(e) => handleContextMenu(e, subCategory.id)}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                              selectedCategoryId === subCategory.id && viewMode === 'list'
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted/50 text-foreground'
                            )}
                          >
                            <div className="w-4" />
                            <Folder size={14} className="shrink-0" />
                            <span className="truncate">{subCategory.name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 底部设置 */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => setViewMode('settings')}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
            viewMode === 'settings'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted/50 text-foreground'
          )}
        >
          <Settings size={16} />
          <span>设置</span>
        </button>
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.categoryId && (
            <button
              onClick={handleAddCategory}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Plus size={14} />
              <span>新增分类</span>
            </button>
          )}
          {contextMenu.categoryId && (
            <>
              <button
                onClick={handleRenameCategory}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Edit size={14} />
                <span>重命名</span>
              </button>
              <button
                onClick={handleDeleteCategory}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash size={14} />
                <span>删除</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}