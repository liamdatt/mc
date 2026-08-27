export const INQUIRY_TYPE = {
  QUOTE: "QUOTE",
  SAMPLE: "SAMPLE",
  CONTACT: "CONTACT",
} as const;
export type InquiryType = (typeof INQUIRY_TYPE)[keyof typeof INQUIRY_TYPE];

export const INQUIRY_STATUS = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  CLOSED: "CLOSED",
} as const;
export type InquiryStatus = (typeof INQUIRY_STATUS)[keyof typeof INQUIRY_STATUS];

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  CLOSED: "Closed",
};

export const INQUIRY_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Quote request",
  SAMPLE: "Sample request",
  CONTACT: "Contact message",
};

// TODO: replace with MEC's real WhatsApp business number (pending from client).
export const WHATSAPP_URL = "https://wa.me/18760000000";

export const SHOWROOM_ADDRESS = "14½ Retirement Rd";

export const MATCH_STATUS = {
  VERIFIED: "VERIFIED",
  POTENTIAL_MATCH: "POTENTIAL_MATCH",
  NO_MATCH: "NO_MATCH",
} as const;

export const MATCH_STATUS_LABELS: Record<string, string> = {
  VERIFIED: "Verified",
  POTENTIAL_MATCH: "Potential match",
  NO_MATCH: "New customer",
};

export const APPLICATION_STATUS = {
  SUBMITTED: "SUBMITTED",
  INFO_REQUESTED: "INFO_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  INFO_REQUESTED: "Info requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
