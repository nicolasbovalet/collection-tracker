import { useState } from "react";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CheckIcon from "@mui/icons-material/Check";
import SortIcon from "@mui/icons-material/Sort";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

const FIELD_OPTIONS = [
  { value: "artist", label: "Artist" },
  { value: "released_year", label: "Year" },
  { value: "title", label: "Title" },
  { value: "date_added", label: "Date Added" },
];

export default function CollectionSortMenu({ sort, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleDirectionChange = (_, value) => {
    if (value) onChange({ ...sort, direction: value });
  };

  const handleFieldSelect = (field) => {
    onChange({ ...sort, field });
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        startIcon={<SortIcon fontSize="small" />}
        onClick={handleOpen}
        sx={{ color: "text.secondary", borderColor: "divider" }}
      >
        Sort
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <Stack sx={{ px: 1.5, py: 1 }}>
          <ToggleButtonGroup
            value={sort.direction}
            exclusive
            size="small"
            fullWidth
            onChange={handleDirectionChange}
            sx={(theme) => ({
              "& .Mui-selected": {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                },
              },
            })}
          >
            <ToggleButton value="asc" aria-label="Sort ascending">
              <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
              Ascending
            </ToggleButton>
            <ToggleButton value="desc" aria-label="Sort descending">
              <ArrowDownwardIcon fontSize="small" sx={{ mr: 0.5 }} />
              Descending
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Divider />
        {FIELD_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={sort.field === option.value}
            onClick={() => handleFieldSelect(option.value)}
            sx={(theme) => ({
              "&.Mui-selected": {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                },
              },
            })}
          >
            <ListItemIcon>
              {sort.field === option.value && (
                <CheckIcon fontSize="small" sx={{ color: "primary.main" }} />
              )}
            </ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
