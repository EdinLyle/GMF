import React from 'react';
import { FileText, Trash2, Edit2, AlertTriangle, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn, riskLevelColors, riskLevelLabels, formatDate, truncateText } from '@/lib/utils';
import type { Prompt } from '@/types';

interface PromptListProps {
  prompts: Prompt[];
  isLoading: boolean;
}

export default function PromptList({ prompts, isLoading }: PromptListProps) {
  const { setViewMode, setSelectedPromptId, removePrompt } = useStore();

  const handleSelect = (prompt: Prompt) => {
    setSelectedPromptId(prompt.id);
    setViewMode('detail');
  };

  const handleEdit = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    setSelectedPromptId(prompt.id);
    setViewMode('detail');
  };

  const handleDelete = async (e: React.MouseEvent, promptId: number) => {
    e.stopPropagation();
    if (window.confirm('确定要删除此提示词吗？')) {
      try {
        await removePrompt(promptId);
      } catch (error) {
        console.error('删除提示词失败:', error);
      }
    }
  };

  const handleVariant = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    setSelectedPromptId(prompt.id);
    setViewMode('variants');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <FileText size={48} className="text-muted-foreground/50" />
        <div className="text-sm text-muted-foreground">
          暂无提示词，点击上方"新建"按钮创建
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-4">
        {/* 列表头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">提示词列表</div>
          <div className="text-xs text-muted-foreground">{prompts.length} 项</div>
        </div>

        {/* 列表内容 */}
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => handleSelect(prompt)}
              className="group relative bg-card border border-border rounded-md p-4 hover:border-primary/50 transition-all cursor-pointer"
            >
              {/* 风险等级指示器 */}
              <div
                className={cn(
                  'absolute left-0 top-4 bottom-4 w-1 rounded-r',
                  riskLevelColors[prompt.risk_level]
                )}
              />

              {/* 内容 */}
              <div className="pl-3">
                {/* 标题和操作按钮 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate mb-1">
                      {prompt.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {truncateText(prompt.content, 100)}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleVariant(e, prompt)}
                      className="p-1.5 hover:bg-purple-500/10 text-purple-500 rounded transition-colors"
                      title="生成变体"
                    >
                      <Sparkles size={14} />
                    </button>
                    <button
                      onClick={(e) => handleEdit(e, prompt)}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, prompt.id)}
                      className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 元数据 */}
                <div className="flex items-center gap-3 text-xs">
                  {/* 风险等级 */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded',
                      {
                        'bg-gray-500/10 text-gray-700 dark:text-gray-300': prompt.risk_level === 'unknown',
                        'bg-green-500/10 text-green-700 dark:text-green-300': prompt.risk_level === 'low',
                        'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300': prompt.risk_level === 'medium',
                        'bg-orange-500/10 text-orange-700 dark:text-orange-300': prompt.risk_level === 'high',
                        'bg-red-500/10 text-red-700 dark:text-red-300': prompt.risk_level === 'critical'
                      }
                    )}
                  >
                    <AlertTriangle size={12} className={
                      prompt.risk_level === 'unknown' ? 'text-gray-500' :
                      prompt.risk_level === 'low' ? 'text-green-500' :
                      prompt.risk_level === 'medium' ? 'text-yellow-500' :
                      prompt.risk_level === 'high' ? 'text-orange-500' :
                      'text-red-500'
                    } />
                    <span>{riskLevelLabels[prompt.risk_level]}</span>
                  </span>

                  {/* 分类 */}
                  {prompt.category_name && (
                    <span className="text-muted-foreground">{prompt.category_name}</span>
                  )}

                  {/* 更新时间 */}
                  <span className="text-muted-foreground ml-auto">
                    {formatDate(prompt.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
