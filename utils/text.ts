import slugify from "slugify";

export function plainText(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeSlug(input: string): string {
  const generated = slugify(input, {
    lower: true,
    strict: true,
    trim: true
  });

  return generated || "article";
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function estimateReadingTime(
  text: string,
  options?: {
    wordsPerMinute?: number;
    minMinutes?: number;
  }
): number {
  const words = countWords(text);
  const wordsPerMinute = Math.max(80, options?.wordsPerMinute ?? 170);
  const minMinutes = Math.max(1, options?.minMinutes ?? 1);
  return Math.max(minMinutes, Math.ceil(words / wordsPerMinute));
}

export function summarize(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, 260).join(" ").trim();
}

export function preview(text: string): string {
  const normalized = plainText(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.slice(0, 110).join(" ").trim();
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeTag(value: string): string {
  return value.toLowerCase().trim();
}
