-- 提示词注入管理工具数据库架构
-- 版本: 1.0.0

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    icon TEXT,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- 提示词表
CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id INTEGER,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risk_level TEXT DEFAULT 'unknown' CHECK(risk_level IN ('unknown', 'low', 'medium', 'high', 'critical')),
    description TEXT,
    is_template BOOLEAN DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 测试结果表
CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER,
    model_name TEXT NOT NULL,
    model_version TEXT,
    success BOOLEAN,
    response TEXT,
    risk_score INTEGER CHECK(risk_score >= 0 AND risk_score <= 100),
    attack_vector TEXT,
    detection_difficulty INTEGER CHECK(detection_difficulty >= 1 AND detection_difficulty <= 10),
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id)
);

-- 变体表
CREATE TABLE IF NOT EXISTS variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_prompt_id INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    technique TEXT,
    category TEXT,
    generated_by TEXT DEFAULT 'rule' CHECK(generated_by IN ('direct', 'rule', 'ai')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_prompt_id) REFERENCES prompts(id)
);

-- 提示词模板库表
CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    template_content TEXT NOT NULL,
    description TEXT,
    variables TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 配置表
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    type TEXT DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测试会话表
CREATE TABLE IF NOT EXISTS test_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    total_tests INTEGER DEFAULT 0,
    successful_tests INTEGER DEFAULT 0
);

-- 会话测试结果关联表
CREATE TABLE IF NOT EXISTS session_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    prompt_id INTEGER NOT NULL,
    variant_id INTEGER,
    test_result_id INTEGER,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES test_sessions(id),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id),
    FOREIGN KEY (variant_id) REFERENCES variants(id),
    FOREIGN KEY (test_result_id) REFERENCES test_results(id)
);
