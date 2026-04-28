import { Bell } from "lucide-react";
import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { routes } from "../routes/routes";

interface Props {
  activePath: string;
  children: ReactNode;
}

export function AppLayout({ activePath, children }: Props) {
  // We don't need activePath if we useLocation, but we'll use activePath to be safe
  const location = useLocation();
  const currentPath = activePath || location.pathname;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* ── Fixed Header (Common for both PC and Mobile) ── */}
      <header className="fixed top-0 left-0 right-0 h-[60px] md:h-[72px] bg-white border-b border-gray-200 shadow-sm z-50 flex items-center justify-between px-4 md:px-6 transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-blue-500/30 shadow-lg">
            Q
          </div>
          <div>
            <strong className="block text-base md:text-lg text-gray-900 leading-tight">QLBH</strong>
            <small className="block text-gray-500 text-[10px] md:text-xs">Warehouse Management</small>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm cursor-pointer shadow-md">
            A
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-[60px] md:pt-[72px] pb-[70px] md:pb-0">
        {/* ── Fixed Sidebar (PC Only) ── */}
        <aside className="hidden md:flex flex-col w-[256px] fixed left-0 top-[72px] bottom-0 bg-white border-r border-gray-200 z-40">
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
            {routes.map((route) => {
              const Icon = route.icon;
              const isActive = currentPath === route.path;
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-blue-600" : "text-gray-400"} />
                  {route.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <button className="w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 md:ml-[256px] w-full min-w-0 transition-all duration-200">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* ── Fixed Bottom Navigation (Mobile Only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-white/90 backdrop-blur-md border-t border-gray-200 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-full px-2">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = currentPath === route.path;
            return (
              <Link
                key={route.path}
                to={route.path}
                className="flex flex-col items-center justify-center w-full h-full gap-1 pt-1 pb-2 relative group"
              >
                {/* Active Indicator Top Bar */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full"></div>
                )}
                <div
                  className={`p-1.5 rounded-xl transition-all duration-300 ${
                    isActive ? "text-blue-600 bg-blue-50/80" : "text-gray-500 group-hover:bg-gray-50 group-hover:text-gray-900"
                  }`}
                >
                  <Icon size={isActive ? 22 : 20} className={`transition-all duration-300 ${isActive ? "drop-shadow-sm scale-110" : "scale-100"}`} />
                </div>
                <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? "text-blue-700 translate-y-0" : "text-gray-500 translate-y-0.5"}`}>
                  {route.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
