import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ArrowLeft, Sparkles, Copy, Save, RotateCcw, Wand2, Bot, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VariantTechnique } from '@/types/electron-api';

interface VariantsPageProps {
  promptId: number | null;
}

export default function VariantsPage({ promptId }: VariantsPageProps) {
  const { setViewMode, prompts } = useStore();
  const [prompt, setPrompt] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMethod, setGenerationMethod] = useState<'direct' | 'ai' | 'rule'>('direct');
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [selectedDirectTechniques, setSelectedDirectTechniques] = useState<string[]>([]);
  const [aiSettings, setAiSettings] = useState({
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2000
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [ruleTechniques, setRuleTechniques] = useState<VariantTechnique[]>([]);
  const [currentGeneratedVariants, setCurrentGeneratedVariants] = useState<any[]>([]);
  const [savedVariants, setSavedVariants] = useState<any[]>([]);

  // 加载提示词数据
  useEffect(() => {
    if (promptId) {
      const foundPrompt = prompts.find(p => p.id === promptId);
      if (foundPrompt) {
        setPrompt(foundPrompt);
        loadVariants(promptId);
        loadRuleTechniques();
      }
    }
  }, [promptId, prompts]);

  // 加载规则技术
  const loadRuleTechniques = async () => {
    try {
      if (window.electronAPI?.variantEngine) {
        const techniques = await window.electronAPI.variantEngine.getTechniques();
        setRuleTechniques(techniques);
        // 默认选择前3个技术用于规则变体
        if (techniques.length > 0) {
          setSelectedTechniques(techniques.slice(0, 3).map((t: any) => t.id));
        }
        // 默认选择编码变体用于编码变体
        const directTechniques = techniques.filter(t => t.category === '编码变体');
        if (directTechniques.length > 0) {
          setSelectedDirectTechniques(directTechniques.slice(0, 2).map((t: any) => t.id));
        }
      }
    } catch (error) {
      console.error('加载规则技术失败:', error);
    }
  };

  const loadVariants = async (id: number) => {
    try {
      if (window.electronAPI?.database) {
        const variantsData = await window.electronAPI.database.getVariants(id);
        setSavedVariants(variantsData);
      }
    } catch (error) {
      console.error('加载变体失败:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    try {
      const result = await window.electronAPI.ai.testConnection();
      setConnectionStatus(result);
    } catch (error) {
      console.error('测试连接失败:', error);
      setConnectionStatus({
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleGenerateVariants = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    try {
      let generatedVariants: any[] = [];
      
      if (generationMethod === 'direct') {
        // 编码变体方式生成变体
        generatedVariants = generateDirectVariants(prompt.content);
      } else if (generationMethod === 'ai' && window.electronAPI?.ai) {
        // AI方式生成变体
        const variants = await window.electronAPI.ai.generateVariants({
          basePrompt: prompt.content,
          count: 5,
          techniques: ['direct_override', 'encoding', 'role_play', 'indirect', 'emotional']
        });
        
        console.log('AI生成的变体:', variants);
        
        // 转换格式以匹配现有代码
        generatedVariants = variants.map((variant: any, index: number) => ({
          id: Date.now() + index,
          base_prompt_id: prompt?.id || 0,
          title: `${variant.technique ? variant.technique.replace('AI-', '') : 'AI'}变体`,
          content: variant.text || variant.content || '',
          technique: variant.technique || 'AI变体',
          category: variant.category || 'AI变体',
          description: variant.description || 'AI生成的提示词注入变体',
          created_at: new Date().toISOString(),
          generatedBy: 'ai'
        }));
        
        // 过滤掉已存在的变体
        generatedVariants = generatedVariants.filter((newVariant: any) => {
          const existsInTemp = currentGeneratedVariants.some(v =>
            v.content === newVariant.content &&
            v.technique === newVariant.technique &&
            v.generatedBy === 'ai'
          );
          
          const existsInSaved = savedVariants.some(v =>
            v.content === newVariant.content &&
            v.technique === newVariant.technique
          );
          
          return !existsInTemp && !existsInSaved;
        });
      } else if (generationMethod === 'rule' && window.electronAPI?.variantEngine) {
        // 规则方式生成变体
        const newVariants = await window.electronAPI.variantEngine.generateVariants(prompt.content, selectedTechniques);
        
        // 过滤掉已存在的变体
        generatedVariants = newVariants.filter((newVariant: any) => {
          const existsInTemp = currentGeneratedVariants.some(v =>
            v.content === newVariant.content &&
            v.technique === newVariant.technique &&
            v.generatedBy === 'rule'
          );
          
          const existsInSaved = savedVariants.some(v =>
            v.content === newVariant.content &&
            v.technique === newVariant.technique
          );
          
          return !existsInTemp && !existsInSaved;
        });
      }
      
      // 为每个变体添加生成方式标识
      const variantsWithMethod = generatedVariants.map(variant => ({
        ...variant,
        generatedBy: generationMethod,
        isTemporary: true // 标记为临时变体
      }));
      
      // 将新变体添加到临时存储中，而不是替换
      setCurrentGeneratedVariants(prev => [...prev, ...variantsWithMethod]);
    } catch (error) {
      console.error('生成变体失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDirectVariants = (content: string) => {
    // 获取选中的编码变体
    const selectedTechniques = ruleTechniques.filter(t =>
      selectedDirectTechniques.includes(t.id) && t.category === '编码变体'
    );

    if (selectedTechniques.length === 0) {
      // 如果没有选择任何技术，返回空数组
      return [];
    }

    return selectedTechniques.map((technique, index) => {
      // 使用变体引擎生成内容
      let transformedContent = content;
      try {
        if (window.electronAPI?.variantEngine) {
          // 这里我们模拟技术生成，因为编码变体应该是预定义的简单转换
          switch (technique.id) {
            case 'base64_encoding':
              const bytes = new TextEncoder().encode(content);
              const binString = String.fromCodePoint(...bytes);
              transformedContent = btoa(binString);
              break;
            case 'url_encoding':
              transformedContent = encodeURIComponent(content);
              break;
            case 'reverse_string':
              transformedContent = content.split('').reverse().join('');
              break;
            default:
              transformedContent = content;
          }
        }
      } catch (e) {
        console.error('编码变体转换失败:', e);
        transformedContent = content;
      }

      return {
        id: Date.now() + index,
        base_prompt_id: prompt?.id || 0,
        title: `${technique.name}变体`,
        content: transformedContent,
        technique: technique.name,
        category: '编码变体',
        created_at: new Date().toISOString(),
        generatedBy: 'direct'
      };
    }).filter((newVariant: any) => {
      // 过滤掉已存在的变体（检查临时存储和已保存存储）
      const existsInTemp = currentGeneratedVariants.some(v =>
        v.content === newVariant.content &&
        v.technique === newVariant.technique &&
        v.generatedBy === 'direct'
      );
      
      const existsInSaved = savedVariants.some(v =>
        v.content === newVariant.content &&
        v.technique === newVariant.technique
      );
      
      return !existsInTemp && !existsInSaved;
    });
  };

  const handleSaveVariant = async (variant: any) => {
    try {
      if (window.electronAPI?.database && prompt) {
        // 检查是否已存在相同内容的变体
        const exists = savedVariants.some(saved =>
          saved.content === variant.content &&
          saved.technique === variant.technique &&
          saved.base_prompt_id === prompt.id
        );
        
        if (exists) {
          console.log('变体已存在，不重复保存');
          // 将临时变体标记为已保存
          setCurrentGeneratedVariants(prev =>
            prev.map(v => v.id === variant.id ? { ...v, isTemporary: false } : v)
          );
          return;
        }
        
        // 保存到数据库
        console.log('正在保存变体:', variant);
        const savedId = await window.electronAPI.database.addVariant({
          base_prompt_id: prompt.id,
          title: variant.title,
          content: variant.content,
          technique: variant.technique,
          category: variant.category,
          generated_by: variant.generatedBy || 'rule'
        });
        
        console.log('变体保存成功，ID:', savedId);
        // 确保ID是有效的
        if (savedId === undefined || savedId === null) {
          console.error('保存变体返回的ID无效:', savedId);
          throw new Error('保存变体失败：返回的ID无效');
        }
        
        // 将临时变体标记为已保存，并更新ID
        setCurrentGeneratedVariants(prev =>
          prev.map(v => v.id === variant.id ? { ...v, isTemporary: false, id: savedId } : v)
        );
        
        // 重新加载已保存的变体
        await loadVariants(prompt.id);
        console.log('已重新加载变体');
      }
    } catch (error) {
      console.error('保存变体失败:', error);
      alert(`保存变体失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleCopyVariant = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      // 可以添加复制成功的提示
    });
  };

  const handleDeleteVariant = async (variant: any) => {
    try {
      if (window.electronAPI?.database && prompt) {
        // 如果是已保存的变体，从数据库中删除
        if (!variant.isTemporary) {
          await window.electronAPI.database.deleteVariant(Number(variant.id));
          // 重新加载已保存的变体
          await loadVariants(prompt.id);
        }
        
        // 从临时存储中移除
        setCurrentGeneratedVariants(prev => prev.filter(v => v.id !== variant.id));
      }
    } catch (error) {
      console.error('删除变体失败:', error);
    }
  };

  const handleBack = () => {
    setViewMode('list');
  };

  const isTechniqueAlreadySaved = (techniqueId: string) => {
    const technique = ruleTechniques.find(t => t.id === techniqueId);
    if (!technique) return false;
    
    // 生成测试内容来判断是否已存在
    let testContent = prompt?.content || '';
    let transformedContent = testContent;
    
    switch (techniqueId) {
      case 'base64_encoding':
        const bytes = new TextEncoder().encode(testContent);
        const binString = String.fromCodePoint(...bytes);
        transformedContent = btoa(binString);
        break;
      case 'url_encoding':
        transformedContent = encodeURIComponent(testContent);
        break;
      case 'reverse_string':
        transformedContent = testContent.split('').reverse().join('');
        break;
      default:
        // 对于其他技术，使用变体引擎生成
        if (window.electronAPI?.variantEngine) {
          try {
            const testVariant = ruleTechniques.find(t => t.id === techniqueId);
            if (testVariant) {
              transformedContent = testVariant.generate(testContent);
            }
          } catch (e) {
            transformedContent = testContent;
          }
        }
    }
    
    return savedVariants.some(saved =>
      saved.content === transformedContent &&
      saved.technique === technique.name &&
      saved.base_prompt_id === prompt?.id
    );
  };

  const getFilteredVariants = () => {
    // 获取当前生成方式的临时变体
    const tempVariants = currentGeneratedVariants.filter(variant => variant.generatedBy === generationMethod);
    
    // 获取当前生成方式的已保存变体
    const savedVariantsOfType = savedVariants.filter(variant => {
      // 使用数据库中的generated_by字段进行过滤
      if (variant.generated_by) {
        return variant.generated_by === generationMethod;
      } else {
        // 如果没有generated_by字段（旧数据），则使用原有的判断逻辑作为回退
        if (generationMethod === 'direct') {
          // 编码变体：只包含预定义的编码技术
          return ['Base64编码', 'URL编码', '字符串反转'].includes(variant.technique);
        } else if (generationMethod === 'rule') {
          // 规则变体：排除编码变体和明确标记为AI的变体
          return !['Base64编码', 'URL编码', '字符串反转'].includes(variant.technique) &&
                 !(variant.technique && (variant.technique.includes('AI') || variant.technique.includes('ai')));
        } else if (generationMethod === 'ai') {
          // AI优化变体：技术名称明确包含AI且不是编码变体
          return variant.technique && (variant.technique.includes('AI') || variant.technique.includes('ai')) &&
                 !['Base64编码', 'URL编码', '字符串反转'].includes(variant.technique);
        }
      }
      return false;
    });
    
    // 合并临时变体和已保存变体，避免重复（基于内容和技术）
    const allVariants = [...tempVariants];
    savedVariantsOfType.forEach(savedVariant => {
      const exists = allVariants.some(v =>
        v.content === savedVariant.content &&
        v.technique === savedVariant.technique
      );
      if (!exists) {
        allVariants.push({ ...savedVariant, generatedBy: savedVariant.generated_by || generationMethod, isTemporary: false });
      }
    });
    
    return allVariants;
  };

  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">未找到提示词</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-semibold">生成变体</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            为提示词 "{prompt.title}" 生成变体
          </div>
        </div>

        {/* 原提示词预览 */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="text-sm font-medium mb-2">原提示词</h3>
          <div className="text-sm text-muted-foreground bg-background p-3 rounded border">
            {prompt.content}
          </div>
        </div>

        {/* 生成选项 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">生成方式</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setGenerationMethod('direct')}
              className={cn(
                'px-4 py-2 text-sm rounded-md border transition-colors',
                generationMethod === 'direct'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              )}
            >
              <Copy size={14} className="inline-block mr-1" />
              编码变体
            </button>
            <button
              onClick={() => setGenerationMethod('rule')}
              className={cn(
                'px-4 py-2 text-sm rounded-md border transition-colors',
                generationMethod === 'rule'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              )}
            >
              <Wand2 size={14} className="inline-block mr-1" />
              规则变体
            </button>
            <button
              onClick={() => setGenerationMethod('ai')}
              className={cn(
                'px-4 py-2 text-sm rounded-md border transition-colors',
                generationMethod === 'ai'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              )}
            >
              <Bot size={14} className="inline-block mr-1" />
              AI优化
            </button>
          </div>

          {/* 编码变体选择 */}
          {generationMethod === 'direct' && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-sm font-medium mb-3">选择编码变体</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {ruleTechniques.filter(t => t.category === '编码变体').map((technique) => {
                  const isAlreadySaved = isTechniqueAlreadySaved(technique.id);
                  return (
                    <button
                      key={technique.id}
                      onClick={() => {
                        if (!isAlreadySaved) {
                          setSelectedDirectTechniques(prev =>
                            prev.includes(technique.id)
                              ? prev.filter(id => id !== technique.id)
                              : [...prev, technique.id]
                          );
                        }
                      }}
                      className={cn(
                        'p-2 text-xs rounded border transition-colors',
                        selectedDirectTechniques.includes(technique.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : isAlreadySaved
                          ? 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      )}
                      title={isAlreadySaved ? `${technique.description} (已保存)` : technique.description}
                      disabled={isAlreadySaved}
                    >
                      <div className="font-medium">{technique.name}</div>
                      <div className="text-xs opacity-75 mt-1">{technique.category}</div>
                      {isAlreadySaved && <div className="text-xs text-green-500 mt-1">✓ 已保存</div>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                已选择 {selectedDirectTechniques.length} 项技术
              </div>
            </div>
          )}

          {/* 规则技术选择 */}
          {generationMethod === 'rule' && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-sm font-medium mb-3">选择变体技术</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {ruleTechniques.filter(t => !['base64_encoding', 'url_encoding', 'reverse_string'].includes(t.id)).map((technique) => {
                  const isAlreadySaved = isTechniqueAlreadySaved(technique.id);
                  return (
                    <button
                      key={technique.id}
                      onClick={() => {
                        if (!isAlreadySaved) {
                          setSelectedTechniques(prev =>
                            prev.includes(technique.id)
                              ? prev.filter(id => id !== technique.id)
                              : [...prev, technique.id]
                          );
                        }
                      }}
                      className={cn(
                        'p-2 text-xs rounded border transition-colors',
                        selectedTechniques.includes(technique.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : isAlreadySaved
                          ? 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      )}
                      title={isAlreadySaved ? `${technique.description} (已保存)` : technique.description}
                      disabled={isAlreadySaved}
                    >
                      <div className="font-medium">{technique.name}</div>
                      <div className="text-xs opacity-75 mt-1">{technique.category}</div>
                      {isAlreadySaved && <div className="text-xs text-green-500 mt-1">✓ 已保存</div>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                已选择 {selectedTechniques.filter(id => !['base64_encoding', 'url_encoding', 'reverse_string'].includes(id)).length} 项技术
              </div>
            </div>
          )}

          {/* AI设置 */}
          {generationMethod === 'ai' && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">AI设置</h4>
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className={cn(
                    'px-3 py-1 text-xs rounded border transition-colors',
                    isTestingConnection
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                  )}
                >
                  {isTestingConnection ? '测试中...' : '测试连接'}
                </button>
              </div>
              
              {connectionStatus && (
                <div className={cn(
                  'mb-3 p-2 rounded text-xs',
                  connectionStatus.success
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                )}>
                  {connectionStatus.message}
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">模型</label>
                  <select
                    value={aiSettings.model}
                    onChange={(e) => setAiSettings({...aiSettings, model: e.target.value})}
                    className="w-full mt-1 px-2 py-1 text-sm bg-background border border-border rounded"
                  >
                    <option value="deepseek-chat">DeepSeek Chat</option>
                    <option value="deepseek-reasoner">DeepSeek Coder</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">温度</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={aiSettings.temperature}
                    onChange={(e) => setAiSettings({...aiSettings, temperature: parseFloat(e.target.value)})}
                    className="w-full mt-1"
                  />
                  <div className="text-xs text-center mt-1">{aiSettings.temperature}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">最大令牌数</label>
                  <input
                    type="number"
                    value={aiSettings.maxTokens}
                    onChange={(e) => setAiSettings({...aiSettings, maxTokens: parseInt(e.target.value)})}
                    className="w-full mt-1 px-2 py-1 text-sm bg-background border border-border rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 生成按钮 */}
        <div className="mb-6">
          <button
            onClick={handleGenerateVariants}
            disabled={isGenerating}
            className={cn(
              'px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <>
                <RotateCcw size={16} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                生成变体
              </>
            )}
          </button>
        </div>

        {/* 变体列表 */}
        <div>
          <h3 className="text-sm font-medium mb-3">生成的变体 ({getFilteredVariants().length})</h3>
          <div className="space-y-3">
            {getFilteredVariants().map((variant, index) => (
              <div key={`${variant.id}-${index}`} className="p-4 bg-card border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">{variant.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {variant.category}
                    </span>
                    <button
                      onClick={() => handleCopyVariant(variant.content)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="复制"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleSaveVariant(variant)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        variant.isTemporary
                          ? 'hover:bg-green-500/10 text-green-500'
                          : 'text-muted-foreground opacity-50 cursor-not-allowed'
                      )}
                      title={variant.isTemporary ? "保存" : "已保存"}
                      disabled={!variant.isTemporary}
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteVariant(variant)}
                      className="p-1 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded border font-mono text-xs">
                  {variant.content}
                </div>
                {variant.technique && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    技术: {variant.technique}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}