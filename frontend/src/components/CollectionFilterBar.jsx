import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

const CONDITIONS = [
  "Mint", "Near Mint", "Very Good Plus", "Very Good",
  "Good Plus", "Good", "Fair", "Poor",
];

export default function CollectionFilterBar({ filters, onChange }) {
  const handleField = (field) => (event) => {
    onChange({ ...filters, [field]: event.target.value });
  };

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
      <TextField
        label="Format"
        size="small"
        value={filters.format}
        onChange={handleField("format")}
      />
      <TextField
        label="Artist"
        size="small"
        value={filters.artist}
        onChange={handleField("artist")}
      />
      <TextField
        select
        label="Condition"
        size="small"
        sx={{ minWidth: 160 }}
        value={filters.condition}
        onChange={handleField("condition")}
      >
        <MenuItem value="">Any</MenuItem>
        {CONDITIONS.map((condition) => (
          <MenuItem key={condition} value={condition}>
            {condition}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Rating"
        size="small"
        sx={{ minWidth: 100 }}
        value={filters.rating}
        onChange={handleField("rating")}
      >
        <MenuItem value="">Any</MenuItem>
        {[0, 1, 2, 3, 4, 5].map((rating) => (
          <MenuItem key={rating} value={String(rating)}>
            {rating}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Year"
        size="small"
        sx={{ width: 100 }}
        value={filters.year}
        onChange={handleField("year")}
      />
    </Stack>
  );
}
