export type RegionType = "state" | "province" | "region";

export type Region = {
  code: string;
  name: string;
  countryCode: string;
  type: RegionType;
};

export const US_STATES: Region[] = [
  { code: "AL", name: "Alabama", countryCode: "US", type: "state" },
  { code: "AK", name: "Alaska", countryCode: "US", type: "state" },
  { code: "AZ", name: "Arizona", countryCode: "US", type: "state" },
  { code: "AR", name: "Arkansas", countryCode: "US", type: "state" },
  { code: "CA", name: "California", countryCode: "US", type: "state" },
  { code: "CO", name: "Colorado", countryCode: "US", type: "state" },
  { code: "CT", name: "Connecticut", countryCode: "US", type: "state" },
  { code: "DE", name: "Delaware", countryCode: "US", type: "state" },
  { code: "FL", name: "Florida", countryCode: "US", type: "state" },
  { code: "GA", name: "Georgia", countryCode: "US", type: "state" },
  { code: "HI", name: "Hawaii", countryCode: "US", type: "state" },
  { code: "ID", name: "Idaho", countryCode: "US", type: "state" },
  { code: "IL", name: "Illinois", countryCode: "US", type: "state" },
  { code: "IN", name: "Indiana", countryCode: "US", type: "state" },
  { code: "IA", name: "Iowa", countryCode: "US", type: "state" },
  { code: "KS", name: "Kansas", countryCode: "US", type: "state" },
  { code: "KY", name: "Kentucky", countryCode: "US", type: "state" },
  { code: "LA", name: "Louisiana", countryCode: "US", type: "state" },
  { code: "ME", name: "Maine", countryCode: "US", type: "state" },
  { code: "MD", name: "Maryland", countryCode: "US", type: "state" },
  { code: "MA", name: "Massachusetts", countryCode: "US", type: "state" },
  { code: "MI", name: "Michigan", countryCode: "US", type: "state" },
  { code: "MN", name: "Minnesota", countryCode: "US", type: "state" },
  { code: "MS", name: "Mississippi", countryCode: "US", type: "state" },
  { code: "MO", name: "Missouri", countryCode: "US", type: "state" },
  { code: "MT", name: "Montana", countryCode: "US", type: "state" },
  { code: "NE", name: "Nebraska", countryCode: "US", type: "state" },
  { code: "NV", name: "Nevada", countryCode: "US", type: "state" },
  { code: "NH", name: "New Hampshire", countryCode: "US", type: "state" },
  { code: "NJ", name: "New Jersey", countryCode: "US", type: "state" },
  { code: "NM", name: "New Mexico", countryCode: "US", type: "state" },
  { code: "NY", name: "New York", countryCode: "US", type: "state" },
  { code: "NC", name: "North Carolina", countryCode: "US", type: "state" },
  { code: "ND", name: "North Dakota", countryCode: "US", type: "state" },
  { code: "OH", name: "Ohio", countryCode: "US", type: "state" },
  { code: "OK", name: "Oklahoma", countryCode: "US", type: "state" },
  { code: "OR", name: "Oregon", countryCode: "US", type: "state" },
  { code: "PA", name: "Pennsylvania", countryCode: "US", type: "state" },
  { code: "RI", name: "Rhode Island", countryCode: "US", type: "state" },
  { code: "SC", name: "South Carolina", countryCode: "US", type: "state" },
  { code: "SD", name: "South Dakota", countryCode: "US", type: "state" },
  { code: "TN", name: "Tennessee", countryCode: "US", type: "state" },
  { code: "TX", name: "Texas", countryCode: "US", type: "state" },
  { code: "UT", name: "Utah", countryCode: "US", type: "state" },
  { code: "VT", name: "Vermont", countryCode: "US", type: "state" },
  { code: "VA", name: "Virginia", countryCode: "US", type: "state" },
  { code: "WA", name: "Washington", countryCode: "US", type: "state" },
  { code: "WV", name: "West Virginia", countryCode: "US", type: "state" },
  { code: "WI", name: "Wisconsin", countryCode: "US", type: "state" },
  { code: "WY", name: "Wyoming", countryCode: "US", type: "state" },
];

export const US_STATE_OPTIONS = US_STATES.map((state) => state.name);

export const HOME_MARKET_OPTIONS = [...US_STATE_OPTIONS];

export const VACANCY_MARKET_OPTIONS = [...US_STATE_OPTIONS, "Nationwide"];

export const READY_TO_WORK_OPTIONS = [...US_STATE_OPTIONS, "Nationwide"];

export function isValidState(name: string) {
  return US_STATES.some((state) => state.name === name);
}

export function isValidUsStateCode(code: string) {
  return US_STATES.some((state) => state.code === code);
}

export function isValidVacancyMarket(value: string) {
  return VACANCY_MARKET_OPTIONS.includes(value);
}

export function isValidReadyToWorkMarket(value: string) {
  return READY_TO_WORK_OPTIONS.includes(value);
}

export function getStateByName(name: string) {
  return US_STATES.find((state) => state.name === name) || null;
}

export function getStateByCode(code: string) {
  return US_STATES.find((state) => state.code === code) || null;
}