import { useEffect, useState, useCallback } from 'react';
import { Save, Shield, Palette } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { themes, applyTheme } from '@/lib/themes';
import { cn } from '@/lib/utils';
import type { Setting } from '@/types';

// 导入二维码图片
const qrWechat = new URL('../../../public/assets/qrcodes/wechat.png', import.meta.url).href;
const qrGroup1 = new URL('../../../public/assets/qrcodes/group1.png', import.meta.url).href;
const qrGroup2 = new URL('../../../public/assets/qrcodes/group2.png', import.meta.url).href;
const qrKnowledge = new URL('../../../public/assets/qrcodes/knowledge.png', import.meta.url).href;

interface SettingsPageProps {}

export default function SettingsPage({}: SettingsPageProps) {
  const { theme, setTheme } = useStore();

  // 初始设置值
  const [settings, setSettings] = useState<Record<string, any>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // 加载设置
  useEffect(() => {
    console.log('SettingsPage 组件挂载，开始加载设置...');
    loadSettings();
    
    // 添加一个定时器来定期检查设置
    const interval = setInterval(() => {
      console.log('当前设置状态:', settings);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      console.log('开始加载设置...');
      if (window.electronAPI?.database) {
        console.log('调用数据库API获取设置...');
        const settingsData = await window.electronAPI.database.getSettings();
        console.log('从数据库加载的设置:', settingsData);
        
        if (!Array.isArray(settingsData)) {
          console.error('数据库返回的设置不是数组:', settingsData);
          return;
        }
        
        const settingsMap: Record<string, any> = {};
        settingsData.forEach((s: Setting) => {
          try {
            let value: any = s.value;
            if (s.type === 'number') value = Number(value);
            else if (s.type === 'boolean') value = value === 'true';
            else if (s.type === 'json') {
              try {
                value = JSON.parse(value);
              } catch (parseError) {
                console.error(`解析JSON设置 ${s.key} 失败:`, parseError);
                value = s.value;
              }
            }
            
            // 数据库中存储的是下划线格式，前端也使用相同的格式
            settingsMap[s.key] = value;
          } catch (error) {
            console.error(`处理设置项 ${s.key} 失败:`, error);
          }
        });
        console.log('转换后的设置Map:', settingsMap);
        
        // 特别检查DeepSeek相关设置
        console.log('DeepSeek API Key:', settingsMap.deepseek_api_key ? '已设置' : '未设置');
        console.log('DeepSeek API Endpoint:', settingsMap.deepseek_api_endpoint || '默认');
        console.log('DeepSeek Model:', settingsMap.deepseek_model || '默认');
        
        setSettings(settingsMap);
        console.log('设置状态已更新');
      } else {
        console.error('electronAPI.database 不存在');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  // 测试DeepSeek API连接
  const handleTestConnection = async () => {
    console.log('handleTestConnection 被调用');
    setIsTesting(true);
    setTestResult(null);

    try {
      console.log('测试DeepSeek API连接...');
      console.log('当前设置:', settings);
      
      // 获取当前配置
      const apiKey = settings.deepseek_api_key ?? '';
      const apiEndpoint = settings.deepseek_api_endpoint || 'https://api.deepseek.com/chat/completions';
      const model = settings.deepseek_model || 'deepseek-chat';

      console.log('API Key:', apiKey ? '已设置' : '未设置');
      console.log('API Endpoint:', apiEndpoint);
      console.log('Model:', model);

      if (!apiKey) {
        setTestResult({ success: false, message: '请先输入API密钥' });
        return;
      }

      // 通过主进程测试连接，避免CSP限制
      console.log('调用 window.electronAPI.settings.testDeepSeekConnection');
      const result = await window.electronAPI.settings.testDeepSeekConnection({
        apiKey,
        apiEndpoint,
        model
      });
      
      console.log('测试连接结果:', result);
      setTestResult(result);
    } catch (error) {
      console.error('测试连接失败:', error);
      setTestResult({
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '网络错误'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 删除配置
  const handleDeleteConfig = async () => {
    try {
      if (window.electronAPI?.database) {
        console.log('开始删除配置...');
        // 删除DeepSeek相关配置
        // 注意：数据库中存储的是下划线格式，但我们需要使用点格式进行删除
        const configKeys = [
          'deepseek_api_key',
          'deepseek_api_endpoint',
          'deepseek_model'
        ];
        
        let successCount = 0;
        for (const key of configKeys) {
          console.log(`正在删除配置: ${key}`);
          const result = await window.electronAPI.database.deleteSetting(key);
          console.log(`删除 ${key} 结果:`, result);
          if (result) {
            successCount++;
          }
        }
        
        console.log(`成功删除 ${successCount}/${configKeys.length} 个配置`);
        
        // 强制刷新设置状态，确保删除效果立即生效
        await loadSettings();
        
        // 显示成功提示
        if (successCount === configKeys.length) {
          setTestResult({ success: true, message: '配置已删除' });
        } else {
          setTestResult({
            success: false,
            message: `删除配置失败: 仅成功删除 ${successCount}/${configKeys.length} 个配置`
          });
        }
        
        // 3秒后清除提示
        setTimeout(() => setTestResult(null), 3000);
      } else {
        console.error('electronAPI.database 不存在');
        setTestResult({
          success: false,
          message: '删除配置失败: 数据库API不可用'
        });
      }
    } catch (error) {
      console.error('删除配置失败:', error);
      setTestResult({
        success: false,
        message: `删除配置失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  };

  // 处理输入变化
  const handleChange = useCallback((key: string, value: any) => {
    console.log(`设置变化: ${key} = ${value}`);
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      console.log('新设置状态:', newSettings);
      return newSettings;
    });
  }, []);

  // 保存设置
  const handleSave = async () => {
    console.log('handleSave 被调用');
    setIsSaving(true);
    console.log('开始保存设置:', settings);

    try {
      if (window.electronAPI?.database) {
        console.log('electronAPI.database 存在');
        let successCount = 0;
        
        // 确保保存所有相关设置
        // 注意：数据库中存储的是下划线格式
        const settingsToSave = {
          'deepseek_api_key': settings.deepseek_api_key ?? '',
          'deepseek_api_endpoint': settings.deepseek_api_endpoint ?? '', // 允许用户自定义，不强制默认值
          'deepseek_model': settings.deepseek_model ?? 'deepseek-chat',
          'ui_theme': theme // 也保存当前主题
        };

        console.log('要保存的设置项:', settingsToSave);

        for (const [key, value] of Object.entries(settingsToSave)) {
          console.log(`保存设置项: ${key} = ${value}`);
          try {
            const result = await window.electronAPI.database.updateSetting(key, value);
            console.log(`设置项 ${key} 保存结果:`, result);
            if (result) {
              successCount++;
              console.log(`设置项 ${key} 保存成功`);
            } else {
              console.error(`设置项 ${key} 保存失败，返回:`, result);
            }
          } catch (err) {
            console.error(`保存设置项 ${key} 失败:`, err);
          }
        }
        
        console.log(`共保存了 ${successCount}/${Object.keys(settingsToSave).length} 个设置项`);
        
        // 只有在所有设置都保存成功时才刷新设置
        if (successCount === Object.keys(settingsToSave).length) {
          // 刷新设置以确保保存成功
          await loadSettings();
          // 显示保存成功提示（使用控制台日志替代）
          console.log('✅ 设置已保存成功');
        } else {
          console.error(`保存设置失败: 仅成功保存 ${successCount}/${Object.keys(settingsToSave).length} 个设置项`);
          // 显示保存失败提示
          console.error('保存设置失败');
        }
        
      } else {
        console.error('electronAPI.database 不存在:', window.electronAPI);
        throw new Error('数据库API不可用');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      // 使用console.error作为临时替代方案，因为没有showMessage方法
      console.error('保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 处理主题切换
  const handleThemeChange = useCallback((newTheme: string) => {
    console.log('切换主题:', newTheme);
    // 更新 store
    setTheme(newTheme as any);
    // 应用主题到 DOM
    applyTheme(newTheme as any);
    // 持久化主题设置到 localStorage
    try {
      localStorage.setItem('theme', newTheme);
      console.log('主题已保存到 localStorage:', newTheme);
    } catch (error) {
      console.error('保存主题失败:', error);
    }
  }, [setTheme]);

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Shield size={18} />
          <h2 className="text-sm font-medium">设置</h2>
        </div>

        <button
          onClick={() => {
            console.log('点击保存按钮');
            handleSave();
          }}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? '保存中...' : '保存'}</span>
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* DeepSeek API 配置 */}
          <section>
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Shield size={16} />
              DeepSeek API 配置
            </h3>

            <div className="bg-card border border-border rounded-md p-4 space-y-4">
              {/* API 密钥 */}
              <div>
                <label className="block text-sm mb-2">
                  API 密钥 <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.deepseek_api_key ?? ''}
                    onChange={(e) => {
                      console.log('API Key 输入变化:', e.target.value);
                      handleChange('deepseek_api_key', e.target.value);
                    }}
                    onFocus={() => console.log('API Key 输入框获得焦点')}
                    onBlur={() => console.log('API Key 输入框失去焦点')}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full h-10 px-3 pr-10 text-sm bg-background border border-border rounded-md"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  在 DeepSeek 控制台获取 API 密钥
                </div>
              </div>

              {/* API 端点 (Base URL) */}
              <div>
                <label className="block text-sm mb-2">API 端点 (Base URL)</label>
                <input
                  type="text"
                  value={settings.deepseek_api_endpoint ?? ''}
                  onChange={(e) => {
                    console.log('API Endpoint 输入变化:', e.target.value);
                    handleChange('deepseek_api_endpoint', e.target.value);
                  }}
                  onFocus={() => console.log('API Endpoint 输入框获得焦点')}
                  onBlur={() => console.log('API Endpoint 输入框失去焦点')}
                  placeholder="https://api.deepseek.com/"
                  className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md"
                />
              </div>

              {/* 默认模型 */}
              <div>
                <label className="block text-sm mb-2">默认模型</label>
                <select
                  value={settings.deepseek_model ?? 'deepseek-chat'}
                  onChange={(e) => {
                    console.log('Model 选择变化:', e.target.value);
                    handleChange('deepseek_model', e.target.value);
                  }}
                  onFocus={() => console.log('Model 选择框获得焦点')}
                  onBlur={() => console.log('Model 选择框失去焦点')}
                  className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md"
                >
                  <option value="deepseek-chat">DeepSeek Chat (通用)</option>
                  <option value="deepseek-reasoner">DeepSeek Reasoner (代码)</option>
                </select>
              </div>

              {/* 测试连接 */}
              <div className="pt-4 border-t border-border">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      console.log('点击测试连接按钮');
                      handleTestConnection();
                    }}
                    disabled={isTesting || !settings.deepseek_api_key}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTesting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        测试中...
                      </>
                    ) : (
                      <>
                        <Shield size={14} />
                        测试连接
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleDeleteConfig}
                    disabled={!settings.deepseek_api_key && !settings.deepseek_api_endpoint && !settings.deepseek_model}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Shield size={14} />
                    删除配置
                  </button>
                </div>
                
                {testResult && (
                  <div className={`mt-3 p-3 rounded-md text-sm ${
                    testResult.success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      ) : (
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✗</span>
                        </div>
                      )}
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>


          {/* 外观设置 */}
          <section>
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Palette size={16} />
              外观
            </h3>

            <div className="bg-card border border-border rounded-md p-4 space-y-4">
              {/* 主题选择 */}
              <div>
                <label className="block text-sm mb-3">主题</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(themes) as [string, any][]).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 border-2 rounded-md transition-all',
                        theme === key
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: config.colors.primary }}
                      />
                      <span className="text-xs">{config.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 关于 */}
          <section>
            <h3 className="text-sm font-medium mb-4">关于</h3>

            <div className="bg-card border border-border rounded-md p-4 text-sm text-muted-foreground space-y-4">
              <div>AI安全提示词注入管理工具 v1.0.0</div>
              <div className="pt-2 border-t border-border">
                请勿利用工具内的相关技术从事非法渗透测试，由于传播、利用此工具所提供的信息而造成的任何直接或者间接的后果及损失，均由使用者本人负责，作者不为此承担任何责任。
              </div>
              
              {/* 二维码区域 */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-xs font-medium mb-3">支持与联系</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                      <img src={qrWechat} alt="我的微信" className="w-full h-full object-contain" onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement!;
                        parent.innerHTML = '<div class="text-xs text-gray-400 p-2 text-center">微信二维码<br/>(图片加载失败)</div>';
                        parent.className = 'w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center mb-2';
                      }} />
                    </div>
                    <span className="text-xs">作者微信</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                      <img src={qrGroup1} alt="工具交流群" className="w-full h-full object-contain" onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement!;
                        parent.innerHTML = '<div class="text-xs text-gray-400 p-2 text-center">群二维码<br/>(图片加载失败)</div>';
                        parent.className = 'w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center mb-2';
                      }} />
                    </div>
                    <span className="text-xs">本工具交流群</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                      <img src={qrGroup2} alt="威胁情报推送群" className="w-full h-full object-contain" onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement!;
                        parent.innerHTML = '<div class="text-xs text-gray-400 p-2 text-center">群二维码<br/>(图片加载失败)</div>';
                        parent.className = 'w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center mb-2';
                      }} />
                    </div>
                    <span className="text-xs">钉钉威胁情报推送群</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                      <img src={qrKnowledge} alt="网络安全知识库" className="w-full h-full object-contain" onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement!;
                        parent.innerHTML = '<div class="text-xs text-gray-400 p-2 text-center">知识库二维码<br/>(图片加载失败)</div>';
                        parent.className = 'w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center mb-2';
                      }} />
                    </div>
                    <span className="text-xs">Ima网络安全知识库</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
