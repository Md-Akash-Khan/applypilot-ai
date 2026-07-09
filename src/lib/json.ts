export function parseJsonArray(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function toJsonArray(value: FormDataEntryValue | string[] | null | undefined): string {
  if (!value) return "[]";
  if (Array.isArray(value)) return JSON.stringify(value.map(String).map((item) => item.trim()).filter(Boolean));
  return JSON.stringify(String(value).split(",").map((item) => item.trim()).filter(Boolean));
}
