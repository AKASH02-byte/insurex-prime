import type {
  HealthPolicyDetails,
  MotorCoverageType,
  PolicyProduct,
  PremiumFrequency,
  VehicleType,
} from "@/components/admin/policies-mock-data";
import type { ApiPolicy, MotorDetails, PolicyInput } from "./types";

// Translates between the backend's policy shape and the frontend PolicyProduct
// model used by the admin UI.

const frequencyFromApi: Record<ApiPolicy["premiumFrequency"], PremiumFrequency> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  ANNUAL: "Annual",
};
const frequencyToApi = Object.fromEntries(
  Object.entries(frequencyFromApi).map(([api, ui]) => [ui, api]),
) as Record<PremiumFrequency, ApiPolicy["premiumFrequency"]>;

const vehicleFromApi: Record<MotorDetails["vehicleType"], VehicleType> = {
  PRIVATE_CAR: "Private Car",
  TWO_WHEELER: "Two Wheeler",
  COMMERCIAL_VEHICLE: "Commercial Vehicle",
};
const vehicleToApi = Object.fromEntries(
  Object.entries(vehicleFromApi).map(([api, ui]) => [ui, api]),
) as Record<VehicleType, MotorDetails["vehicleType"]>;

const coverageFromApi: Record<MotorDetails["coverageType"], MotorCoverageType> = {
  THIRD_PARTY: "Third Party",
  COMPREHENSIVE: "Comprehensive",
  OWN_DAMAGE: "Own Damage",
};
const coverageToApi = Object.fromEntries(
  Object.entries(coverageFromApi).map(([api, ui]) => [ui, api]),
) as Record<MotorCoverageType, MotorDetails["coverageType"]>;

export function toPolicyProduct(policy: ApiPolicy): PolicyProduct {
  const base = {
    id: policy.id,
    code: policy.policyCode,
    name: policy.policyName,
    description: policy.description,
    coverageAmount: policy.coverageAmount,
    premium: policy.premium,
    premiumFrequency: frequencyFromApi[policy.premiumFrequency],
    durationMonths: policy.durationMonths,
    eligibility: policy.eligibility,
    benefits: policy.benefits,
    terms: policy.terms,
    status: policy.status === "ACTIVE" ? ("Active" as const) : ("Inactive" as const),
    policiesSold: policy.policiesSold ?? 0,
    lastUpdated: policy.updatedAt.slice(0, 10),
  };
  const details = policy.categoryDetails;
  if (policy.insuranceType === "HEALTH") {
    const health: HealthPolicyDetails =
      details?.kind === "HEALTH"
        ? {
            planType: details.planType === "FAMILY" ? "Family" : "Individual",
            sumInsured: details.sumInsured,
            hospitalizationCoverage: details.hospitalizationCoverage,
            waitingPeriod: details.waitingPeriod,
            ageEligibility: details.ageEligibility,
          }
        : {
            planType: "Individual",
            sumInsured: policy.coverageAmount,
            hospitalizationCoverage: "",
            waitingPeriod: "",
            ageEligibility: "",
          };
    return { ...base, type: "Health", health };
  }
  return {
    ...base,
    type: "Motor",
    motor:
      details?.kind === "MOTOR"
        ? {
            vehicleType: vehicleFromApi[details.vehicleType],
            coverageType: coverageFromApi[details.coverageType],
            ownDamage: details.ownDamage,
            thirdPartyCoverage: details.thirdPartyCoverage,
            vehicleEligibility: details.vehicleEligibility,
          }
        : {
            vehicleType: "Private Car",
            coverageType: "Comprehensive",
            ownDamage: "",
            thirdPartyCoverage: "",
            vehicleEligibility: "",
          },
  };
}

export function toPolicyInput(product: PolicyProduct): PolicyInput {
  return {
    policyCode: product.code,
    policyName: product.name,
    insuranceType: product.type === "Health" ? "HEALTH" : "MOTOR",
    description: product.description,
    coverageAmount: product.coverageAmount,
    premium: product.premium,
    premiumFrequency: frequencyToApi[product.premiumFrequency],
    durationMonths: product.durationMonths,
    eligibility: product.eligibility,
    benefits: product.benefits,
    terms: product.terms,
    status: product.status === "Active" ? "ACTIVE" : "INACTIVE",
    categoryDetails:
      product.type === "Health"
        ? {
            kind: "HEALTH",
            planType: product.health.planType === "Family" ? "FAMILY" : "INDIVIDUAL",
            sumInsured: product.health.sumInsured,
            hospitalizationCoverage: product.health.hospitalizationCoverage,
            waitingPeriod: product.health.waitingPeriod,
            ageEligibility: product.health.ageEligibility,
          }
        : {
            kind: "MOTOR",
            vehicleType: vehicleToApi[product.motor.vehicleType],
            coverageType: coverageToApi[product.motor.coverageType],
            ownDamage: product.motor.ownDamage,
            thirdPartyCoverage: product.motor.thirdPartyCoverage,
            vehicleEligibility: product.motor.vehicleEligibility,
          },
  };
}
