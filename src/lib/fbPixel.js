const PLAN_VALUES = {
  mensual: 19990,
  trimestral: 44990,
  anual: 99990,
  vitalicio: 249990,
};

function normalizePlan(plan = "") {
  const p = String(plan || "").toLowerCase();

  if (p.includes("mensual")) return "mensual";
  if (p.includes("trimestral")) return "trimestral";
  if (p.includes("anual")) return "anual";
  if (p.includes("vitalicio")) return "vitalicio";

  return "mensual";
}

function getPlanValue(plan = "") {
  return PLAN_VALUES[normalizePlan(plan)] || 19990;
}

export function trackInitiateCheckout({ plan = "", value, currency = "CLP" } = {}) {
  try {
    if (!window.fbq) return;

    window.fbq("track", "InitiateCheckout", {
      value: value ?? getPlanValue(plan),
      currency,
      content_name: plan || "plan",
      content_type: "product",
    });
  } catch (err) {
    console.error("Meta InitiateCheckout error:", err);
  }
}

export function trackPurchase({
  plan = "",
  value,
  currency = "CLP",
  purchaseId = "",
} = {}) {
  try {
    if (!window.fbq) return;

    const key = `fv_purchase_tracked_${purchaseId || normalizePlan(plan) || "default"}`;
    if (sessionStorage.getItem(key)) return;

    window.fbq("track", "Purchase", {
      value: value ?? getPlanValue(plan),
      currency,
      content_name: plan || "plan",
      content_type: "product",
    });

    sessionStorage.setItem(key, "1");
  } catch (err) {
    console.error("Meta Purchase error:", err);
  }
}