import type {
  CustomerStatus,
  InsuranceType,
  PaymentMethod,
  PaymentStatus,
  PremiumFrequency,
  SoldPolicyStatus,
} from "@/lib/api/types";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,23,456 (whole rupees) or ₹1,23,456.50 with `precise`. */
export const formatINR = (value: number, precise = false) =>
  (precise ? inrPrecise : inr).format(value);

/** ₹1.2L / ₹3.4Cr for chart axes and compact tiles. */
export function formatINRCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return `₹${value}`;
}

export const formatNumber = (value: number) => value.toLocaleString("en-IN");

/** "2026-03-07" (DATE) or an ISO timestamp → "7 Mar 2026". */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(value.length === 10 ? { timeZone: "UTC" } : {}),
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Today as YYYY-MM-DD in UTC — the backend's calendar for DATE fields. */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Whole days from today until a YYYY-MM-DD date (negative once it has passed). */
export const daysUntil = (iso: string) =>
  Math.round(
    (Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`)) /
      86_400_000,
  );

export const shiftIsoDate = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export const insuranceTypeLabel: Record<InsuranceType, string> = {
  HEALTH: "Health",
  MOTOR: "Motor",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  NET_BANKING: "Net banking",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  DUE: "Due",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const policyStatusLabel: Record<SoldPolicyStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const customerStatusLabel: Record<CustomerStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  INACTIVE: "Inactive",
};

export const premiumFrequencyLabel: Record<PremiumFrequency, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-yearly",
  ANNUAL: "Annual",
};

export function formatDuration(months: number) {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} month${months === 1 ? "" : "s"}`;
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "A";
