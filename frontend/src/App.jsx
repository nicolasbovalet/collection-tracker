import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import useMediaQuery from "@mui/material/useMediaQuery";

import CollectionTab from "./components/CollectionTab";
import MobileBottomNav from "./components/MobileBottomNav";
import Sidebar from "./components/Sidebar";
import WishlistTab from "./components/WishlistTab";
import DashboardPage from "./pages/DashboardPage";
import SearchPage from "./pages/SearchPage";
import { createAppTheme } from "./theme";

export default function App() {
  // Dark is the default look; only fall back to the light palette when the
  // OS explicitly prefers light. Dark preference, no preference, or an
  // unsupported media query all resolve to dark.
  const prefersLight = useMediaQuery("(prefers-color-scheme: light)");
  const theme = useMemo(
    () => createAppTheme(prefersLight ? "light" : "dark"),
    [prefersLight]
  );

  const [activePage, setActivePage] = useState("dashboard");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "100vh" }}>
        <Sidebar activePage={activePage} onSelectPage={setActivePage} />
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 2, pb: { xs: 9, md: 2 } }}>
          {activePage === "dashboard" && <DashboardPage />}
          {activePage === "collection" && <CollectionTab refreshKey={0} />}
          {activePage === "wishlist" && <WishlistTab />}
          {activePage === "search" && <SearchPage />}
        </Box>
        <MobileBottomNav activePage={activePage} onSelectPage={setActivePage} />
      </Box>
    </ThemeProvider>
  );
}
