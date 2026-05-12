export type ShippingPolicy = {
  freeThresholdILS: number;
  flatRateILS: number;
};

export const shippingPolicies: Record<string, ShippingPolicy> = {
  hm:     { freeThresholdILS: 299, flatRateILS: 29   },
  zara:   { freeThresholdILS: 299, flatRateILS: 29   },
  amazon: { freeThresholdILS: 149, flatRateILS: 19.9 },
  manual: { freeThresholdILS: 0,   flatRateILS: 0    },
};

const fallbackShippingPolicy: ShippingPolicy = { freeThresholdILS: 0, flatRateILS: 0 };

export type CommissionBreakdown = {
  itemsTotalILS: number;
  soloShippingILS: number;
  groupShippingILS: number;
  savingsILS: number;
  commissionILS: number;
  totalILS: number;
};

/**
 * Calculate Shakana commission = 50% of the shipping savings.
 *
 * @param myItemsTotalILS   - this participant's items total in ₪
 * @param groupTotalILS     - sum of ALL participants' items in ₪
 * @param brand             - store key (hm | zara | amazon | manual)
 */
export function calcCommission(
  myItemsTotalILS: number,
  groupTotalILS: number,
  brand: string,
): CommissionBreakdown {
  const policy = shippingPolicies[brand] ?? shippingPolicies.manual ?? fallbackShippingPolicy;

  const soloShippingILS =
    myItemsTotalILS >= policy.freeThresholdILS ? 0 : policy.flatRateILS;

  const groupShippingILS =
    groupTotalILS >= policy.freeThresholdILS ? 0 : policy.flatRateILS;

  const savingsILS = Math.max(0, soloShippingILS - groupShippingILS);
  const commissionILS = Math.ceil(savingsILS / 2 * 100) / 100;

  return {
    itemsTotalILS: myItemsTotalILS,
    soloShippingILS,
    groupShippingILS,
    savingsILS,
    commissionILS,
    totalILS: myItemsTotalILS + commissionILS,
  };
}
