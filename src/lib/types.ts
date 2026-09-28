export type Role = "STAFF" | "CLIENT" | "ADMIN";

export type OrderStatus =
  | "LEAD"
  | "BRIEF"
  | "QUOTE"
  | "PROOF"
  | "PRODUCTION"
  | "QC"
  | "SHIPPING"
  | "DELIVERED"
  | "REORDER_READY";

export type FileKind = "LOGO" | "PROOF" | "BRIEF" | "OTHER" | "PRODUCT";
export type ProofStatus = "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type MagicLinkPurpose = "LOGIN" | "PROOF_REVIEW";
