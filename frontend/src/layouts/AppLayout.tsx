import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { routes } from "../routes/routes";

interface Props {
  activePath: string;
  children: ReactNode;
}

export function AppLayout({ activePath, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">CP</span>
          <div>
            <strong>QLBH</strong>
            <small>Supabase</small>
          </div>
        </div>
        <nav className="nav-list">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <a
                key={route.path}
                className={activePath === route.path ? "nav-item active" : "nav-item"}
                href={`#${route.path}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span>{route.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <strong>Quản lý bán hàng</strong>
            <span>Kho, đơn hàng, giao hàng và báo cáo</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
