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
