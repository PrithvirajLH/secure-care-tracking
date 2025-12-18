import * as React from "react";
import { Check, ChevronsUpDown, X, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  maxDisplayItems?: number;
  disabled?: boolean;
  /** Show only a filter icon as trigger (compact mode for table headers) */
  iconOnly?: boolean;
  /** Width of the dropdown content */
  dropdownWidth?: string;
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  emptyText = "No items found.",
  className,
  maxDisplayItems = 2,
  disabled = false,
  iconOnly = false,
  dropdownWidth = "250px",
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Toggle selection of an item
  const toggleSelection = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Clear all selections
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Remove a specific item
  const removeItem = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  // Get display label for a value
  const getLabel = (value: string) => {
    const option = options.find((opt) => opt.value === value);
    return option?.label || value;
  };

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Clear search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const hasSelections = selected.length > 0;
  const displayedItems = selected.slice(0, maxDisplayItems);
  const remainingCount = selected.length - maxDisplayItems;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-6 px-1 relative", className)}
            disabled={disabled}
          >
            <Filter className={cn("w-4 h-4", hasSelections && "text-purple-600")} />
            {hasSelections && (
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {selected.length}
              </span>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-10 text-sm bg-white border-purple-200 shadow-sm hover:bg-gray-50",
              "focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
              !hasSelections && "text-muted-foreground",
              className
            )}
          >
            <div className="flex items-center gap-1 flex-1 overflow-hidden">
              {hasSelections ? (
                <>
                  {displayedItems.map((value) => (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs px-1.5 py-0 h-5 shrink-0"
                    >
                      <span className="max-w-[60px] truncate">{getLabel(value)}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => removeItem(e, value)}
                        onKeyDown={(e) => e.key === 'Enter' && removeItem(e as any, value)}
                        className="ml-1 hover:text-purple-900 focus:outline-none cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  ))}
                  {remainingCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-purple-200 text-purple-800 text-xs px-1.5 py-0 h-5 shrink-0"
                    >
                      +{remainingCount}
                    </Badge>
                  )}
                </>
              ) : (
                <span className="truncate">{placeholder}</span>
              )}
            </div>
            <div className="flex items-center gap-1 ml-1 shrink-0">
              {hasSelections && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={clearAll}
                  onKeyDown={(e) => e.key === 'Enter' && clearAll(e as any)}
                  className="p-0.5 hover:bg-purple-100 rounded cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className={cn("p-0 bg-white/95 backdrop-blur-sm border border-purple-200 shadow-lg z-50")}
        style={{ width: dropdownWidth }}
        align="start"
      >
        {/* Search Input */}
        <div className="p-2 border-b border-purple-100">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm border-purple-200 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Options List */}
        <div className="max-h-[400px] overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggleSelection(option.value)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm text-sm",
                    "hover:bg-purple-50 transition-colors",
                    isSelected && "bg-purple-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      isSelected
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "border-gray-300"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="flex-1 truncate">{option.label}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with selection count and clear all */}
        {hasSelections && (
          <div className="p-2 border-t border-purple-100 flex items-center justify-between text-xs text-gray-500">
            <span>{selected.length} selected</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

