/* ── Birthday date helpers ──
 * Profiles store birthdays in two different formats depending on which
 * page they were entered from: an ISO "YYYY-MM-DD" string from the
 * <input type="date"> on ProfilePage (field "birthDate"), or a free-text
 * "DD/MM/YYYY" string from CompleteProfilePage (field "birthdate").
 * parseBirthDate understands both so birthdays aren't silently dropped.
 */
export function parseBirthDate(value) {
  if (!value) return null;
  const s = String(value).trim();

  // DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY (free-text format from CompleteProfilePage)
  const dmy = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // YYYY/MM/DD or YYYY.MM.DD (ISO order with non-dash separators)
  const ymd = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (ymd) {
    const [, year, month, day] = ymd;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // ISO YYYY-MM-DD (from <input type="date">), optionally with a time component
  const date = new Date(s + (s.includes("T") ? "" : "T00:00:00"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isBirthdayToday(value) {
  const date = parseBirthDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export function daysUntilBirthday(value) {
  const bday = parseBirthDate(value);
  if (!bday) return null;
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(todayMid.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < todayMid) next.setFullYear(next.getFullYear() + 1);
  return Math.round((next - todayMid) / 86400000);
}

export function formatBirthday(value) {
  const date = parseBirthDate(value);
  return date ? date.toLocaleDateString([], { month: "long", day: "numeric" }) : "";
}
