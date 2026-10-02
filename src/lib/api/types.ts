// Response shapes of the InsureX backend (see backend/README.md and /docs).

export type Role = "SUPER_ADMIN" | "AGENT";
export type InsuranceType = "HEALTH" | "MOTOR";
export type AgentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type CustomerStatus = "ACTIVE" | "PENDING" | "INACTIVE";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type PolicyStatus = "ACTIVE" | "INACTIVE";
export type PremiumFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUAL";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type SoldPolicyStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "NET_BANKING" | "BANK_TRANSFER" | "CHEQUE";

export interface AgentRef {
  id: string;
  agentCode: string;
  fullName: string;
}

export interface ApiAgent extends AgentRef {
  userId: string;
  email: string;
  phone: string;
  address: string | null;
  joinedAt: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  stats?: { customers: number; policiesSold: number };
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  agent: ApiAgent | null;
}

export interface ApiCustomer {
  id: string;
  customerCode: string;
  fullName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  nomineeName: string | null;
  nomineeRelationship: string | null;
  assignedAgent: AgentRef | null;
  status: CustomerStatus;
  policiesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HealthDetails {
  kind: "HEALTH";
  planType: "INDIVIDUAL" | "FAMILY";
  sumInsured: number;
  hospitalizationCoverage: string;
  waitingPeriod: string;
  ageEligibility: string;
}

export interface MotorDetails {
  kind: "MOTOR";
  vehicleType: "PRIVATE_CAR" | "TWO_WHEELER" | "COMMERCIAL_VEHICLE";
  coverageType: "THIRD_PARTY" | "COMPREHENSIVE" | "OWN_DAMAGE";
  ownDamage: string;
  thirdPartyCoverage: string;
  vehicleEligibility: string;
}

export interface ApiPolicy {
  id: string;
  policyCode: string;
  policyName: string;
  insuranceType: InsuranceType;
  description: string;
  coverageAmount: number;
  premium: number;
  premiumFrequency: PremiumFrequency;
  durationMonths: number;
  eligibility: string;
  benefits: string[];
  terms: string;
  categoryDetails: HealthDetails | MotorDetails | null;
  status: PolicyStatus;
  /** null for agents. */
  policiesSold: number | null;
  createdAt: string;
  updatedAt: string;
}

export type PolicyInput = Omit<ApiPolicy, "id" | "policiesSold" | "createdAt" | "updatedAt">;

export interface ApiSoldPolicy {
  id: string;
  policyNumber: string;
  policy: { id: string; policyCode: string; policyName: string; insuranceType: InsuranceType };
  customer: { id: string; customerCode: string; fullName: string };
  agent: AgentRef;
  premium: number;
  amountPaid: number;
  issueDate: string;
  expiryDate: string;
  paymentStatus: PaymentStatus;
  policyStatus: SoldPolicyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiReceipt {
  id: string;
  receiptNumber: string;
  soldPolicy: {
    id: string;
    policyNumber: string;
    policyName: string;
    customer: { id: string; customerCode: string; fullName: string };
    agent: AgentRef;
  };
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  issuedAt: string;
}

export interface DashboardSummary {
  totalPolicies: number;
  activePolicies: number;
  policiesSold: number;
  activeSoldPolicies: number;
  pendingSoldPolicies: number;
  expiredSoldPolicies: number;
  cancelledSoldPolicies: number;
  totalPremium: number;
  premiumCollected: number;
  totalAgents: number | null;
  totalCustomers: number;
}

export interface SalesSeries {
  interval: "day" | "week" | "month";
  from: string;
  to: string;
  points: { period: string; policiesSold: number; premium: number }[];
}

export interface PolicyDistributionRow {
  insuranceType: InsuranceType;
  policiesSold: number;
  premium: number;
  percentage: number;
}

export interface AgentPerformanceRow {
  agentId: string;
  agentCode: string;
  fullName: string;
  status: AgentStatus;
  customers: number;
  policiesSold: number;
  totalPremium: number;
  premiumCollected: number;
  lastSaleDate: string | null;
}

export interface PolicyPerformanceRow {
  policyId: string;
  policyCode: string;
  policyName: string;
  insuranceType: InsuranceType;
  status: PolicyStatus;
  catalogPremium: number;
  policiesSold: number;
  totalPremium: number;
}
