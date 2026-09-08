import { ArrowDown, ArrowUp, ArrowUpDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const FIELD_OPTIONS = [
  { value: "artist", label: "Artist" },
  { value: "released_year", label: "Year" },
  { value: "title", label: "Title" },
  { value: "date_added", label: "Date Added" },
];

export default function CollectionSortMenu({ sort, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground">
          <ArrowUpDown className="size-3.5" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" onCloseAutoFocus={(event) => event.preventDefault()}>
        <div className="px-1.5 py-1">
          <ToggleGroup
            type="single"
            value={sort.direction}
            onValueChange={(value) => value && onChange({ ...sort, direction: value })}
            className="w-full"
          >
            <ToggleGroupItem value="asc" aria-label="Sort ascending" className="flex-1 gap-1 text-xs">
              <ArrowUp className="size-3.5" />
              Ascending
            </ToggleGroupItem>
            <ToggleGroupItem value="desc" aria-label="Sort descending" className="flex-1 gap-1 text-xs">
              <ArrowDown className="size-3.5" />
              Descending
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <DropdownMenuSeparator />
        {FIELD_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange({ ...sort, field: option.value })}
          >
            <Check className={sort.field === option.value ? "opacity-100" : "opacity-0"} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
