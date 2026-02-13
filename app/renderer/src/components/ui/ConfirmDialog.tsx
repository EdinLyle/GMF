import { createRoot } from 'react-dom/client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  // 键盘事件处理（预留，未来可能使用）
  // const handleKeyDown = (e: React.KeyboardEvent) => {
  //   if (e.key === 'Enter') {
  //     handleConfirm();
  //   } else if (e.key === 'Escape') {
  //     handleCancel();
  //   }
  // };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{message}</p>
          
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 全局函数用于显示确认对话框
export function showConfirmDialog(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 创建容器
    const container = document.createElement('div');
    container.id = 'confirm-dialog-container';
    document.body.appendChild(container);

    const root = createRoot(container);

    const handleConfirm = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(true);
    };

    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(false);
    };

    root.render(
      <ConfirmDialog
        title={title}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  });
}