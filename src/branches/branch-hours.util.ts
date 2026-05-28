import { Prisma } from '@prisma/client';

export type OperatingHourDto = {
  day: string;
  open: boolean;
  opening_time: string;
  closing_time: string;
};

export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export function defaultOperatingHours(): OperatingHourDto[] {
  return WEEKDAYS.map((day) => ({
    day,
    open: day !== 'SUNDAY',
    opening_time: '09:00',
    closing_time:
      day === 'THURSDAY' || day === 'FRIDAY' || day === 'SATURDAY'
        ? '23:00'
        : '22:00',
  }));
}

export function parseOperatingHours(
  value: Prisma.JsonValue | null | undefined,
): OperatingHourDto[] | null {
  if (!value || !Array.isArray(value)) return null;
  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const day = String(row.day ?? '').toUpperCase();
      if (!WEEKDAYS.includes(day as (typeof WEEKDAYS)[number])) return null;
      return {
        day,
        open: Boolean(row.open),
        opening_time: String(row.opening_time ?? '09:00'),
        closing_time: String(row.closing_time ?? '22:00'),
      };
    })
    .filter(Boolean) as OperatingHourDto[];
  return parsed.length > 0 ? parsed : null;
}

export function operatingHoursFromLegacyFields(branch: {
  days: string[];
  openingTimeMinutes: number;
  closingTimeMinutes: number;
  is24Hours: boolean;
}): OperatingHourDto[] {
  const opening = minutesToTime(branch.openingTimeMinutes);
  const closing = minutesToTime(branch.closingTimeMinutes);

  return WEEKDAYS.map((day) => ({
    day,
    open: branch.is24Hours || branch.days.includes(day),
    opening_time: opening,
    closing_time: closing,
  }));
}

export function resolveBranchOperatingHours(branch: {
  operatingHours: Prisma.JsonValue | null;
  days: string[];
  openingTimeMinutes: number;
  closingTimeMinutes: number;
  is24Hours: boolean;
}): OperatingHourDto[] {
  return (
    parseOperatingHours(branch.operatingHours) ??
    operatingHoursFromLegacyFields(branch)
  );
}

export function legacyFieldsFromOperatingHours(
  hours: OperatingHourDto[],
): {
  days: string[];
  openingTimeMinutes: number;
  closingTimeMinutes: number;
  is24Hours: boolean;
} {
  const openDays = hours.filter((row) => row.open);
  const firstOpen = openDays[0];

  return {
    days: openDays.map((row) => row.day.toUpperCase()),
    openingTimeMinutes: timeToMinutes(firstOpen?.opening_time ?? '09:00'),
    closingTimeMinutes: timeToMinutes(firstOpen?.closing_time ?? '22:00'),
    is24Hours: false,
  };
}

export function minutesToTime(mins: number): string {
  return `${Math.floor(mins / 60)
    .toString()
    .padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function isBranchOpenNow(
  branch: {
    operatingHours: Prisma.JsonValue | null;
    days: string[];
    openingTimeMinutes: number;
    closingTimeMinutes: number;
    is24Hours: boolean;
  },
  now = new Date(),
): boolean {
  if (branch.is24Hours) return true;

  const day = now
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();
  const hours = resolveBranchOperatingHours(branch);
  const today = hours.find((row) => row.day === day);

  if (today) {
    if (!today.open) return false;
    const openMins = timeToMinutes(today.opening_time);
    const closeMins = timeToMinutes(today.closing_time);
    const mins = now.getHours() * 60 + now.getMinutes();
    if (closeMins < openMins) {
      return mins >= openMins || mins < closeMins;
    }
    return mins >= openMins && mins < closeMins;
  }

  if (!branch.days.includes(day)) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  if (branch.closingTimeMinutes < branch.openingTimeMinutes) {
    return (
      mins >= branch.openingTimeMinutes ||
      mins < branch.closingTimeMinutes
    );
  }
  return (
    mins >= branch.openingTimeMinutes && mins < branch.closingTimeMinutes
  );
}
