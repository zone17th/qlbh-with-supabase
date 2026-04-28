export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoIsoDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`));
}
