import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONDITIONS = [
  "Mint", "Near Mint", "Very Good Plus", "Very Good",
  "Good Plus", "Good", "Fair", "Poor",
];

const ANY_VALUE = "any";

export default function CollectionFilterBar({ filters, onChange }) {
  const handleField = (field) => (event) => {
    onChange({ ...filters, [field]: event.target.value });
  };

  const handleSelect = (field) => (value) => {
    onChange({ ...filters, [field]: value === ANY_VALUE ? "" : value });
  };

  return (
    <div className="mb-4 flex flex-wrap gap-2.5">
      <Input
        placeholder="Format"
        value={filters.format}
        onChange={handleField("format")}
        className="h-9 w-36"
      />
      <Input
        placeholder="Artist"
        value={filters.artist}
        onChange={handleField("artist")}
        className="h-9 w-36"
      />
      <Select value={filters.condition || ANY_VALUE} onValueChange={handleSelect("condition")}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_VALUE}>Any condition</SelectItem>
          {CONDITIONS.map((condition) => (
            <SelectItem key={condition} value={condition}>
              {condition}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.rating || ANY_VALUE} onValueChange={handleSelect("rating")}>
        <SelectTrigger className="h-9 w-28">
          <SelectValue placeholder="Rating" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_VALUE}>Any rating</SelectItem>
          {[0, 1, 2, 3, 4, 5].map((rating) => (
            <SelectItem key={rating} value={String(rating)}>
              {rating}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Year"
        value={filters.year}
        onChange={handleField("year")}
        className="h-9 w-24"
      />
    </div>
  );
}
