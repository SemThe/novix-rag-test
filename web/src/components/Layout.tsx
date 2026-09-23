import { NavLink, Outlet } from "react-router-dom";
import { IconDashboard, IconInbox, IconLibrary, IconSparkles } from "./icons";

const navItems = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/bronnen", label: "Bronnen", icon: IconLibrary, end: false },
  { to: "/genereren", label: "Genereren", icon: IconSparkles, end: false },
  { to: "/review", label: "Review", icon: IconInbox, end: false },
];

export function Layout() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-bg text-ink md:flex-row">
      <aside className="hidden shrink-0 flex-col bg-sidebar px-3 py-5 md:flex md:w-60">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
            N
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-sidebar-ink">Novix</p>
            <p className="text-[11px] leading-tight text-sidebar-ink-muted">Backoffice</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-sidebar-active text-white"
                    : "text-sidebar-ink-muted hover:bg-sidebar-active/60 hover:text-sidebar-ink"
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-lg bg-white/[0.04] px-3 py-3">
          <p className="text-[11px] leading-relaxed text-sidebar-ink-muted">
            RAG-pijplijn testomgeving. Niets wordt automatisch gepubliceerd — elk item vereist
            redactionele goedkeuring.
          </p>
        </div>
      </aside>

      <header className="flex items-center gap-2.5 border-b border-border bg-sidebar px-4 py-3 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-white">
          N
        </div>
        <p className="text-sm font-semibold text-sidebar-ink">Novix Backoffice</p>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-border bg-sidebar md:hidden">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-150 ${
                isActive ? "text-white" : "text-sidebar-ink-muted"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
