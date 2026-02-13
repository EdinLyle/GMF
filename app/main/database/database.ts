import initSqlJs, { Database } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { app } from 'electron';

// 数据库路径
const dbPath = path.join(app.getPath('userData'), 'prompt-injection-manager.db');

// 数据库实例
let db: Database | null = null;

// 获取数据库实例
async function getDatabase(): Promise<Database> {
  if (!db) {
    console.log('初始化 sql.js...');

    try {
      // 初始化 sql.js - 使用默认配置自动查找 wasm 文件
      const SQL = await initSqlJs();
      console.log('sql.js 初始化成功');

      // 尝试从文件加载数据
      let data: Uint8Array | null = null;
      try {
        console.log('尝试从文件加载数据:', dbPath);
        const buffer = await fs.readFile(dbPath);
        data = new Uint8Array(buffer);
        console.log('数据库文件加载成功，大小:', buffer.length, '字节');
      } catch (error) {
        console.log('数据库文件不存在或无法读取，创建新数据库:', (error as Error).message);
        // 文件不存在，创建新数据库
      }

      db = new SQL.Database(data);
      console.log('数据库实例创建成功');
    } catch (error) {
      console.error('sql.js 初始化失败:', error);
      throw error;
    }
  }
  return db;
}

// 保存数据库到文件
async function saveDatabase(): Promise<void> {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    await fs.writeFile(dbPath, buffer);
  }
}

// 初始化数据库
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('开始初始化数据库...');

    const database = await getDatabase();
    console.log('数据库实例获取成功');

    // 先创建表（不使用索引）
    const tables = [
      'CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, description TEXT, color TEXT, icon TEXT, parent_id INTEGER, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (parent_id) REFERENCES categories(id))',
      'CREATE TABLE IF NOT EXISTS prompts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, category_id INTEGER, tags TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, risk_level TEXT DEFAULT "unknown" CHECK(risk_level IN ("unknown", "low", "medium", "high", "critical")), description TEXT, is_template BOOLEAN DEFAULT 0, FOREIGN KEY (category_id) REFERENCES categories(id))',
      'CREATE TABLE IF NOT EXISTS test_results (id INTEGER PRIMARY KEY AUTOINCREMENT, prompt_id INTEGER, model_name TEXT NOT NULL, model_version TEXT, success BOOLEAN, response TEXT, risk_score INTEGER CHECK(risk_score >= 0 AND risk_score <= 100), attack_vector TEXT, detection_difficulty INTEGER CHECK(detection_difficulty >= 1 AND detection_difficulty <= 10), tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (prompt_id) REFERENCES prompts(id))',
      'CREATE TABLE IF NOT EXISTS variants (id INTEGER PRIMARY KEY AUTOINCREMENT, base_prompt_id INTEGER NOT NULL, title TEXT, content TEXT NOT NULL, technique TEXT, category TEXT, generated_by TEXT DEFAULT "rule" CHECK(generated_by IN ("direct", "rule", "ai")), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (base_prompt_id) REFERENCES prompts(id))',
      'CREATE TABLE IF NOT EXISTS prompt_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL, template_content TEXT NOT NULL, description TEXT, variables TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
      'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT, type TEXT DEFAULT "string" CHECK(type IN ("string", "number", "boolean", "json")), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
      'CREATE TABLE IF NOT EXISTS test_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, model_name TEXT NOT NULL, status TEXT DEFAULT "pending" CHECK(status IN ("pending", "running", "completed", "failed")), started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP, total_tests INTEGER DEFAULT 0, successful_tests INTEGER DEFAULT 0)',
      'CREATE TABLE IF NOT EXISTS session_tests (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, prompt_id INTEGER NOT NULL, variant_id INTEGER, test_result_id INTEGER, order_index INTEGER DEFAULT 0, FOREIGN KEY (session_id) REFERENCES test_sessions(id), FOREIGN KEY (prompt_id) REFERENCES prompts(id), FOREIGN KEY (variant_id) REFERENCES variants(id), FOREIGN KEY (test_result_id) REFERENCES test_results(id))'
    ];

    for (const tableSql of tables) {
      try {
        console.log('创建表:', tableSql.substring(0, 50) + '...');
        database.run(tableSql);
        console.log('表创建成功');
      } catch (error) {
        console.error('创建表失败:', tableSql, error);
      }
    }

    // 检查并添加generated_by字段（如果表已存在但没有该字段）
    try {
      console.log('检查是否需要添加generated_by字段...');
      
      // 尝试查询generated_by字段，如果不存在则会抛出错误
      try {
        database.exec('SELECT generated_by FROM variants LIMIT 1');
        console.log('generated_by字段已存在');
      } catch (error) {
        console.log('generated_by字段不存在，需要添加...');
        // 添加generated_by字段
        database.run('ALTER TABLE variants ADD COLUMN generated_by TEXT DEFAULT "rule" CHECK(generated_by IN ("direct", "rule", "ai"))');
        console.log('generated_by字段添加成功');
      }
    } catch (error) {
      console.error('检查或添加generated_by字段时出错:', error);
    }

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_prompts_risk_level ON prompts(risk_level)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_prompt ON test_results(prompt_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_model ON test_results(model_name)',
      'CREATE INDEX IF NOT EXISTS idx_variants_base_prompt ON variants(base_prompt_id)',
      'CREATE INDEX IF NOT EXISTS idx_session_tests_session ON session_tests(session_id)'
    ];

    for (const indexSql of indexes) {
      try {
        console.log('创建索引:', indexSql);
        database.run(indexSql);
        console.log('索引创建成功');
      } catch (error) {
        console.error('创建索引失败:', indexSql, error);
      }
    }

    // 检查是否需要初始化数据
    const categoryResult = database.exec('SELECT COUNT(*) as count FROM categories');
    const settingResult = database.exec('SELECT COUNT(*) as count FROM settings');

    const categoryCount = categoryResult[0]?.values[0]?.[0] as number || 0;
    const settingCount = settingResult[0]?.values[0]?.[0] as number || 0;

    console.log('现有数据统计 - 分类:', categoryCount, '设置:', settingCount);

    if (categoryCount === 0 || settingCount === 0) {
      console.log('需要初始化数据...');
      await seedDatabase(database);
    }

    // 保存数据库
    await saveDatabase();
    console.log('数据库保存成功');

    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 填充初始数据
async function seedDatabase(database: Database): Promise<void> {
  try {
    console.log('开始填充初始数据...');

    // 尝试多个可能的路径
    let seedPath = '';
    const possiblePaths = [
      path.join(process.cwd(), 'resources', 'database', 'seed_data.json'), // 打包后路径（资源目录）
      path.join(process.cwd(), '..', 'resources', 'database', 'seed_data.json'), // 打包后备用路径
      path.join(__dirname, '..', '..', '..', 'resources', 'database', 'seed_data.json'), // 打包后备用路径2
      path.join(__dirname, '..', '..', 'database', 'seed_data.json'), // 开发环境路径
      path.join(process.cwd(), 'database', 'seed_data.json'), // 开发环境路径
      path.join(process.cwd(), '..', 'database', 'seed_data.json') // 开发环境备用路径
    ];

    let seedData = null;
    for (const testPath of possiblePaths) {
      console.log('尝试路径:', testPath);
      try {
        const data = await fs.readFile(testPath, 'utf-8');
        seedData = JSON.parse(data);
        seedPath = testPath;
        console.log('成功加载种子数据:', seedPath);
        break;
      } catch (error) {
        console.log('路径无效:', testPath, (error as Error).message);
      }
    }

    if (!seedData) {
      throw new Error('无法在任何预期位置找到 seed_data.json 文件');
    }
    
    console.log('种子数据加载成功，包含分类:', seedData.categories.length, '设置:', seedData.settings.length, '示例提示词:', seedData.example_prompts.length);

    // 插入分类
    const insertCategory = database.prepare('INSERT INTO categories (name, slug, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    console.log('开始插入分类...');

    for (const category of seedData.categories) {
      try {
        insertCategory.run([
          category.name,
          category.slug,
          category.description,
          category.color,
          category.icon,
          category.sort_order
        ]);
        console.log('分类插入成功:', category.name);
      } catch (error) {
        console.log('分类插入失败:', category.name, (error as Error).message);
        // 忽略重复插入错误
      }
    }

    console.log('分类插入完成');

    // 插入设置
    const insertSetting = database.prepare('INSERT INTO settings (key, value, type) VALUES (?, ?, ?)');
    console.log('开始插入设置...');

    for (const setting of seedData.settings) {
      try {
        insertSetting.run([setting.key, setting.value, setting.type]);
        console.log('设置插入成功:', setting.key);
      } catch (error) {
        console.log('设置插入失败:', setting.key, (error as Error).message);
        // 忽略重复插入错误
      }
    }

    console.log('设置插入完成');

    // 插入示例提示词
    const insertPrompt = database.prepare('INSERT INTO prompts (title, content, category_id, risk_level, description, is_template) VALUES (?, ?, ?, ?, ?, ?)');
    console.log('开始插入示例提示词...');

    for (const prompt of seedData.example_prompts) {
      try {
        insertPrompt.run([
          prompt.title,
          prompt.content,
          prompt.category_id,
          prompt.risk_level,
          prompt.description,
          prompt.is_template
        ]);
        console.log('提示词插入成功:', prompt.title);
      } catch (error) {
        console.log('提示词插入失败:', prompt.title, (error as Error).message);
        // 忽略重复插入错误
      }
    }

    console.log('示例提示词插入完成');
    console.log('初始数据填充成功');
  } catch (error) {
    console.error('初始数据填充失败:', error);
    throw error;
  }
}

// 关闭数据库连接
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// 备份数据库
export async function backupDatabase(backupPath: string): Promise<void> {
  try {
    const data = db!.export();
    const buffer = Buffer.from(data);
    await fs.writeFile(backupPath, buffer);
    console.log('数据库备份成功');
  } catch (error) {
    console.error('数据库备份失败:', error);
    throw error;
  }
}

// 获取数据库统计信息
export async function getDatabaseStats(): Promise<{
  prompts: number;
  categories: number;
  test_results: number;
  variants: number;
}> {
  const database = await getDatabase();

  const promptsResult = database.exec('SELECT COUNT(*) as count FROM prompts');
  const categoriesResult = database.exec('SELECT COUNT(*) as count FROM categories');
  const testResultsResult = database.exec('SELECT COUNT(*) as count FROM test_results');
  const variantsResult = database.exec('SELECT COUNT(*) as count FROM variants');

  const stats = {
    prompts: (promptsResult[0]?.values[0]?.[0] as number || 0),
    categories: (categoriesResult[0]?.values[0]?.[0] as number || 0),
    test_results: (testResultsResult[0]?.values[0]?.[0] as number || 0),
    variants: (variantsResult[0]?.values[0]?.[0] as number || 0)
  };

  return stats;
}

export { getDatabase, saveDatabase };
