import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";

import { NAV_ITEMS } from "./Sidebar";

export default function MobileBottomNav({ activePage, onSelectPage }) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: 1,
        borderColor: "divider",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation showLabels value={activePage} onChange={(_, value) => onSelectPage(value)}>
        {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
          <BottomNavigationAction
            key={value}
            value={value}
            label={label}
            icon={<Icon fontSize="small" />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
