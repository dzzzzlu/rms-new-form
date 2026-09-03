const wrapper = (title: string, body: string) => `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;text-align:center;">
  <h2 style="color:#0D47A1;">Regis Marie College — ${title}</h2>
  ${body}
  <p style="color:#94a3b8;font-size:11px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;">
    This is an automated message from the Regis Marie College Document Request System.
  </p>
</div>`;

export const statusUpdate = (docName: string, trackingCode: string, status: string, studentName: string) =>
  wrapper(
    "Request Status Update",
    `<p style="color:#334155;font-size:14px;">Hi <strong>${studentName}</strong>,</p>
     <p style="color:#334155;font-size:14px;">Your <strong>${docName}</strong> request (<strong>${trackingCode}</strong>) has been updated to <strong>${status}</strong>.</p>`
  );

export const goodMoralApproved = (trackingCode: string, studentName: string) =>
  wrapper(
    "Good Moral Certificate — Approved",
    `<p style="color:#334155;font-size:14px;">Hi <strong>${studentName}</strong>,</p>
     <p style="color:#334155;font-size:14px;">Your Good Moral Certificate request (<strong>${trackingCode}</strong>) has been <strong>approved</strong> by the Guidance Department and is now being processed.</p>`
  );

export const goodMoralRejected = (trackingCode: string, studentName: string) =>
  wrapper(
    "Good Moral Certificate — Not Approved",
    `<p style="color:#334155;font-size:14px;">Hi <strong>${studentName}</strong>,</p>
     <p style="color:#334155;font-size:14px;">Your Good Moral Certificate request (<strong>${trackingCode}</strong>) was <strong>not approved</strong> by the Guidance Department. Please contact the guidance office for details.</p>`
  );

export const paymentVerified = (trackingCode: string, studentName: string) =>
  wrapper(
    "Payment Verified",
    `<p style="color:#334155;font-size:14px;">Hi <strong>${studentName}</strong>,</p>
     <p style="color:#334155;font-size:14px;">Your payment for request (<strong>${trackingCode}</strong>) has been verified. Your request is now being processed.</p>`
  );

export const paymentRejected = (trackingCode: string, studentName: string, reason: string) =>
  wrapper(
    "Payment Rejected",
    `<p style="color:#334155;font-size:14px;">Hi <strong>${studentName}</strong>,</p>
     <p style="color:#334155;font-size:14px;">Your payment for request (<strong>${trackingCode}</strong>) has been rejected.${reason ? ` Reason: ${reason}` : ""}</p>`
  );

export const diplomaClearance = (trackingCode: string, studentName: string, status: string) =>
  wrapper(
    "Diploma Clearance Update",
    `<p style="color:#334155;font-size:14px;">Hi <strong>${studentName}</strong>,</p>
     <p style="color:#334155;font-size:14px;">Your Diploma request (<strong>${trackingCode}</strong>) clearance has been marked as <strong>${status}</strong>.</p>`
  );

export const passwordReset = (code: string) =>
  wrapper(
    "Password Reset Code",
    `<p style="color:#334155;font-size:14px;">Use the following 6-digit code to reset your password:</p>
     <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0D47A1;margin:24px 0;">${code}</p>
     <p style="color:#64748b;font-size:12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  );

export const emailVerification = (code: string) =>
  wrapper(
    "Verify Your Email",
    `<p style="color:#334155;font-size:14px;">Use the following 6-digit code to verify your email address:</p>
     <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0D47A1;margin:24px 0;">${code}</p>
     <p style="color:#64748b;font-size:12px;">This code expires in 10 minutes. If you didn't create an account, ignore this email.</p>`
  );
