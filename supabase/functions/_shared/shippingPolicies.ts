export type ShippingPolicy = {
  freeThresholdAgorot: number;
  flatRateAgorot: number;
};

export const shippingPolicies: Record<string, ShippingPolicy> = {
  hm:     { freeThresholdAgorot: 29900, flatRateAgorot: 2900 },
  zara:   { freeThresholdAgorot: 29900, flatRateAgorot: 2900 },
  amazon: { freeThresholdAgorot: 14900, flatRateAgorot: 1990 },
  manual: { freeThresholdAgorot: 0,     flatRateAgorot: 0    },
};

export type CommissionBreakdown = {
  myItemsAgorot: number;
  soloShippingAgorot: number;
  groupShippingAgorot: number;
  savingsAgorot: number;
  commissionAgorot: number;
  totalAgorot: number;
};

/**
 * Calculate Shakana commission = 50% of the shipping savings.
 * All values in agorot (integer).
 */
export function calcCommission(
  myItemsAgorot: number,
  groupTotalAgorot: number,
  storeKey: string,
): CommissionBreakdown {
  const policy = shippingPolicies[storeKey] ?? shippingPolicies.manual;

  const soloShippingAgorot =
    myItemsAgorot >= policy.freeThresholdAgorot ? 0 : policy.flatRateAgorot;

  const groupShippingAgorot =
    groupTotalAgorot >= policy.freeThresholdAgorot ? 0 : policy.flatRateAgorot;

  const savingsAgorot = Math.max(0, soloShippingAgorot - groupShippingAgorot);
  const commissionAgorot = Math.ceil(savingsAgorot / 2);

  return {
    myItemsAgorot,
    soloShippingAgorot,
    groupShippingAgorot,
    savingsAgorot,
    commissionAgorot,
    totalAgorot: myItemsAgorot + commissionAgorot,
  };
}
