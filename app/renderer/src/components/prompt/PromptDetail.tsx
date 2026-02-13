import { useEffect, useState } from 'react';
import { Save, ArrowLeft, Trash2, Copy, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { copyToClipboard } from '@/lib/utils';
import type { Prompt, RiskLevel } from '@/types';

interface PromptDetailProps {
  promptId: number | null;
}

export default function PromptDetail({ promptId }: PromptDetailProps) {
  const { setViewMode, prompts, updatePrompt, addPrompt, categories } = useStore();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: undefined as number | undefined,
    risk_level: 'unknown' as RiskLevel,
    description: '',
    tags: '',
    is_template: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // 加载提示词数据
  useEffect(() => {
    if (promptId) {
      const prompt = prompts.find((p) => p.id === promptId);
      if (prompt) {
        setFormData({
          title: prompt.title,
          content: prompt.content,
          category_id: prompt.category_id,
          risk_level: prompt.risk_level,
          description: prompt.description || '',
          tags: prompt.tags || '',
          is_template: prompt.is_template || false
        });
        setIsNew(false);
      }
    } else {
      // 新建模式
      setFormData({
        title: '',
        content: '',
        category_id: undefined,
        risk_level: 'unknown' as RiskLevel,
        description: '',
        tags: '',
        is_template: false
      });
      setIsNew(true);
    }
  }, [promptId, prompts]);

  // 加载分类数据
  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (window.electronAPI?.database?.getCategories) {
          const categoryData = await window.electronAPI.database.getCategories();
          useStore.getState().setCategories(categoryData);
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    };

    if (categories.length === 0) {
      loadCategories();
    }
  }, [categories]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (window.electronAPI?.database) {
        // 预处理数据，确保没有undefined值
        const processedData = {
          title: formData.title,
          content: formData.content,
          category_id: formData.category_id,
          tags: formData.tags !== undefined ? formData.tags : '',
          risk_level: formData.risk_level,
          description: formData.description !== undefined ? formData.description : '',
          is_template: formData.is_template !== undefined ? formData.is_template : false
        };

        if (isNew) {
          const id = await window.electronAPI.database.addPrompt(processedData);
          const newPrompt: Prompt = {
            id: id as number,
            ...processedData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          addPrompt(newPrompt);
          useStore.getState().setSelectedPromptId(id as number);
          setIsNew(false);
        } else if (promptId) {
          updatePrompt(promptId, processedData);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (promptId && window.confirm('确定要删除此提示词吗？')) {
      try {
        if (window.electronAPI?.database) {
          await window.electronAPI.database.deletePrompt(promptId);
          useStore.getState().removePrompt(promptId);
          setViewMode('list');
        }
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(formData.content);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleGenerateVariants = () => {
    useStore.getState().setSelectedPromptId(promptId);
    setViewMode('variants');
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="返回列表"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-sm font-medium">
            {isNew ? '新建提示词' : '编辑提示词'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Copy size={14} />
            <span>{isCopied ? '已复制' : '复制'}</span>
          </button>

          {!isNew && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-destructive border border-border hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 size={14} />
              <span>删除</span>
            </button>
          )}

          <button
            onClick={handleGenerateVariants}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-500/90 transition-colors"
          >
            <Sparkles size={14} />
            <span>生成变体</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-success text-success-foreground rounded-md hover:bg-success/90 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? '保存中...' : '保存'}</span>
          </button>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              标题 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="输入提示词标题"
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              提示词内容 <span className="text-destructive">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="输入提示词内容..."
              rows={12}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono resize-none"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {formData.content.length} 字符
            </div>
          </div>

          {/* 风险等级和分类 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 风险等级 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                风险等级
              </label>
              <select
                value={formData.risk_level}
                onChange={(e) => handleChange('risk_level', e.target.value)}
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="unknown">未知</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">严重</option>
              </select>
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                分类
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) =>
                  handleChange('category_id', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">未分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              标签
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="输入标签，用逗号分隔"
              className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="输入提示词描述..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
