import type { Language } from '@/i18n/locale';

type MoneyOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

export function formatMoney(value: number, language: Language = 'en', options: MoneyOptions = {}) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const maximumFractionDigits = options.maximumFractionDigits ?? (Number.isInteger(safeValue) ? 0 : 2);
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  const amount = new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(safeValue);

  return language === 'he' ? `₪${amount}` : `ILS ${amount}`;
}

export function formatAgorotMoney(agorot: number, language: Language = 'en', options?: MoneyOptions) {
  return formatMoney(agorot / 100, language, options);
}
