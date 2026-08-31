import DashboardIcon from "@mui/icons-material/Dashboard";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

const SIDEBAR_WIDTH = 220;

export const NAV_ITEMS = [
  { value: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { value: "collection", label: "Collection", icon: LibraryMusicIcon },
  { value: "wishlist", label: "Wishlist", icon: FavoriteIcon },
  { value: "search", label: "Search", icon: SearchIcon },
  { value: "stats", label: "Stats", icon: BarChartIcon },
];

export default function Sidebar({ activePage, onSelectPage }) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        display: { xs: "none", md: "block" },
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
        },
      }}
    >
      <Typography variant="h6" sx={{ p: 2, fontWeight: 700 }}>
        Collection Tracker
      </Typography>
      <List sx={{ px: 1 }}>
        {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
          <ListItemButton
            key={value}
            selected={activePage === value}
            onClick={() => onSelectPage(value)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
