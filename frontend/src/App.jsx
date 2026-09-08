import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import useSystemTheme from "@/hooks/useSystemTheme";

import CollectionTab from "./components/CollectionTab";
import MobileBottomNav from "./components/MobileBottomNav";
import Sidebar from "./components/Sidebar";
import WishlistTab from "./components/WishlistTab";
import DashboardPage from "./pages/DashboardPage";
import SearchPage from "./pages/SearchPage";
import StatsPage from "./pages/StatsPage";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/collection" element={<CollectionTab refreshKey={0} />} />
          <Route path="/wishlist" element={<WishlistTab />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useSystemTheme();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <AnimatedRoutes />
        </main>
        <MobileBottomNav />
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
