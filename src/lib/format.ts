export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDateTimeShort(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}