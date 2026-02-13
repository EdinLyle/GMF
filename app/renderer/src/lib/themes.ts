import type { Theme, ThemeConfig } from '@/types';

// 主题配置
export const themes: Record<Theme, ThemeConfig> = {
  system: {
    name: '跟随系统',
    value: 'system',
    colors: {
      primary: '#3B82F6',
      background: '#18181B',
      card: '#27272A',
      text: '#FAFAF9',
      textSecondary: '#A1A1AA',
      border: '#3F3F46',
      danger: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981'
    }
  },
  dark: {
    name: '深色专业',
    value: 'dark',
    colors: {
      primary: '#3B82F6',
      background: '#18181B',
      card: '#27272A',
      text: '#FAFAF9',
      textSecondary: '#A1A1AA',
      border: '#3F3F46',
      danger: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981'
    }
  },
  light: {
    name: '浅色清爽',
    value: 'light',
    colors: {
      primary: '#0EA5E9',
      background: '#FAFAF9',
      card: '#FFFFFF',
      text: '#18181B',
      textSecondary: '#71717A',
      border: '#E5E5E5',
      danger: '#DC2626',
      warning: '#F97316',
      success: '#16A34A'
    }
  },
  green: {
    name: '护眼绿',
    value: 'green',
    colors: {
      primary: '#14B8A6',
      background: '#064E3B',
      card: '#065F46',
      text: '#ECFDF5',
      textSecondary: '#6EE7B7',
      border: '#34D399',
      danger: '#F87171',
      warning: '#FBBF24',
      success: '#4ADE80'
    }
  },
  gray: {
    name: '极简灰',
    value: 'gray',
    colors: {
      primary: '#525252',
      background: '#171717',
      card: '#262626',
      text: '#E5E5E5',
      textSecondary: '#A3A3A3',
      border: '#404040',
      danger: '#737373',
      warning: '#A3A3A3',
      success: '#404040'
    }
  }
};

// 应用主题到DOM
export function applyTheme(theme: Theme): void {
  console.log('applyTheme 被调用，主题:', theme);
  const root = document.documentElement;
  const config = themes[theme === 'system' ? 'dark' : theme];

  console.log('主题配置:', config);

  // 移除所有主题类
  root.classList.remove('dark', 'light', 'green', 'gray');
  
  // 设置dark mode
  if (theme === 'light') {
    root.classList.add('light');
    console.log('添加 light 类');
  } else if (theme === 'green') {
    root.classList.add('dark', 'green');
    console.log('添加 dark 和 green 类');
  } else if (theme === 'gray') {
    root.classList.add('dark', 'gray');
    console.log('添加 dark 和 gray 类');
  } else {
    root.classList.add('dark');
    console.log('添加 dark 类');
  }

  // 强制重新渲染
  document.body.style.display = 'none';
  document.body.offsetHeight; // 触发重排
  document.body.style.display = '';
}

// 获取当前主题
export function getCurrentTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme') as Theme;
    console.log('localStorage 中的主题:', saved);
    if (saved && themes[saved]) {
      return saved;
    }
    console.log('使用默认主题: dark');
    return 'dark';
  } catch (error) {
    console.error('读取主题失败:', error);
    return 'dark';
  }
}

// 检测系统主题偏好
export function getSystemTheme(): 'light' | 'dark' {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// 监听系统主题变化
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (!window.matchMedia) return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches ? 'dark' : 'light');

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

// 主题CSS变量映射
export const themeCSSVars = {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  'card-foreground': 'hsl(var(--card-foreground))',
  popover: 'hsl(var(--popover))',
  'popover-foreground': 'hsl(var(--popover-foreground))',
  primary: 'hsl(var(--primary))',
  'primary-foreground': 'hsl(var(--primary-foreground))',
  secondary: 'hsl(var(--secondary))',
  'secondary-foreground': 'hsl(var(--secondary-foreground))',
  muted: 'hsl(var(--muted))',
  'muted-foreground': 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  'accent-foreground': 'hsl(var(--accent-foreground))',
  destructive: 'hsl(var(--destructive))',
  'destructive-foreground': 'hsl(var(--destructive-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))'
};

// 深色主题CSS变量
export const darkThemeVars = {
  background: '240 10% 3.9%',
  foreground: '0 0% 98%',
  card: '240 10% 3.9%',
  'card-foreground': '0 0% 98%',
  popover: '240 10% 3.9%',
  'popover-foreground': '0 0% 98%',
  primary: '217.2 91.2% 59.8%',
  'primary-foreground': '222.2 47.4% 11.2%',
  secondary: '240 3.7% 15.9%',
  'secondary-foreground': '0 0% 98%',
  muted: '240 3.7% 15.9%',
  'muted-foreground': '240 5% 64.9%',
  accent: '240 3.7% 15.9%',
  'accent-foreground': '0 0% 98%',
  destructive: '0 62.8% 30.6%',
  'destructive-foreground': '0 0% 98%',
  border: '240 3.7% 15.9%',
  input: '240 3.7% 15.9%',
  ring: '217.2 91.2% 59.8%'
};

// 浅色主题CSS变量
export const lightThemeVars = {
  background: '0 0% 100%',
  foreground: '240 10% 3.9%',
  card: '0 0% 100%',
  'card-foreground': '240 10% 3.9%',
  popover: '0 0% 100%',
  'popover-foreground': '240 10% 3.9%',
  primary: '217.2 91.2% 59.8%',
  'primary-foreground': '222.2 47.4% 11.2%',
  secondary: '240 4.8% 95.9%',
  'secondary-foreground': '240 5.9% 10%',
  muted: '240 4.8% 95.9%',
  'muted-foreground': '240 3.8% 46.1%',
  accent: '240 4.8% 95.9%',
  'accent-foreground': '240 5.9% 10%',
  destructive: '0 84.2% 60.2%',
  'destructive-foreground': '0 0% 98%',
  border: '240 5.9% 90%',
  input: '240 5.9% 90%',
  ring: '217.2 91.2% 59.8%'
};
