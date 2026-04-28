import { Bell, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { routes } from "../routes/routes";

interface Props {
  activePath: string;
  children: ReactNode;
}

export function AppLayout({ activePath, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Fixed Header */}
      <header className="topbar">
        <div className="brand-section">
          <button className="icon-button mobile-only" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="brand-mark">Q</div>
          <div className="brand-text">
            <strong>QLBH</strong>
            <small>Warehouse Management System</small>
          </div>
        </div>
        <div className="header-actions">
          <button className="notification-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
          <div className="avatar">A</div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Sidebar */}
        <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
          <nav className="nav-list">
            {routes.map((route) => {
              const Icon = route.icon;
              return (
                <Link
                  key={route.path}
                  className={activePath === route.path ? "nav-item active" : "nav-item"}
                  to={route.path}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={18} />
                  <span>{route.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <button>Đăng xuất</button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="main-area">
          <main className="page-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
