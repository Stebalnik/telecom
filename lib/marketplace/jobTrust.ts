export type JobTrustSignal = {
  label: string;
  status: "verified" | "complete" | "pending";
  description: string;
};

export function buildJobTrustSignals(job: {
  isPublicReady: boolean;
  hasScope: boolean;
  hasCertRequirements: boolean;
  hasTimeline: boolean;
  hasDocuments: boolean;
}): JobTrustSignal[] {
  return [
    {
      label: job.isPublicReady ? "Public-ready listing" : "Public review pending",
      status: job.isPublicReady ? "verified" : "pending",
      description: job.isPublicReady
        ? "This job only exposes marketplace-safe fields."
        : "This job needs public readiness review.",
    },
    {
      label: job.hasScope ? "Complete job scope" : "Scope summary pending",
      status: job.hasScope ? "complete" : "pending",
      description: job.hasScope
        ? "Contractors can understand the operational scope before applying."
        : "Detailed scope can be completed before stronger matching.",
    },
    {
      label: job.hasCertRequirements
        ? "Cert requirements added"
        : "Cert requirements pending",
      status: job.hasCertRequirements ? "complete" : "pending",
      description: job.hasCertRequirements
        ? "Certification expectations are visible for eligibility planning."
        : "Certification requirements can be added to improve fit quality.",
    },
    {
      label: job.hasTimeline ? "Timeline added" : "Timeline pending",
      status: job.hasTimeline ? "complete" : "pending",
      description: job.hasTimeline
        ? "A target timeline is available for capacity planning."
        : "Timeline details can improve contractor response quality.",
    },
    {
      label: job.hasDocuments ? "Documents attached" : "Documents protected",
      status: job.hasDocuments ? "complete" : "pending",
      description: job.hasDocuments
        ? "Supporting documents are handled inside protected workflows."
        : "Private files are not exposed on public marketplace pages.",
    },
  ];
}
