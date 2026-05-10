const NO_SHIPPING = { freeThresholdAgorot: 0, flatRateAgorot: 0 };
const SHIPPING_POLICIES: Record<string, { freeThresholdAgorot: number; flatRateAgorot: number }> = {
  hm:     { freeThresholdAgorot: 29900, flatRateAgorot: 2900 },
  zara:   { freeThresholdAgorot: 29900, flatRateAgorot: 2900 },
  amazon: { freeThresholdAgorot: 14900, flatRateAgorot: 1990 },
  manual: NO_SHIPPING,
};

export function calcCommission(
  myItemsAgorot: number,
  groupTotalAgorot: number,
  storeKey: string,
): { myItemsAgorot: number; commissionAgorot: number; savingsAgorot: number; totalAgorot: number } {
  const policy = SHIPPING_POLICIES[storeKey] ?? NO_SHIPPING;
  const soloShipping = myItemsAgorot >= policy.freeThresholdAgorot ? 0 : policy.flatRateAgorot;
  const groupShipping = groupTotalAgorot >= policy.freeThresholdAgorot ? 0 : policy.flatRateAgorot;
  const savingsAgorot = Math.max(0, soloShipping - groupShipping);
  const commissionAgorot = Math.ceil(savingsAgorot / 2);
  return { myItemsAgorot, commissionAgorot, savingsAgorot, totalAgorot: myItemsAgorot + commissionAgorot };
}

export function formatPhoneIL(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export function phoneDigitsOnly(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function formatAgorot(amount: number): string {
  const shekels = amount / 100;
  return `\u20aa${shekels.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
}
