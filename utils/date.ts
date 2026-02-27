export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

const MONTH_INDEX_BY_NAME: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

const EXPLICIT_MONTH_DATE_REGEX =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*|\s+)(\d{4})\b/gi;

function buildSafeDate(year: number, monthIndex: number, day: number): Date | null {
  const candidate = new Date(year, monthIndex, day, 12, 0, 0, 0);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== monthIndex ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
}

export function inferExplicitDateFromText(input: string): Date | null {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return null;
  }

  const matches = [...normalizedInput.matchAll(EXPLICIT_MONTH_DATE_REGEX)];

  for (const match of matches) {
    const monthToken = match[1]?.toLowerCase();
    const dayToken = match[2];
    const yearToken = match[3];

    if (!monthToken || !dayToken || !yearToken) {
      continue;
    }

    const monthIndex = MONTH_INDEX_BY_NAME[monthToken];
    const day = Number.parseInt(dayToken, 10);
    const year = Number.parseInt(yearToken, 10);

    if (monthIndex === undefined || Number.isNaN(day) || Number.isNaN(year)) {
      continue;
    }

    if (year < 1990 || year > 2100) {
      continue;
    }

    const parsedDate = buildSafeDate(year, monthIndex, day);
    if (parsedDate) {
      return parsedDate;
    }
  }

  return null;
}
