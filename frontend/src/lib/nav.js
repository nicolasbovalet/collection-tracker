import { BarChart3, Heart, LayoutDashboard, Library, Search } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/collection", label: "Collection", icon: Library },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/search", label: "Search", icon: Search },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];
