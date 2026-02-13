import { ipcMain, dialog, shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getDatabase, saveDatabase } from '../database/database';
import { testPrompt as aiTestPrompt, generateVariants as aiGenerateVariants } from '../services/ai';

// 辅助函数：将 sql.js 结果转换为对象数组
function execToObjects(db: any, sql: string, params: any[] = []): any[] {
  const results = db.exec(sql, params);
  if (!results || results.length === 0) return [];
  const result = results[0];
  const columns = result.columns;
  const values = result.values;
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, index: number) => {
      obj[col] = row[index];
    });
    return obj;
  });
}

// 辅助函数：执行单个查询返回对象
function execToObject(db: any, sql: string, params: any[] = []): any | null {
  const results = execToObjects(db, sql, params);
  return results.length > 0 ? results[0] : null;
}

// 辅助函数：执行修改操作
function execRun(db: any, sql: string, params: any[] = []): { changes: number; insertId: number; lastInsertRowId: number } {
  // 处理undefined值，转换为null
  const processedParams = params.map(param => param === undefined ? null : param);
  const result = db.run(sql, processedParams);
  return {
    changes: result.changes || 0,
    insertId: result.insertId || result.lastInsertRowId || 0,
    lastInsertRowId: result.lastInsertRowId || result.insertId || 0
  };
}

// 设置IPC处理器
export function setupIPCHandlers(): void {
  // ==================== 数据库操作 ====================

  // 获取所有分类
  ipcMain.handle('db:getCategories', async () => {
    const db = await getDatabase();
    return execToObjects(db, 'SELECT * FROM categories ORDER BY sort_order');
  });

  // 添加分类
  ipcMain.handle('db:addCategory', async (_event, data: any) => {
    const db = await getDatabase();
    const result = execRun(db, `
      INSERT INTO categories (name, slug, description, color, icon, parent_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [data.name, data.slug, data.description, data.color, data.icon, data.parent_id, data.sort_order]);
    await saveDatabase();
    return result.insertId;
  });

  // 更新分类
  ipcMain.handle('db:updateCategory', async (_event, id: number, data: any) => {
    const db = await getDatabase();
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(key => `${key} = ?`).join(', ');
    const result = execRun(db, `UPDATE categories SET ${setClause} WHERE id = ?`, [...values, id]);
    await saveDatabase();
    return result.changes > 0;
  });

  // 删除分类
  ipcMain.handle('db:deleteCategory', async (_event, id: number) => {
    const db = await getDatabase();
    const result = execRun(db, 'DELETE FROM categories WHERE id = ?', [id]);
    await saveDatabase();
    return result.changes > 0;
  });

  // 获取提示词列表
  ipcMain.handle('db:getPrompts', async (_event, filters?: any) => {
    const db = await getDatabase();
    let query = 'SELECT p.*, c.name as category_name FROM prompts p LEFT JOIN categories c ON p.category_id = c.id';
    const params: any[] = [];

    if (filters?.categoryId) {
      query += ' WHERE p.category_id = ?';
      params.push(filters.categoryId);
    }

    if (filters?.riskLevel) {
      query += (params.length > 0 ? ' AND' : ' WHERE') + ' p.risk_level = ?';
      params.push(filters.riskLevel);
    }

    if (filters?.search) {
      query += (params.length > 0 ? ' AND' : ' WHERE') + ' (p.title LIKE ? OR p.content LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY p.updated_at DESC';

    return execToObjects(db, query, params);
  });

  // 获取单个提示词
  ipcMain.handle('db:getPromptById', async (_event, id: number) => {
    const db = await getDatabase();
    return execToObject(db, 'SELECT * FROM prompts WHERE id = ?', [id]);
  });

  // 添加提示词
  ipcMain.handle('db:addPrompt', async (_event, data: any) => {
    const db = await getDatabase();
    const result = execRun(db, `
      INSERT INTO prompts (title, content, category_id, tags, risk_level, description, is_template)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.title,
      data.content,
      data.category_id !== undefined ? data.category_id : null,
      data.tags !== undefined ? data.tags : '',
      data.risk_level,
      data.description !== undefined ? data.description : '',
      data.is_template !== undefined ? data.is_template : 0
    ]);
    await saveDatabase();
    return result.insertId;
  });

  // 更新提示词
  ipcMain.handle('db:updatePrompt', async (_event, id: number, data: any) => {
    const db = await getDatabase();
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(key => `${key} = ?`).join(', ');
    const result = execRun(db, `UPDATE prompts SET ${setClause} WHERE id = ?`, [...values, id]);
    await saveDatabase();
    return result.changes > 0;
  });

  // 删除提示词
  ipcMain.handle('db:deletePrompt', async (_event, id: number) => {
    const db = await getDatabase();
    const result = execRun(db, 'DELETE FROM prompts WHERE id = ?', [id]);
    await saveDatabase();
    return result.changes > 0;
  });

  // 获取测试结果
  ipcMain.handle('db:getTestResults', async (_event, promptId?: number) => {
    const db = await getDatabase();
    if (promptId) {
      return execToObjects(db, 'SELECT * FROM test_results WHERE prompt_id = ? ORDER BY tested_at DESC', [promptId]);
    }
    return execToObjects(db, 'SELECT * FROM test_results ORDER BY tested_at DESC');
  });

  // 添加测试结果
  ipcMain.handle('db:addTestResult', async (_event, data: any) => {
    const db = await getDatabase();
    const result = execRun(db, `
      INSERT INTO test_results (prompt_id, model_name, model_version, success, response, risk_score, attack_vector, detection_difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.prompt_id, data.model_name, data.model_version, data.success, data.response, data.risk_score, data.attack_vector, data.detection_difficulty]);
    await saveDatabase();
    return result.insertId;
  });

  // 删除测试结果
  ipcMain.handle('db:deleteTestResult', async (_event, id: number) => {
    const db = await getDatabase();
    const result = execRun(db, 'DELETE FROM test_results WHERE id = ?', [id]);
    await saveDatabase();
    return result.changes > 0;
  });

  // 获取变体
  ipcMain.handle('db:getVariants', async (_event, basePromptId: number) => {
    const db = await getDatabase();
    return execToObjects(db, 'SELECT * FROM variants WHERE base_prompt_id = ? ORDER BY created_at DESC', [basePromptId]);
  });

  // 添加变体
  ipcMain.handle('db:addVariant', async (_event, data: any) => {
    try {
      const db = await getDatabase();
      console.log('添加变体数据:', data);
      const result = execRun(db, `
        INSERT INTO variants (base_prompt_id, title, content, technique, category, generated_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [data.base_prompt_id, data.title, data.content, data.technique, data.category, data.generated_by || 'rule']);
      await saveDatabase();
      console.log('变体添加结果:', result);
      // 确保返回有效的ID
      const id = result.insertId || result.lastInsertRowId;
      console.log('变体添加成功，ID:', id);
      return id;
    } catch (error) {
      console.error('添加变体失败:', error);
      throw error;
    }
  });

  // 删除变体
  ipcMain.handle('db:deleteVariant', async (_event, id: number) => {
    const db = await getDatabase();
    const result = execRun(db, 'DELETE FROM variants WHERE id = ?', [id]);
    await saveDatabase();
    return result.changes > 0;
  });

  // 获取设置
  ipcMain.handle('db:getSettings', async () => {
    try {
      const db = await getDatabase();
      const settings = execToObjects(db, 'SELECT * FROM settings');
      console.log('获取设置:', settings);
      return settings;
    } catch (error) {
      console.error('获取设置失败:', error);
      throw error;
    }
  });

  // 更新设置
  ipcMain.handle('db:updateSetting', async (_event, key: string, value: any) => {
    try {
      const db = await getDatabase();
      const type = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'object' ? 'json' : 'string';
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      console.log(`更新设置: ${key} = ${stringValue} (type: ${type})`);
      
      // 首先检查设置是否已存在
      const existing = db.exec('SELECT * FROM settings WHERE key = ?', [key]);
      console.log(`检查现有设置: ${key}`, existing);
      
      const result = execRun(db, `
        INSERT OR REPLACE INTO settings (key, value, type)
        VALUES (?, ?, ?)
      `, [key, stringValue, type]);
      await saveDatabase();
      console.log(`设置更新结果: ${JSON.stringify(result)}`);
      // 检查changes属性是否存在
      const success = result && (result.changes > 0 || result.insertId > 0);
      console.log(`设置更新是否成功: ${success}`);
      
      // 验证设置是否已保存
      const verify = db.exec('SELECT * FROM settings WHERE key = ?', [key]);
      console.log(`验证设置保存: ${key}`, verify);
      
      return success;
    } catch (error) {
      console.error(`更新设置失败: ${key}`, error);
      throw error;
    }
  });

  // 删除设置
  ipcMain.handle('db:deleteSetting', async (_event, key: string) => {
    try {
      const db = await getDatabase();
      console.log(`删除设置: ${key}`);
      const result = execRun(db, 'DELETE FROM settings WHERE key = ?', [key]);
      await saveDatabase();
      console.log(`设置删除结果: ${JSON.stringify(result)}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`删除设置失败: ${key}`, error);
      throw error;
    }
  });

  // 导入数据
  ipcMain.handle('db:importData', async (_event, data: any) => {
    console.log('IPC: 开始导入数据');
    const db = await getDatabase();
    try {
      let importedCount = 0;
      
      // 验证数据结构
      if (!data || typeof data !== 'object') {
        throw new Error('无效的数据格式');
      }
      
      console.log('导入数据类型:', typeof data);
      console.log('数据键:', Object.keys(data));
      
      // 导入分类
      if (data.categories && Array.isArray(data.categories)) {
        console.log('导入分类数量:', data.categories.length);
        for (const category of data.categories) {
          console.log('导入分类:', category.name);
          execRun(db, `
            INSERT OR REPLACE INTO categories (id, name, slug, description, color, icon, parent_id, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            category.id, category.name, category.slug, category.description,
            category.color, category.icon, category.parent_id, category.sort_order || 0
          ]);
          importedCount++;
        }
      }
      
      // 导入提示词
      if (data.prompts && Array.isArray(data.prompts)) {
        console.log('导入提示词数量:', data.prompts.length);
        for (const prompt of data.prompts) {
          console.log('导入提示词:', prompt.title);
          execRun(db, `
            INSERT OR REPLACE INTO prompts (id, title, content, description, category_id, tags, risk_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            prompt.id, prompt.title, prompt.content, prompt.description,
            prompt.category_id, prompt.tags, prompt.risk_level || 'medium',
            prompt.created_at || new Date().toISOString(),
            prompt.updated_at || new Date().toISOString()
          ]);
          importedCount++;
        }
      }
      
      console.log('导入完成，总数:', importedCount);
      await saveDatabase();
      return { success: true, imported: importedCount };
    } catch (error) {
      console.error('导入数据失败:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 导出数据
  ipcMain.handle('db:exportData', async () => {
    const db = await getDatabase();
    const data = {
      categories: execToObjects(db, 'SELECT * FROM categories'),
      prompts: execToObjects(db, 'SELECT * FROM prompts'),
      testResults: execToObjects(db, 'SELECT * FROM test_results'),
      exportedAt: new Date().toISOString()
    };
    
    console.log('导出数据结构:');
    console.log('- 分类数量:', data.categories.length);
    console.log('- 提示词数量:', data.prompts.length);
    console.log('- 测试结果数量:', data.testResults.length);
    return JSON.stringify(data, null, 2);
  });

  // 搜索提示词
  ipcMain.handle('db:searchPrompts', async (_event, query: string) => {
    const db = await getDatabase();
    const searchPattern = `%${query}%`;
    return execToObjects(db, `
      SELECT p.*, c.name as category_name
      FROM prompts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE ? OR p.content LIKE ? OR p.description LIKE ?
      ORDER BY p.updated_at DESC
    `, [searchPattern, searchPattern, searchPattern]);
  });

  // ==================== AI操作 ====================

  // 测试提示词
  ipcMain.handle('ai:testPrompt', async (event, data: any) => {
    try {
      return await aiTestPrompt(data, (progress) => {
        event.sender.send('test-progress', progress);
      });
    } catch (error) {
      event.sender.send('test-error', { message: (error as Error).message });
      throw error;
    }
  });

  // 生成变体
  ipcMain.handle('ai:generateVariants', async (event, data: any) => {
    try {
      // 确保传递正确的参数给AI服务
      const basePrompt = data.basePrompt || data.prompt || '';
      const options = {
        count: data.count || 10,
        techniques: data.techniques || ['obfuscation', 'encoding', 'context_manipulation']
      };
      return await aiGenerateVariants(basePrompt, options, (progress) => {
        event.sender.send('test-progress', progress);
      });
    } catch (error) {
      event.sender.send('test-error', { message: (error as Error).message });
      throw error;
    }
  });

  // 测试DeepSeek API连接
  ipcMain.handle('ai:testConnection', async () => {
    try {
      const { testDeepSeekConnection } = await import('../services/ai');
      return await testDeepSeekConnection();
    } catch (error) {
      console.error('测试DeepSeek连接失败:', error);
      return {
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  });

  // 测试DeepSeek API连接
  ipcMain.handle('settings:testDeepSeekConnection', async (_event, config: any) => {
    try {
      const { testDeepSeekConnection } = await import('../services/ai');
      // 临时保存配置到环境变量，使用与生成变体相同的API调用方式
      process.env.DEEPSEEK_API_KEY = config.apiKey || '';
      
      // 调用AI服务中的测试连接函数
      const result = await testDeepSeekConnection();
      
      // 清理环境变量
      delete process.env.DEEPSEEK_API_KEY;
      
      return result;
    } catch (error) {
      console.error('测试连接失败:', error);
      
      // 清理环境变量
      delete process.env.DEEPSEEK_API_KEY;
      
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  });

  // 分析提示词
  ipcMain.handle('ai:analyzePrompt', async (_event, data: any) => {
    // 实现提示词分析逻辑
    return { analysis: '分析结果', vectors: [] };
  });

  // ==================== 文件操作 ====================

  // 选择文件
  ipcMain.handle('file:selectFile', async (_event, filters: any[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // 选择目录
  ipcMain.handle('file:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // 保存文件
  ipcMain.handle('file:saveFile', async (_event, defaultPath: string, filters: any[]) => {
    const result = await dialog.showSaveDialog({
      defaultPath,
      filters
    });
    return result.canceled ? null : result.filePath;
  });

  // 读取文件
  ipcMain.handle('file:readFile', async (_event, filePath: string) => {
    return await fs.readFile(filePath, 'utf-8');
  });

  // 写入文件
  ipcMain.handle('file:writeFile', async (_event, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  });


  // ==================== 应用控制 ====================

  // 获取版本
  ipcMain.handle('app:getVersion', () => {
    return '1.0.0';
  });

  // 最小化窗口
  ipcMain.handle('app:minimize', () => {
    const { BrowserWindow } = require('electron');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) focusedWindow.minimize();
  });

  // 最大化窗口
  ipcMain.handle('app:maximize', () => {
    const { BrowserWindow } = require('electron');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      if (focusedWindow.isMaximized()) {
        focusedWindow.unmaximize();
      } else {
        focusedWindow.maximize();
      }
    }
  });

  // 关闭窗口
  ipcMain.handle('app:close', () => {
    const { BrowserWindow } = require('electron');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) focusedWindow.close();
  });
}



// 设置变体引擎处理器
export function setupVariantEngineHandlers() {
  // 获取变体技术列表
  ipcMain.handle('variant:getTechniques', async () => {
    try {
      const { VARIANT_TECHNIQUES } = await import('../services/variantEngine');
      // 只返回可序列化的数据，移除函数属性
      return VARIANT_TECHNIQUES.map(technique => ({
        id: technique.id,
        name: technique.name,
        description: technique.description,
        category: technique.category
      }));
    } catch (error) {
      console.error('获取变体技术失败:', error);
      throw error;
    }
  });

  // 生成变体
  ipcMain.handle('variant:generateVariants', async (_event, basePrompt: string, techniqueIds: string[]) => {
    try {
      const { generateVariants } = await import('../services/variantEngine');
      const variants = generateVariants(basePrompt, techniqueIds);
      
      // 添加创建时间并确保所有属性都是可序列化的
      const variantsWithTimestamp = variants.map(variant => ({
        id: variant.id,
        title: variant.title,
        content: variant.content,
        technique: variant.technique,
        category: variant.category,
        description: variant.description,
        created_at: new Date().toISOString()
      }));
      
      return variantsWithTimestamp;
    } catch (error) {
      console.error('生成变体失败:', error);
      throw error;
    }
  });
}
