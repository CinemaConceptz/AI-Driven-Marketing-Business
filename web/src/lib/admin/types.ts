export type SubmissionStatus = "submitted" | "reviewing" | "approved" | "rejected";

export type Submission = {
  id: string;
  uid: string;
  epkSlug?: string;
  status: SubmissionStatus;
  createdAt?: any;
  updatedAt?: any;
  submittedAt?: any;
  artistName?: string;
  name?: string;
  email?: string;
  genre?: string;
  links?: string;
  goals?: string;
};

export type Payment = {
  id: string;
  uid: string;
  status: "paid" | "failed" | "refunded";
  amount?: number;
  currency?: string;
  createdAt?: any;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
};

export type EmailLog = {
  id: string;
  type: string;
  to: string;
  status: "sent" | "failed";
  templateId?: number;
  postmarkMessageId?: string | null;
  error?: string | null;
  createdAt?: any;
  uid?: string | null;
  meta?: Record<string, unknown>;
};

export type AdminUser = {
  id: string;
  email?: string;
  displayName?: string;
  artistName?: string;
  createdAt?: any;
  paymentStatus?: string;
  applicationStatus?: string;
};
