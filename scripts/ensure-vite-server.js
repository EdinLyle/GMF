#!/usr/bin/env node

/**
 * 确保Vite开发服务器正确启动的脚本
 * 这个脚本会在启动Electron应用之前检查并确保Vite服务器正常运行
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// 配置
const VITE_CONFIG_PORT = 5174; // 与vite.config.ts中的配置保持一致
const POSSIBLE_PORTS = [5174, 5173, 5175, 5176, 5177];
const MAX_RETRIES = 20;
const RETRY_DELAY = 1000; // 毫秒

// 检测端口是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 查找可用的Vite服务器端口
async function findViteServer() {
  console.log('🔍 正在查找Vite开发服务器...');
  
  for (const port of POSSIBLE_PORTS) {
    console.log(`  检查端口 ${port}...`);
    const isAvailable = await checkPort(port);
    if (isAvailable) {
      console.log(`✅ 在端口 ${port} 找到Vite服务器`);
      return port;
    }
  }
  
  console.log('❌ 未找到正在运行的Vite服务器');
  return null;
}

// 启动Vite开发服务器
function startViteServer(port = VITE_CONFIG_PORT) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 正在启动Vite开发服务器 (端口: ${port})...`);
    
    const rendererPath = path.join(__dirname, '..', 'app', 'renderer');
    
    // 检查目录是否存在
    if (!fs.existsSync(rendererPath)) {
      reject(new Error(`渲染进程目录不存在: ${rendererPath}`));
      return;
    }
    
    // 启动Vite开发服务器
    const viteProcess = spawn('npx', ['vite', '--port', port, '--host'], {
      cwd: rendererPath,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    // 监听输出
    viteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Vite] ${output.trim()}`);
      
      // 检测到服务器启动成功的标志
      if (output.includes('Local:') || output.includes('ready in')) {
        console.log(`✅ Vite服务器启动成功 (端口: ${port})`);
        resolve({ process: viteProcess, port });
      }
    });
    
    viteProcess.stderr.on('data', (data) => {
      console.error(`[Vite Error] ${data.toString().trim()}`);
    });
    
    viteProcess.on('error', (error) => {
      console.error('❌ 启动Vite服务器失败:', error);
      reject(error);
    });
    
    // 设置超时
    setTimeout(() => {
      viteProcess.kill();
      reject(new Error('Vite服务器启动超时'));
    }, 30000); // 30秒超时
  });
}

// 等待Vite服务器启动
async function waitForViteServer(port, maxRetries = MAX_RETRIES) {
  console.log(`⏳ 等待Vite服务器在端口 ${port} 启动...`);
  
  for (let i = 1; i <= maxRetries; i++) {
    console.log(`  尝试 ${i}/${maxRetries}...`);
    const isReady = await checkPort(port);
    
    if (isReady) {
      console.log(`✅ Vite服务器已就绪 (端口: ${port})`);
      return true;
    }
    
    if (i < maxRetries) {
      console.log(`  等待 ${RETRY_DELAY}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  console.log(`❌ Vite服务器在端口 ${port} 启动失败`);
  return false;
}

// 主函数
async function main() {
  console.log('🚀 启动提示词注入管理工具...');
  console.log('='.repeat(50));
  
  try {
    // 首先检查是否已有Vite服务器运行
    const existingPort = await findViteServer();
    
    if (existingPort) {
      console.log(`✅ 使用现有的Vite服务器 (端口: ${existingPort})`);
      
      // 将端口信息写入环境变量或文件，供主进程使用
      process.env.VITE_SERVER_PORT = existingPort.toString();
      fs.writeFileSync(path.join(__dirname, '..', '.vite-port'), existingPort.toString());
      
      return existingPort;
    }
    
    // 如果没有找到运行的服务器，则启动新的
    console.log('🚀 启动新的Vite开发服务器...');
    
    // 首先尝试配置的端口
    try {
      const result = await startViteServer(VITE_CONFIG_PORT);
      
      // 等待服务器完全启动
      const isReady = await waitForViteServer(VITE_CONFIG_PORT);
      
      if (isReady) {
        console.log(`✅ Vite服务器启动并运行 (端口: ${VITE_CONFIG_PORT})`);
        process.env.VITE_SERVER_PORT = VITE_CONFIG_PORT.toString();
        fs.writeFileSync(path.join(__dirname, '..', '.vite-port'), VITE_CONFIG_PORT.toString());
        return VITE_CONFIG_PORT;
      } else {
        throw new Error('Vite服务器启动失败');
      }
    } catch (error) {
      console.log(`❌ 端口 ${VITE_CONFIG_PORT} 启动失败，尝试其他端口...`);
      
      // 尝试其他端口
      for (const port of POSSIBLE_PORTS.filter(p => p !== VITE_CONFIG_PORT)) {
        try {
          console.log(`🔄 尝试端口 ${port}...`);
          const result = await startViteServer(port);
          
          const isReady = await waitForViteServer(port);
          
          if (isReady) {
            console.log(`✅ Vite服务器在端口 ${port} 启动成功`);
            process.env.VITE_SERVER_PORT = port.toString();
            fs.writeFileSync(path.join(__dirname, '..', '.vite-port'), port.toString());
            return port;
          }
        } catch (portError) {
          console.log(`❌ 端口 ${port} 也启动失败`);
          continue;
        }
      }
      
      throw new Error('所有端口都启动失败');
    }
  } catch (error) {
    console.error('❌ 启动Vite服务器失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().then((port) => {
    console.log('='.repeat(50));
    console.log(`🎉 Vite服务器已准备就绪，端口: ${port}`);
    console.log(`🌐 访问地址: http://localhost:${port}`);
    console.log('='.repeat(50));
    
    // 保持进程运行，以便Electron可以连接
    process.on('SIGINT', () => {
      console.log('\n👋 正在关闭...');
      process.exit(0);
    });
    
    // 返回成功状态
    process.exit(0);
  }).catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { main, findViteServer, startViteServer, waitForViteServer, checkPort };