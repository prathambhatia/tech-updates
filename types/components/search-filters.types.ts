import type { SortDirection } from "@/types/article";

export type CategoryOption = {
  slug: string;
  name: string;
};

export type SearchFiltersProps = {
  categories: CategoryOption[];
  initialQuery: string;
  initialCategory: string;
  initialSort: SortDirection;
};

export type DropdownOption = {
  value: string;
  label: string;
};

export type DropdownProps = {
  label: string;
  value: string;
  options: DropdownOption[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
};
