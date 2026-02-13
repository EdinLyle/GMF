// useEffect已移除，因为未使用
import { useStore } from '@/store/useStore';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

export default function Layout() {
  const { isSidebarOpen, sidebarWidth } = useStore();

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 侧边栏 */}
      {isSidebarOpen && (
        <aside
          className="flex-shrink-0 border-r border-border bg-card/50"
          style={{ width: `${sidebarWidth}px` }}
        >
          <Sidebar />
        </aside>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <MainContent />
      </div>
    </div>
  );
}
