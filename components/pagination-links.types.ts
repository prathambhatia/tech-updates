export type PaginationLinksProps = {
  page: number;
  totalPages: number;
  createHref: (targetPage: number) => string;
};
