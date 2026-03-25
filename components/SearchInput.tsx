import { Input } from "@/components/input";
import { cn } from "@/components/component.utils";
import { DeleteIcon, SearchIcon } from "lucide-react";
import { type InputHTMLAttributes, forwardRef } from "react";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  clearValue?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, className, clearValue, ...props }, ref) => (
    <Input
      value={value}
      ref={ref}
      className={cn("rounded-full focus-visible:ring-0 focus-visible:ring-offset-0", className)}
      translate="no"
      placeholder="Search..."
      autoComplete="off"
      startAddon={<SearchIcon className="h-4 w-4" />}
      type="text"
      endAddon={
        value && `${value}`.length ? (
          <button
            type="button"
            onClick={clearValue}
            className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <DeleteIcon className="h-4 w-4" />
          </button>
        ) : null
      }
      {...props}
    />
  )
);

SearchInput.displayName = "SearchInput";
