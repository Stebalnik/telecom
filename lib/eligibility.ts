import { supabase } from "./supabaseClient";

export async function recalcCompanyStatus(companyId: string) {
  const { error } = await supabase.rpc("recalc_company_status", { p_company_id: companyId });
  if (error) throw error;
}

export type ContractorEligibilityInput = {
  requiredCertifications?: string[];
  requiredInsurance?: string[];
  requiredMarkets?: string[];
  requiredServices?: string[];
  requiredTeamSize?: number | null;
  contractorCertifications?: string[];
  contractorInsurance?: string[];
  contractorMarkets?: string[];
  contractorServices?: string[];
  contractorTeamSize?: number | null;
};

export type ContractorEligibilityScore = {
  certification_match: number;
  insurance_match: number;
  market_fit: number;
  service_scope_fit: number;
  team_readiness: number;
  overall: number;
};

export type ContractorEligibilityResult = {
  score: ContractorEligibilityScore;
  eligible: boolean;
  partiallyEligible: boolean;
};

function normalizeList(values?: string[]) {
  return new Set(
    (values ?? [])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function percentMatched(requiredValues?: string[], availableValues?: string[]) {
  const required = normalizeList(requiredValues);
  if (required.size === 0) return 100;

  const available = normalizeList(availableValues);
  let matched = 0;

  for (const value of required) {
    if (available.has(value)) matched += 1;
  }

  return Math.round((matched / required.size) * 100);
}

function teamReadiness(required?: number | null, available?: number | null) {
  if (!required || required <= 0) return 100;
  if (!available || available <= 0) return 0;
  return Math.min(100, Math.round((available / required) * 100));
}

export function calculateContractorEligibility(
  input: ContractorEligibilityInput
): ContractorEligibilityResult {
  const certificationMatch = percentMatched(
    input.requiredCertifications,
    input.contractorCertifications
  );
  const insuranceMatch = percentMatched(
    input.requiredInsurance,
    input.contractorInsurance
  );
  const marketFit = percentMatched(input.requiredMarkets, input.contractorMarkets);
  const serviceScopeFit = percentMatched(
    input.requiredServices,
    input.contractorServices
  );
  const teamScore = teamReadiness(
    input.requiredTeamSize,
    input.contractorTeamSize
  );

  const overall = Math.round(
    certificationMatch * 0.25 +
      insuranceMatch * 0.25 +
      marketFit * 0.2 +
      serviceScopeFit * 0.2 +
      teamScore * 0.1
  );

  return {
    score: {
      certification_match: certificationMatch,
      insurance_match: insuranceMatch,
      market_fit: marketFit,
      service_scope_fit: serviceScopeFit,
      team_readiness: teamScore,
      overall,
    },
    eligible: overall >= 90,
    partiallyEligible: overall >= 50 && overall < 90,
  };
}
