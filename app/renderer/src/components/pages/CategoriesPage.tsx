import { useEffect, useState } from 'react';
import { FolderPlus, Edit2, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Category } from '@/types';

interface CategoriesPageProps {}

export default function CategoriesPage({}: CategoriesPageProps) {
  const { setViewMode, categories, setCategories } = useStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      if (window.electronAPI?.database) {
        const data = await window.electronAPI.database.getCategories();
        setCategories(data);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData(category);
  };

  const handleAdd = () => {
    setEditingId(0);
    setFormData({
      name: '',
      slug: '',
      description: '',
      color: '#3B82F6',
      icon: 'folder',
      sort_order: categories.length + 1
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (window.electronAPI?.database) {
        if (editingId === 0) {
          await window.electronAPI.database.addCategory(formData);
        } else if (editingId) {
          await window.electronAPI.database.updateCategory(editingId, formData);
        }
        await loadCategories();
        setEditingId(null);
        setFormData({});
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除此分类吗？')) {
      try {
        if (window.electronAPI?.database) {
          await window.electronAPI.database.deleteCategory(id);
          await loadCategories();
        }
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  const handleChange = (field: keyof Category, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-sm font-medium">分类管理</h2>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <FolderPlus size={14} />
          <span>新建分类</span>
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto p-6">
          {/* 新建/编辑表单 */}
          {editingId !== null && (
            <div className="bg-card border border-border rounded-md p-4 mb-6">
              <h3 className="text-sm font-medium mb-4">
                {editingId === 0 ? '新建分类' : '编辑分类'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-2">名称</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="分类名称"
                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">标识</label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="category-slug"
                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm mb-2">描述</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="分类描述"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-2">颜色</label>
                  <input
                    type="color"
                    value={formData.color || '#3B82F6'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-full h-10 bg-background border border-border rounded-md cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">图标</label>
                  <select
                    value={formData.icon || 'folder'}
                    onChange={(e) => handleChange('icon', e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="folder">文件夹</option>
                    <option value="shield">盾牌</option>
                    <option value="zap">闪电</option>
                    <option value="link">链接</option>
                    <option value="users">用户</option>
                    <option value="code">代码</option>
                    <option value="globe">地球</option>
                    <option value="message-circle">消息</option>
                    <option value="search">搜索</option>
                    <option value="cpu">处理器</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">排序</label>
                  <input
                    type="number"
                    value={formData.sort_order || 0}
                    onChange={(e) => handleChange('sort_order', Number(e.target.value))}
                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSaving ? '保存中...' : '保存'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 分类列表 */}
          <div className="bg-card border border-border rounded-md divide-y divide-border">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* 颜色指示器 */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color }}
                  />

                  {/* 分类信息 */}
                  <div>
                    <div className="text-sm font-medium">{category.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-mono">{category.slug}</span>
                      {category.description && `· ${category.description}`}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="编辑"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
