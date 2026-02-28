type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-600 dark:text-slate-300">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="font-medium text-ink-700 hover:text-accent-600 dark:text-slate-200 dark:hover:text-teal-200"
                >
                  {item.label}
                </a>
              ) : (
                <span className={isLast ? "font-semibold text-ink-900 dark:text-slate-100" : ""}>{item.label}</span>
              )}
              {!isLast ? <span className="text-ink-400 dark:text-slate-500">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
