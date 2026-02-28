import type { Prisma } from "@prisma/client";

export type ArticleRecord = Prisma.ArticleGetPayload<{
  include: {
    source: {
      include: {
        category: true;
      };
    };
    tags: {
      include: {
        tag: true;
      };
    };
  };
}>;

export type CategoryWithSourcesRecord = Prisma.CategoryGetPayload<{
  include: {
    sources: {
      include: {
        _count: {
          select: {
            articles: true;
          };
        };
      };
    };
  };
}>;
