export const AnalyticsEvent = {
  ADMIN_ANALYTICS_OPENED: "admin_analytics_opened",
  ADMIN_DASHBOARD_OPENED: "admin_dashboard_opened",

  DASHBOARD_OPENED: "dashboard_opened",

  LOGIN_PAGE_OPENED: "login_page_opened",
  SIGNUP_PAGE_OPENED: "signup_page_opened",
  LOGIN_SUCCESS: "login_success",
  SIGNUP_SUCCESS: "signup_success",
  LOGOUT_CLICKED: "logout_clicked",

  CONTRACTOR_DASHBOARD_OPENED: "contractor_dashboard_opened",
  CONTRACTOR_JOBS_OPENED: "contractor_jobs_opened",
  CONTRACTOR_BIDS_OPENED: "contractor_bids_opened",
  CONTRACTOR_CUSTOMERS_OPENED: "contractor_customers_opened",
  CONTRACTOR_ONBOARDING_COMPANY_OPENED: "contractor_onboarding_company_opened",

  CONTRACTOR_ONBOARDING_STARTED: "contractor_onboarding_started",
  CONTRACTOR_ONBOARDING_SUBMITTED: "contractor_onboarding_submitted",
  CONTRACTOR_COMPANY_SAVED: "contractor_company_saved",
  CONTRACTOR_COMPANY_CHANGE_REQUESTED: "contractor_company_change_requested",

  COI_UPLOADED: "coi_uploaded",
  INSURANCE_UPLOADED: "insurance_uploaded",
  CERT_UPLOADED: "cert_uploaded",

  TEAM_CREATED: "team_created",
  TEAM_CHANGE_REQUESTED: "team_change_requested",

  CUSTOMER_APPROVAL_REQUESTED: "customer_approval_requested",

  JOB_OPENED: "job_opened",
  BID_STARTED: "bid_started",
  BID_SUBMITTED: "bid_submitted",

  CUSTOMER_DASHBOARD_OPENED: "customer_dashboard_opened",
  CUSTOMER_JOBS_OPENED: "customer_jobs_opened",
  CUSTOMER_JOBS_NEW_OPENED: "customer_jobs_new_opened",
  CUSTOMER_BIDS_OPENED: "customer_bids_opened",
  CUSTOMER_CONTRACTORS_ALL_OPENED: "customer_contractors_all_opened",
  CUSTOMER_CONTRACTORS_APPROVED_OPENED: "customer_contractors_approved_opened",

  JOB_CREATE_STARTED: "job_create_started",
  JOB_CREATED: "job_created",

  CONTRACTOR_PROFILE_OPENED: "contractor_profile_opened",
  CONTRACTOR_APPROVED: "contractor_approved",
  CONTRACTOR_REJECTED: "contractor_rejected",

  RESOURCE_CREATED: "resource_created",
  RESOURCE_UPDATED: "resource_updated",
  RESOURCE_UPLOADED: "resource_uploaded",
  AGREEMENT_OPENED: "agreement_opened",

  MISSION_PAGE_OPENED: "mission_page_opened",
  DONATION_CHECKOUT_STARTED: "donation_checkout_started",
  DONATION_CHECKOUT_SUCCESS: "donation_checkout_success",
  DONATION_CHECKOUT_CANCELLED: "donation_checkout_cancelled",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];