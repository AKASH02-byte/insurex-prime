export interface KpiStats {
  totalPolicies: number;
  policiesSold: number;
  activePolicies: number;
  totalPremium: number;
  totalAgents: number;
  policiesGrowth: string;
  soldGrowth: string;
  activeGrowth: string;
  premiumGrowth: string;
  agentsGrowth: string;
}

export interface SalesDataPoint {
  period: string;
  policiesSold: number;
  premiumAmount: number; // in INR
}

export interface PolicyDistributionItem {
  name: string;
  value: number;
  color: string;
  count: number;
  percentage: string;
}

export interface AgentPerformanceRecord {
  id: string;
  name: string;
  code: string;
  avatar: string;
  email: string;
  policiesSold: number;
  premiumGenerated: number;
  customers: number;
  status: "Active" | "On Leave" | "Suspended";
  joinDate: string;
  rating: number;
}

export interface RecentPolicySale {
  id: string;
  policyNumber: string;
  customerName: string;
  customerEmail: string;
  policyType: "Health" | "Motor" | "Other";
  policyName: string;
  agentName: string;
  agentCode: string;
  premium: number;
  issueDate: string;
  status: "Active" | "Pending" | "In Review" | "Expired";
}

export interface PolicyCategorySummary {
  category: "Health Insurance" | "Motor Insurance";
  total: number;
  active: number;
  expired: number;
  pending: number;
  growth: string;
  totalPremium: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: "policy" | "agent" | "system" | "claim";
}

// Default initial KPI values as per specification
export const initialKpiData: KpiStats = {
  totalPolicies: 1248,
  policiesSold: 982,
  activePolicies: 856,
  totalPremium: 4865000,
  totalAgents: 24,
  policiesGrowth: "+8.4%",
  soldGrowth: "+12.1%",
  activeGrowth: "+5.6%",
  premiumGrowth: "+14.8%",
  agentsGrowth: "+2 this mo",
};

// Analytics timeline datasets for 7 Days, 30 Days, 6 Months, 1 Year
export const salesOverviewDatasets: Record<"7D" | "30D" | "6M" | "1Y", SalesDataPoint[]> = {
  "7D": [
    { period: "Mon", policiesSold: 18, premiumAmount: 92000 },
    { period: "Tue", policiesSold: 24, premiumAmount: 118000 },
    { period: "Wed", policiesSold: 20, premiumAmount: 104000 },
    { period: "Thu", policiesSold: 31, premiumAmount: 165000 },
    { period: "Fri", policiesSold: 27, premiumAmount: 142000 },
    { period: "Sat", policiesSold: 35, premiumAmount: 188000 },
    { period: "Sun", policiesSold: 22, premiumAmount: 110000 },
  ],
  "30D": [
    { period: "Week 1", policiesSold: 165, premiumAmount: 820000 },
    { period: "Week 2", policiesSold: 210, premiumAmount: 1050000 },
    { period: "Week 3", policiesSold: 285, premiumAmount: 1410000 },
    { period: "Week 4", policiesSold: 322, premiumAmount: 1585000 },
  ],
  "6M": [
    { period: "Apr", policiesSold: 120, premiumAmount: 580000 },
    { period: "May", policiesSold: 145, premiumAmount: 710000 },
    { period: "Jun", policiesSold: 172, premiumAmount: 850000 },
    { period: "Jul", policiesSold: 160, premiumAmount: 790000 },
    { period: "Aug", policiesSold: 195, premiumAmount: 980000 },
    { period: "Sep", policiesSold: 230, premiumAmount: 1150000 },
  ],
  "1Y": [
    { period: "Q1 2025", policiesSold: 380, premiumAmount: 1880000 },
    { period: "Q2 2025", policiesSold: 460, premiumAmount: 2290000 },
    { period: "Q3 2025", policiesSold: 590, premiumAmount: 2940000 },
    { period: "Q4 2025", policiesSold: 710, premiumAmount: 3550000 },
  ],
};

// Donut chart distribution data
export const policyDistributionData: PolicyDistributionItem[] = [
  {
    name: "Health Insurance",
    value: 58,
    count: 724,
    color: "#2563eb", // Primary Blue
    percentage: "58%",
  },
  {
    name: "Motor Insurance",
    value: 34,
    count: 424,
    color: "#059669", // Emerald
    percentage: "34%",
  },
  {
    name: "Other Policies",
    value: 8,
    count: 100,
    color: "#d97706", // Amber
    percentage: "8%",
  },
];

// Agent Performance data
export const agentPerformanceList: AgentPerformanceRecord[] = [
  {
    id: "agt-01",
    name: "Agent 01",
    code: "AGT-01",
    avatar: "RV",
    email: "rajesh.verma@insurex.com",
    policiesSold: 125,
    premiumGenerated: 840000,
    customers: 103,
    status: "Active",
    joinDate: "Jan 2024",
    rating: 4.9,
  },
  {
    id: "agt-02",
    name: "Agent 02",
    code: "AGT-02",
    avatar: "PS",
    email: "priya.sharma@insurex.com",
    policiesSold: 98,
    premiumGenerated: 620000,
    customers: 81,
    status: "Active",
    joinDate: "Mar 2024",
    rating: 4.8,
  },
  {
    id: "agt-03",
    name: "Agent 03",
    code: "AGT-03",
    avatar: "AK",
    email: "amit.kumar@insurex.com",
    policiesSold: 76,
    premiumGenerated: 480000,
    customers: 65,
    status: "Active",
    joinDate: "May 2024",
    rating: 4.7,
  },
  {
    id: "agt-04",
    name: "Agent 04",
    code: "AGT-04",
    avatar: "SP",
    email: "sneha.patel@insurex.com",
    policiesSold: 54,
    premiumGenerated: 345000,
    customers: 48,
    status: "Active",
    joinDate: "Jul 2024",
    rating: 4.6,
  },
  {
    id: "agt-05",
    name: "Agent 05",
    code: "AGT-05",
    avatar: "VM",
    email: "vikram.malhotra@insurex.com",
    policiesSold: 42,
    premiumGenerated: 290000,
    customers: 36,
    status: "Active",
    joinDate: "Aug 2024",
    rating: 4.5,
  },
];

// Recent Policy Sales list
export const recentPolicySalesList: RecentPolicySale[] = [
  {
    id: "pol-10021",
    policyNumber: "POL-10021",
    customerName: "Rahul Sharma",
    customerEmail: "rahul.s@example.com",
    policyType: "Health",
    policyName: "Health Gold",
    agentName: "Agent 01",
    agentCode: "AGT-01",
    premium: 15000,
    issueDate: "26 Sep 2026",
    status: "Active",
  },
  {
    id: "pol-10020",
    policyNumber: "POL-10020",
    customerName: "Arun Kumar",
    customerEmail: "arun.k@example.com",
    policyType: "Motor",
    policyName: "Car Comprehensive",
    agentName: "Agent 02",
    agentCode: "AGT-02",
    premium: 9500,
    issueDate: "26 Sep 2026",
    status: "Active",
  },
  {
    id: "pol-10019",
    policyNumber: "POL-10019",
    customerName: "Meera Nair",
    customerEmail: "meera.nair@example.com",
    policyType: "Health",
    policyName: "Family Floater Plus",
    agentName: "Agent 03",
    agentCode: "AGT-03",
    premium: 22500,
    issueDate: "25 Sep 2026",
    status: "Active",
  },
  {
    id: "pol-10018",
    policyNumber: "POL-10018",
    customerName: "Sandeep Roy",
    customerEmail: "sandeep.roy@example.com",
    policyType: "Motor",
    policyName: "Two-Wheeler Protect",
    agentName: "Agent 01",
    agentCode: "AGT-01",
    premium: 4200,
    issueDate: "25 Sep 2026",
    status: "Active",
  },
  {
    id: "pol-10017",
    policyNumber: "POL-10017",
    customerName: "Ananya Sen",
    customerEmail: "ananya.sen@example.com",
    policyType: "Health",
    policyName: "Critical Care 360",
    agentName: "Agent 04",
    agentCode: "AGT-04",
    premium: 18000,
    issueDate: "24 Sep 2026",
    status: "Pending",
  },
  {
    id: "pol-10016",
    policyNumber: "POL-10016",
    customerName: "Devendra Singh",
    customerEmail: "devendra.singh@example.com",
    policyType: "Motor",
    policyName: "Commercial Fleet Shield",
    agentName: "Agent 02",
    agentCode: "AGT-02",
    premium: 45000,
    issueDate: "24 Sep 2026",
    status: "Active",
  },
  {
    id: "pol-10015",
    policyNumber: "POL-10015",
    customerName: "Kavita Reddy",
    customerEmail: "kavita.r@example.com",
    policyType: "Health",
    policyName: "Senior Citizen Care",
    agentName: "Agent 03",
    agentCode: "AGT-03",
    premium: 28000,
    issueDate: "23 Sep 2026",
    status: "In Review",
  },
];

// Compact Policy Summary cards data
export const policySummaryCategories: PolicyCategorySummary[] = [
  {
    category: "Health Insurance",
    total: 724,
    active: 512,
    expired: 142,
    pending: 70,
    growth: "+14.2%",
    totalPremium: "₹29,80,000",
  },
  {
    category: "Motor Insurance",
    total: 524,
    active: 344,
    expired: 128,
    pending: 52,
    growth: "+9.8%",
    totalPremium: "₹18,85,000",
  },
];

// Notifications list
export const adminNotificationsList: AdminNotification[] = [
  {
    id: "notif-1",
    title: "New Policy Issued",
    description: "Agent 01 closed Health Gold (POL-10021) for Rahul Sharma.",
    time: "10 mins ago",
    unread: true,
    type: "policy",
  },
  {
    id: "notif-2",
    title: "Underwriting Approval Pending",
    description: "Critical Care 360 policy (POL-10017) requires manual review.",
    time: "45 mins ago",
    unread: true,
    type: "claim",
  },
  {
    id: "notif-3",
    title: "Agent Target Achieved",
    description: "Agent 02 has crossed monthly premium goal of ₹6,00,000.",
    time: "2 hours ago",
    unread: false,
    type: "agent",
  },
];

// Currency Formatter helper
export const formatINR = (value: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};
