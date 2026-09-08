import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center px-5">
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          Collection Tracker
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="relative">
            {({ isActive }) => (
              <span
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-sidebar-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="relative size-4 shrink-0" strokeWidth={2} />
                <span className="relative">{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
