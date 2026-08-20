/**
 * Regis Marie College GCash payment details.
 *
 * Edit the three values below with your real information. They are shown
 * on the student "New Request" page so students know where to send payment.
 *
 * gcashQrValue: what the QR code encodes. GCash doesn't have a public
 * standard deep-link format, so the safest default is to encode the same
 * name + number as text — students can also just read it off and pay
 * manually in the GCash app. If your school has an official merchant QR
 * image (PNG/JPG) instead, skip the generated QR entirely: drop that image
 * in /public/gcash-qr.png and set USE_QR_IMAGE to true below.
 */
export const PAYMENT_CONFIG = {
  gcashName: "Regis Marie College Registrar", // account holder name shown to students
  gcashNumber: "0917 000 0000", // <-- put your real GCash number here
  gcashQrValue: "Regis Marie College Registrar - 0917 000 0000", // text encoded into the generated QR

  // If true, renders /public/gcash-qr.png instead of generating a QR from
  // gcashQrValue above. Use this if your school already has an official
  // GCash QR image (e.g. exported from the GCash app's "Receive Money" screen).
  USE_QR_IMAGE: false,
};
