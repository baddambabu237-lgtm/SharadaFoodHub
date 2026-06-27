// Membership Rank System Helper

export const MEMBERSHIP_TIERS = {
  BRONZE: {
    key: 'BRONZE',
    name: 'Bronze Member',
    badgeClass: 'bg-amber-100/70 text-amber-900 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    icon: '🌱',
    benefits: [
      '10% combo discount on selected traditional combos',
      'Standard shipping on all catalog orders',
      'Standard customer support response (within 24 hours)'
    ],
    thresholds: {
      subscriptions: 0,
      orders: 0,
      spending: 0
    }
  },
  SILVER: {
    key: 'SILVER',
    name: 'Silver Member',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
    icon: '🥈',
    benefits: [
      '12% combo discount on traditional combos',
      'Free shipping on orders above ₹200',
      'Priority customer support response (within 12 hours)'
    ],
    thresholds: {
      subscriptions: 1,
      orders: 3,
      spending: 500
    }
  },
  GOLD: {
    key: 'GOLD',
    name: 'Gold Member',
    badgeClass: 'bg-amber-100 text-amber-700 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40',
    icon: '🥇',
    benefits: [
      '15% renewal discount on all active subscriptions',
      'Free shipping on all orders with zero threshold',
      'Priority customer support response (within 4 hours)',
      'Access to priority delivery slots'
    ],
    thresholds: {
      subscriptions: 2,
      orders: 5,
      spending: 1500
    }
  },
  PREMIUM: {
    key: 'PREMIUM',
    name: 'Premium Member',
    badgeClass: 'bg-brand-100 text-brand-700 border border-brand-200 dark:bg-brand-950/20 dark:text-brand-400 dark:border-brand-900/40',
    icon: '👑',
    benefits: [
      '20% combo discount & 15% renewal discount',
      'Dedicated support line & manager response (within 1 hour)',
      'Free express priority shipping on all orders',
      'VIP exclusive preview of new traditional delicacies'
    ],
    thresholds: {
      subscriptions: 3,
      orders: 8,
      spending: 3000
    }
  }
};

/**
 * Calculates user's membership tier and progress towards the next tier.
 * Ranks are assigned if the user meets ANY of the three criteria.
 */
export const calculateMembership = (subscriptions = [], orders = []) => {
  // 1. Calculate active/paused subscriptions count
  const validSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'paused');
  const subsCount = validSubs.length;

  // 2. Calculate orders count (excluding cancelled)
  const validOrders = orders.filter(o => o.status !== 'cancelled');
  const ordersCount = validOrders.length;

  // 3. Calculate total spending on non-cancelled orders
  const spending = validOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  // Determine current tier (evaluate from Premium down to Bronze, meeting ANY condition triggers that tier)
  let currentTierKey = 'BRONZE';
  
  if (
    subsCount >= MEMBERSHIP_TIERS.PREMIUM.thresholds.subscriptions ||
    ordersCount >= MEMBERSHIP_TIERS.PREMIUM.thresholds.orders ||
    spending >= MEMBERSHIP_TIERS.PREMIUM.thresholds.spending
  ) {
    currentTierKey = 'PREMIUM';
  } else if (
    subsCount >= MEMBERSHIP_TIERS.GOLD.thresholds.subscriptions ||
    ordersCount >= MEMBERSHIP_TIERS.GOLD.thresholds.orders ||
    spending >= MEMBERSHIP_TIERS.GOLD.thresholds.spending
  ) {
    currentTierKey = 'GOLD';
  } else if (
    subsCount >= MEMBERSHIP_TIERS.SILVER.thresholds.subscriptions ||
    ordersCount >= MEMBERSHIP_TIERS.SILVER.thresholds.orders ||
    spending >= MEMBERSHIP_TIERS.SILVER.thresholds.spending
  ) {
    currentTierKey = 'SILVER';
  }

  const currentTier = MEMBERSHIP_TIERS[currentTierKey];
  
  // Determine next tier and progress
  let nextTierKey = null;
  if (currentTierKey === 'BRONZE') nextTierKey = 'SILVER';
  else if (currentTierKey === 'SILVER') nextTierKey = 'GOLD';
  else if (currentTierKey === 'GOLD') nextTierKey = 'PREMIUM';

  let progress = 100;
  let criteriaProgress = {
    subscriptions: { current: subsCount, target: 0, pct: 100 },
    orders: { current: ordersCount, target: 0, pct: 100 },
    spending: { current: spending, target: 0, pct: 100 }
  };

  if (nextTierKey) {
    const nextTier = MEMBERSHIP_TIERS[nextTierKey];
    
    // Calculate progress for each metric
    const subTarget = nextTier.thresholds.subscriptions;
    const orderTarget = nextTier.thresholds.orders;
    const spendTarget = nextTier.thresholds.spending;

    const subPct = Math.min(100, (subsCount / subTarget) * 100);
    const orderPct = Math.min(100, (ordersCount / orderTarget) * 100);
    const spendPct = Math.min(100, (spending / spendTarget) * 100);

    criteriaProgress = {
      subscriptions: { current: subsCount, target: subTarget, pct: Math.round(subPct) },
      orders: { current: ordersCount, target: orderTarget, pct: Math.round(orderPct) },
      spending: { current: Math.round(spending), target: spendTarget, pct: Math.round(spendPct) }
    };

    // Overall progress is the maximum of the three criteria percentages (since meeting ANY graduates you)
    progress = Math.max(subPct, orderPct, spendPct);
  }

  return {
    currentTier,
    nextTier: nextTierKey ? MEMBERSHIP_TIERS[nextTierKey] : null,
    progress: Math.round(progress),
    criteriaProgress,
    stats: {
      subscriptions: subsCount,
      orders: ordersCount,
      spending: Math.round(spending)
    }
  };
};
