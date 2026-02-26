"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { SortDirection } from "@/types/article";

type CategoryOption = {
  slug: string;
  name: string;
};

type SearchFiltersProps = {
  categories: CategoryOption[];
  initialQuery: string;
  initialCategory: string;
  initialSort: SortDirection;
};

type DropdownOption = {
  value: string;
  label: string;
};

const SORT_OPTIONS: DropdownOption[] = [
  { value: "popular", label: "Most popular" },
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" }
];

function Dropdown(props: {
  label: string;
  value: string;
  options: DropdownOption[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const selected = props.options.find((option) => option.value === props.value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={props.onToggle}
        className="flex w-full items-center justify-between rounded-lg border border-ink-300 bg-white px-3 py-2 text-left text-ink-900 shadow-sm transition hover:border-accent-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <span className="truncate">{selected?.label ?? props.label}</span>
        <span className={`ml-3 text-xs transition ${props.isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {props.isOpen ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-ink-200 bg-white p-1 shadow-paper dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_16px_34px_rgba(2,8,23,0.65)]">
          {props.options.map((option) => {
            const active = option.value === props.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => props.onSelect(option.value)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  active
                    ? "bg-accent-600 text-white dark:bg-teal-500 dark:text-slate-900"
                    : "text-ink-700 hover:bg-ink-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <span>{option.label}</span>
                {active ? <span>✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SearchFilters({ categories, initialCategory, initialQuery, initialSort }: SearchFiltersProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLFormElement | null>(null);

  const categoryOptions = useMemo<DropdownOption[]>(
    () => [{ value: "all", label: "All categories" }, ...categories.map((item) => ({ value: item.slug, label: item.name }))],
    [categories]
  );

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory || "all");
  const [sort, setSort] = useState<SortDirection>(initialSort);
  const [openMenu, setOpenMenu] = useState<"category" | "sort" | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }

    params.set("category", category);
    params.set("sort", sort);
    params.set("page", "1");

    router.push(`/search?${params.toString()}`);
    setOpenMenu(null);
  };

  return (
    <form ref={rootRef} onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-[2fr,1fr,1fr,auto]">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Optional keyword"
        className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-ink-900 outline-none ring-accent-600 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
      />

      <Dropdown
        label="Category"
        value={category}
        options={categoryOptions}
        isOpen={openMenu === "category"}
        onToggle={() => setOpenMenu((current) => (current === "category" ? null : "category"))}
        onSelect={(value) => {
          setCategory(value);
          setOpenMenu(null);
        }}
      />

      <Dropdown
        label="Sort"
        value={sort}
        options={SORT_OPTIONS}
        isOpen={openMenu === "sort"}
        onToggle={() => setOpenMenu((current) => (current === "sort" ? null : "sort"))}
        onSelect={(value) => {
          setSort(value as SortDirection);
          setOpenMenu(null);
        }}
      />

      <button
        type="submit"
        className="rounded-lg border border-accent-600 bg-accent-600 px-4 py-2 font-semibold text-white hover:bg-accent-500 dark:border-teal-300 dark:bg-teal-500 dark:text-slate-900 dark:hover:bg-teal-400"
      >
        Search
      </button>
    </form>
  );
}
