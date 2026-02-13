import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 声明process类型
declare const process: {
  env: {
    NODE_ENV: string;
  };
};

// 检查Electron API是否可用
console.log('渲染进程启动，检查Electron API...');
console.log('window.electronAPI:', window.electronAPI);
console.log('当前环境:', process.env.NODE_ENV);

// 添加全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  console.error('错误文件:', event.filename);
  console.error('错误行号:', event.lineno);
  console.error('错误列号:', event.colno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
});

// 初始化应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
