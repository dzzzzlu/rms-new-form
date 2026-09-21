export type UserRole = "student" | "registrar" | "admin" | "guidance";

export type RequestStatus =
  | "Pending"
  | "Payment Verification"
  | "Processing"
  | "Ready for Pickup"
  | "Completed"
  | "Rejected"
  | "Cancelled";

export type PaymentStatus = "Pending" | "Verified" | "Rejected";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export type EnrollmentStatus = "Currently Enrolled" | "On Leave" | "Graduated" | "Alumni";

export interface NotificationPrefs {
  email_alerts: boolean;
  pickup_reminders: boolean;
  sms_alerts: boolean;
}

export interface Profile {
  id: string;
  student_number: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  course: string | null;
  contact_number: string | null;
  is_active: boolean;
  email_verified: boolean;
  is_alumni: boolean;
  school_year: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  year_level: string | null;
  enrollment_status: EnrollmentStatus;
  consent_accepted_at: string | null;
  notification_prefs: NotificationPrefs;
  last_login_at: string | null;
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
  batch_id: string | null;
  class_list: string | null;
  guidance_status: ApprovalStatus | null;
  clearance_status: ApprovalStatus | null;
  created_at: string;
  updated_at: string;
  pickup_at: string | null;
  preferred_pickup_at: string | null;
}

export interface RequestWithRelations extends Request {
  documents: { name: string } | null;
  payments?: { payment_method: string | null; status?: string | null }[];
  profiles: {
    full_name: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    student_number: string | null;
    course: string | null;
    contact_number: string | null;
    email: string | null;
  } | null;
  user_id: string;
}

export interface Payment {
  id: number;
  request_id: number;
  gcash_reference: string;
  reference_number: string;
  proof_image: string;
  amount: number;
  status: PaymentStatus;
  payment_method: "gcash" | "walk_in";
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
