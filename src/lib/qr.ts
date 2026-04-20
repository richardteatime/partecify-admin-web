function dateKey(d: Date): string {
  const year = String(d.getFullYear()).padStart(4, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildQrString(params: {
  date: Date;
  location: string;
  points: number;
}): string {
  const dateStr = dateKey(params.date);
  const locSlug = params.location
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("|", "_");

  const ptsStr = params.points >= 0 ? `+${params.points}` : `${params.points}`;
  return `PTC|${dateStr}|${locSlug}|${ptsStr}`;
}

export function isQrForDate(raw: string, date: Date): boolean {
  const parts = raw.split("|");
  if (parts.length < 4) return false;
  if (parts[0] !== "PTC") return false;
  return parts[1] === dateKey(date);
}

export function decodeQrMeta(raw: string) {
  const parts = raw.split("|");
  if (parts.length < 4) {
    return { title: raw, subtitle: "" };
  }

  const dateStr = parts[1];
  const loc = parts[2];
  const ptsStr = parts[3];

  const formattedDate =
    dateStr.length === 8
      ? `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`
      : dateStr;

  const cleanPts = ptsStr.startsWith("+") ? ptsStr.slice(1) : ptsStr;
  const sign = ptsStr.startsWith("-") ? "-" : "+";

  return {
    title: `Sede ${loc} · ${sign}${cleanPts} punti`,
    subtitle: `Data: ${formattedDate}\nCodice: ${raw}`,
  };
}