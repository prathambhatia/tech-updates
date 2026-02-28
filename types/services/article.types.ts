import type { Prisma } from "@prisma/client";

export type ArticleRecord = Prisma.ArticleGetPayload<{
  include: {
    category: true;
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
    _count: {
      select: {
        articles: true;
      };
    };
  };
}>;
