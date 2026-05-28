import { PaymentType, Prisma } from '@prisma/client';
import {
  OperatingHourDto,
  VatRuleSettingDto,
} from './dto/merchant-settings.dto';

export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.cash]: 'Cash',
  [PaymentType.card]: 'Card',
};

export function defaultOperatingHours(): OperatingHourDto[] {
  return WEEKDAYS.map((day) => ({
    day,
    open: day !== 'SUNDAY',
    opening_time: '09:00',
    closing_time: day === 'THURSDAY' || day === 'FRIDAY' || day === 'SATURDAY' ? '23:00' : '22:00',
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

export function operatingHoursFromBranch(branch: {
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

export function minutesToTime(mins: number): string {
  return `${Math.floor(mins / 60)
    .toString()
    .padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function defaultVatRules(): VatRuleSettingDto[] {
  return [
    { payment_type: PaymentType.cash, rate: 16, label: PAYMENT_TYPE_LABELS.cash },
    { payment_type: PaymentType.card, rate: 16, label: PAYMENT_TYPE_LABELS.card },
  ];
}

export function mapVatRules(
  rules: Array<{ paymentType: PaymentType; rate: Prisma.Decimal }>,
): VatRuleSettingDto[] {
  if (!rules.length) return defaultVatRules();
  return rules.map((rule) => ({
    payment_type: rule.paymentType,
    rate: rule.rate.toNumber(),
    label: PAYMENT_TYPE_LABELS[rule.paymentType],
  }));
}
