import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface InputDialogProps {
  title: string;
  message: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

function InputDialog({ title, message, defaultValue = '', onConfirm, onCancel }: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    // 自动聚焦输入框
    const input = document.getElementById('input-dialog-input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{message}</p>
          
          <form onSubmit={handleSubmit}>
            <input
              id="input-dialog-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请输入..."
            />
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                确认
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// 全局函数用于显示输入对话框
export function showInputDialog(title: string, message: string, defaultValue = ''): Promise<string | null> {
  return new Promise((resolve) => {
    // 创建容器
    const container = document.createElement('div');
    container.id = 'input-dialog-container';
    document.body.appendChild(container);

    const root = createRoot(container);

    const handleConfirm = (value: string) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(value);
    };

    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(null);
    };

    root.render(
      <InputDialog
        title={title}
        message={message}
        defaultValue={defaultValue}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  });
}