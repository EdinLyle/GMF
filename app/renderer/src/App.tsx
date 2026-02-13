import { useEffect, useState, useRef } from 'react';
import { useStore } from './store/useStore';
import Layout from './components/layout/Layout';
import { applyTheme, watchSystemTheme, getSystemTheme, getCurrentTheme } from './lib/themes';
// import type { RiskLevel } from './types'; // 不需要了

function App() {
  const { setTheme, setViewMode, setSelectedPromptId } = useStore();
  const [isReady, setIsReady] = useState(false);
  const menuListenerRegistered = useRef(false);

  useEffect(() => {
    console.log('=== App.tsx useEffect 开始执行 ===');
    console.log('当前时间:', new Date().toISOString());
    console.log('window.electronAPI:', !!window.electronAPI);
    
    // 防止重复注册
    if (menuListenerRegistered.current) {
      console.log('菜单事件监听器已注册，跳过重复注册');
      return;
    }
    
    // 初始化主题
    console.log('App 初始化主题...');
    const initTheme = () => {
      const currentTheme = getCurrentTheme();
      console.log('从 localStorage 获取的主题:', currentTheme);
      setTheme(currentTheme);

      if (currentTheme === 'system') {
        const systemTheme = getSystemTheme();
        console.log('系统主题:', systemTheme);
        applyTheme(systemTheme);
        const unwatch = watchSystemTheme((systemTheme) => {
          console.log('系统主题变化:', systemTheme);
          applyTheme(systemTheme);
        });
        return unwatch;
      } else {
        console.log('应用主题:', currentTheme);
        applyTheme(currentTheme);
        return () => {};
      }
    };

    const unwatchTheme = initTheme();
    console.log('主题初始化完成');
    
    // 标记应用准备就绪
    setIsReady(true);
    console.log('=== App.tsx 应用已准备就绪 ===');

    // 监听 Electron 菜单事件
    const handleMenuAction = async (_event: any, action: string) => {
      console.log('=== 接收到菜单事件 ===', action);
      console.log('事件时间:', new Date().toISOString());
      console.log('electronAPI可用:', !!window.electronAPI);
      switch (action) {
        case 'menu:new-prompt':
          console.log('执行新建提示词操作 - 直接跳转到编辑页面');
          // 直接跳转到新建提示词页面，不自动创建，不显示弹窗
          setViewMode('detail');
          setSelectedPromptId(null); // null表示新建提示词
          console.log('已跳转到新建提示词页面');
          break;
          
          
        case 'menu:import':
          console.log('执行导入数据操作');
          // 打开文件选择对话框并导入数据
          try {
            console.log('正在打开文件选择对话框...');
            if (window.electronAPI?.file?.selectFile) {
              const filePath = await window.electronAPI.file.selectFile([
                { name: 'JSON Files', extensions: ['json'] }
              ]);
              
              console.log('文件选择结果:', filePath);
              if (filePath) {
                console.log('正在读取文件:', filePath);
                const content = await window.electronAPI.file.readFile(filePath);
                console.log('文件内容长度:', content.length);
                const data = JSON.parse(content);
                console.log('解析的数据结构:', Object.keys(data));
                
                if (window.electronAPI?.database?.importData) {
                  console.log('正在导入数据...');
                  const result = await window.electronAPI.database.importData(data);
                  console.log('导入结果:', result);
                  alert(`数据导入${result.success ? '成功' : '失败'}，共导入 ${result.imported || 0} 项数据`);
                } else {
                  console.error('数据库导入API不可用');
                  alert('数据库导入API不可用');
                }
              } else {
                console.log('用户取消文件选择');
              }
            } else {
              console.error('文件选择API不可用');
              alert('文件选择API不可用，请检查应用是否完全加载');
            }
          } catch (error) {
            console.error('导入数据失败:', error);
            alert('导入数据失败: ' + (error as Error).message);
          }
          break;
          
        case 'menu:export':
          console.log('执行导出数据操作');
          // 导出所有数据到文件
          try {
            if (window.electronAPI?.database?.exportData) {
              const data = await window.electronAPI.database.exportData();
              
              if (window.electronAPI?.file?.saveFile) {
                const filePath = await window.electronAPI.file.saveFile(
                  'prompt-injection-backup.json',
                  [{ name: 'JSON Files', extensions: ['json'] }]
                );
                
                if (filePath) {
                  await window.electronAPI.file.writeFile(filePath, data);
                  alert('数据导出成功！');
                }
              } else {
                alert('文件保存API不可用');
              }
            } else {
              alert('数据库导出API不可用');
            }
          } catch (error) {
            alert('导出数据失败: ' + (error as Error).message);
          }
          break;
          
      }
    };

    if (window.electronAPI?.on) {
      console.log('正在注册菜单事件监听器...');
      // 监听菜单事件
      // 确保只注册一次监听器
      if (!menuListenerRegistered.current) {
        window.electronAPI.on('menu-action', (action: string) => {
          console.log('菜单事件监听器被触发, action:', action);
          handleMenuAction(null, action);
        });
        menuListenerRegistered.current = true;
        console.log('菜单事件监听器已注册 (仅一次)');
      }
      console.log('菜单事件监听器已注册');
      
      // 监听测试进度
      window.electronAPI.on('test-progress', (_event, progress) => {
        console.log('测试进度:', progress);
      });

      // 监听测试完成
      window.electronAPI.on('test-complete', (_event, result) => {
        console.log('测试完成:', result);
      });

      // 监听测试错误
      window.electronAPI.on('test-error', (_event, error) => {
        console.error('测试错误:', error);
      });
    } else {
      console.error('electronAPI.on 不可用');
    }

    return () => {
      if (unwatchTheme && typeof unwatchTheme === 'function') {
        unwatchTheme();
      }

      if (typeof window.electronAPI?.off === 'function') {
        // 移除菜单事件监听器
        // 注意：由于我们在on函数中使用了匿名函数，这里无法直接移除
        // 在实际应用中，应该使用命名函数来更好地管理监听器
      }
    };
  }, [setTheme, setViewMode, setSelectedPromptId]);

  // 显示加载状态
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center">
          <div className="animate-pulse text-lg font-semibold mb-2">正在启动应用...</div>
          <div className="text-sm text-muted-foreground">初始化中，请稍候</div>
        </div>
      </div>
    );
  }

  return <Layout />;
}

export default App;