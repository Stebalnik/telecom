export type ContractorTrustBadge = {
  label: string;
  status: "verified" | "active" | "pending";
  description: string;
};

export type ContractorProfileStrengthInput = {
  hasBasicInfo: boolean;
  hasMarket: boolean;
  hasServices: boolean;
  hasInsurance: boolean;
  hasCertifications: boolean;
  hasTeam: boolean;
};

export type ContractorProfileStrength = {
  score: number;
  label: string;
  completed: string[];
  missing: string[];
};

const profileStrengthWeights = [
  { key: "hasBasicInfo", label: "Basic info", points: 20 },
  { key: "hasMarket", label: "Market", points: 15 },
  { key: "hasServices", label: "Services", points: 15 },
  { key: "hasInsurance", label: "Insurance", points: 20 },
  { key: "hasCertifications", label: "Certifications", points: 20 },
  { key: "hasTeam", label: "Team", points: 10 },
] as const;

export function calculateContractorProfileStrength(
  input: ContractorProfileStrengthInput
): ContractorProfileStrength {
  const completed: string[] = [];
  const missing: string[] = [];
  let score = 0;

  for (const item of profileStrengthWeights) {
    if (input[item.key]) {
      score += item.points;
      completed.push(item.label);
    } else {
      missing.push(item.label);
    }
  }

  return {
    score,
    label: score >= 85 ? "Strong" : score >= 60 ? "Growing" : "Needs work",
    completed,
    missing,
  };
}

export function buildContractorTrustBadges(contractor: {
  insuranceVerified: boolean;
  certificationsVerified: boolean;
  customerApproved: boolean;
  activeProfile: boolean;
  teamConfigured: boolean;
  eligibleToBid: boolean;
}): ContractorTrustBadge[] {
  return [
    {
      label: contractor.insuranceVerified
        ? "Insurance verified"
        : "Insurance review pending",
      status: contractor.insuranceVerified ? "verified" : "pending",
      description: contractor.insuranceVerified
        ? "Insurance coverage is represented by public-safe verification signals."
        : "Insurance evidence remains protected during authenticated review.",
    },
    {
      label: contractor.certificationsVerified
        ? "Certifications verified"
        : "Certifications review pending",
      status: contractor.certificationsVerified ? "verified" : "pending",
      description: contractor.certificationsVerified
        ? "Certification readiness has public-safe verification signals."
        : "Certification evidence is reviewed inside protected workflows.",
    },
    {
      label: contractor.customerApproved
        ? "Customer approved"
        : "Customer approval available",
      status: contractor.customerApproved ? "verified" : "pending",
      description: contractor.customerApproved
        ? "This contractor has customer approval signals in marketplace workflows."
        : "Customers can request approval after signing in.",
    },
    {
      label: contractor.activeProfile ? "Active profile" : "Profile pending",
      status: contractor.activeProfile ? "active" : "pending",
      description: contractor.activeProfile
        ? "Profile is listed for public marketplace discovery."
        : "Profile is not fully listed yet.",
    },
    {
      label: contractor.teamConfigured ? "Team configured" : "Team review pending",
      status: contractor.teamConfigured ? "active" : "pending",
      description: contractor.teamConfigured
        ? "Team capacity is represented by a public-safe readiness signal."
        : "Team details are confirmed inside protected workflows.",
    },
    {
      label: contractor.eligibleToBid ? "Eligible to bid" : "Bid eligibility pending",
      status: contractor.eligibleToBid ? "verified" : "pending",
      description: contractor.eligibleToBid
        ? "Core marketplace readiness signals are present."
        : "Eligibility depends on protected compliance and customer approval checks.",
    },
  ];
}
