// api/notify-test.js
// Fires a test WhatsApp message and a test email WITHOUT creating a booking,
// so you can check your setup without filling the database with junk rows.
//
//   /api/notify-test
//
// The response tells you, per channel, whether it went out and why not.

import { notifyAll } from "../lib/notify.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const now = new Date();

  const fakeBooking = {
    customer_name: "Test Customer",
    phone: "9876500099",
    service: "Haircut",
    stylist: "Ravi",
    booking_date: now.toISOString().slice(0, 10),
    start_time: `${String(now.getHours()).padStart(2, "0")}:00`,
    amount: 300
  };

  const notifications = await notifyAll(fakeBooking);

  const configured = {
    whatsapp: Boolean(process.env.WHATSAPP_PHONE && process.env.WHATSAPP_APIKEY),
    email: Boolean(
      process.env.EMAILJS_SERVICE_ID &&
      process.env.EMAILJS_TEMPLATE_ID &&
      process.env.EMAILJS_PUBLIC_KEY
    )
  };

  const hints = [];
  if (!configured.whatsapp) hints.push("WhatsApp: set WHATSAPP_PHONE and WHATSAPP_APIKEY in Vercel, then redeploy.");
  if (!configured.email) hints.push("Email: set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID and EMAILJS_PUBLIC_KEY in Vercel, then redeploy.");
  if (notifications.email.reason?.startsWith("emailjs_4")) {
    hints.push("EmailJS rejected the call. In EmailJS go to Account > Security and allow API calls for non-browser applications, or add EMAILJS_PRIVATE_KEY.");
  }

  return res.status(200).json({
    note: "This did not create a booking. It only tried to send the notifications.",
    configured,
    notifications,
    hints: hints.length ? hints : undefined,
    test_message: fakeBooking
  });
}
