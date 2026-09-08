import { NavLink } from "react-router-dom";

import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export default function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <Icon className="size-5" strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
