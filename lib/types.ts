export type UserRole = "student" | "registrar" | "admin" | "guidance";

export type RequestStatus =
  | "Pending"
  | "Payment Verification"
  | "Processing"
  | "Ready for Pickup"
  | "Completed"
  | "Rejected";

export type PaymentStatus = "Pending" | "Verified" | "Rejected";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface Profile {
  id: string;
  student_number: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  course: string | null;
  contact_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  name: string;
  description: string | null;
  fee: number;
  processing_days: number;
  is_active: boolean;
}

export interface Request {
  id: number;
  tracking_code: string;
  user_id: string;
  document_id: number;
  purpose: string | null;
  copies: number;
  status: RequestStatus;
  remarks: string | null;
  class_list: string | null;
  guidance_status: ApprovalStatus | null;
  clearance_status: ApprovalStatus | null;
  created_at: string;
  updated_at: string;
}

export interface RequestWithRelations extends Request {
  documents: { name: string } | null;
  profiles: { full_name: string; student_number: string | null } | null;
}

export interface Payment {
  id: number;
  request_id: number;
  gcash_reference: string;
  proof_image: string;
  amount: number;
  status: PaymentStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface PaymentWithRelations extends Payment {
  requests: RequestWithRelations | null;
}

export interface StatusHistory {
  id: number;
  request_id: number;
  status: string;
  changed_by: string | null;
  remarks: string | null;
  changed_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  request_id: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface RecentRequest {
  id: number;
  tracking_code: string;
  status: string;
  created_at: string;
  documents: { name: string } | null;
}
