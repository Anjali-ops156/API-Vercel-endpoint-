// lib/notify.js
// Session 8 features 01 and 02 — WhatsApp and Email notification.
//
// This is NOT an endpoint. It is a helper that api/bookings.js calls AFTER
// a booking has already been saved to Supabase.
//
// ── The one design rule that matters here ────────────────────────────────
// A failed notification must NEVER fail the booking. By the time this runs,
// the appointment is already safely in the database. If WhatsApp is down or
// the email quota is finished, the customer still has their slot — we only
// report that the message did not go out.
//
// This is the same reason the invoice email in the SalonEase design sits
// OUTSIDE the database transaction: anything that can be retried later does
// not belong inside the part that must either all succeed or all fail.

// ─────────────────────────────────────────────── the message both channels use
export function buildMessage(b) {
  const time = String(b.start_time ?? "").slice(0, 5);
  const lines = [
    `Customer: ${b.customer_name}`,
    b.phone ? `Phone: ${b.phone}` : null,
    `Service: ${b.service}`,
    b.stylist ? `Stylist: ${b.stylist}` : null,
    `When: ${b.booking_date} at ${time}`,
    b.amount != null ? `Amount: Rs ${b.amount}` : null
  ].filter(Boolean);

  return {
    subject: `New booking — ${b.customer_name}, ${b.service}`,
    body: ["New booking at SalonEase", "", ...lines].join("\n"),
    lines
  };
}

// ──────────────────────────────────────────────────── 01. WhatsApp (CallMeBot)
export async function sendWhatsApp(text) {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_APIKEY;

  if (!phone || !apikey) {
    return { sent: false, reason: "not_configured" };
  }

  const url = "https://api.callmebot.com/whatsapp.php"
    + `?phone=${encodeURIComponent(phone)}`
    + `&text=${encodeURIComponent(text)}`
    + `&apikey=${encodeURIComponent(apikey)}`;

  try {
    const body = await withTimeout(
      fetch(url).then(async r => ({ ok: r.ok, status: r.status, text: await r.text() })),
      9000
    );
    if (!body.ok) {
      return { sent: false, reason: `callmebot_${body.status}`, detail: clip(body.text) };
    }
    return { sent: true, detail: clip(body.text) };
  } catch (e) {
    return { sent: false, reason: describeError(e) };
  }
}

// ─────────────────────────────────────────────────────── 02. Email (EmailJS)
export async function sendEmail(booking, msg) {
  const service_id = process.env.EMAILJS_SERVICE_ID;
  const template_id = process.env.EMAILJS_TEMPLATE_ID;
  const user_id = process.env.EMAILJS_PUBLIC_KEY;
  const accessToken = process.env.EMAILJS_PRIVATE_KEY;

  if (!service_id || !template_id || !user_id) {
    return { sent: false, reason: "not_configured" };
  }

  // These keys must match the {{variables}} in your EmailJS template.
  const template_params = {
    subject: msg.subject,
    message: msg.body,
    customer_name: booking.customer_name,
    phone: booking.phone ?? "",
    service: booking.service,
    stylist: booking.stylist ?? "",
    booking_date: booking.booking_date,
    start_time: String(booking.start_time ?? "").slice(0, 5),
    amount: booking.amount ?? ""
  };

  const payload = { service_id, template_id, user_id, template_params };
  if (accessToken) payload.accessToken = accessToken;

  try {
    const r = await withTimeout(
      fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(async res => ({ ok: res.ok, status: res.status, text: await res.text() })),
      9000
    );

    if (!r.ok) {
      // EmailJS answers with plain text, e.g. "API calls are disabled for non-browser applications"
      return { sent: false, reason: `emailjs_${r.status}`, detail: clip(r.text) };
    }
    return { sent: true, detail: clip(r.text) || "OK" };
  } catch (e) {
    return { sent: false, reason: describeError(e) };
  }
}

// ───────────────────────────────────────────────────────────── both at once
export async function notifyAll(booking) {
  const msg = buildMessage(booking);

  // Run them together — one slow channel should not delay the other.
  // allSettled, not all: one rejecting must not lose the other's result.
  const [wa, em] = await Promise.allSettled([
    sendWhatsApp(msg.body),
    sendEmail(booking, msg)
  ]);

  return {
    whatsapp: wa.status === "fulfilled" ? wa.value : { sent: false, reason: "crashed" },
    email: em.status === "fulfilled" ? em.value : { sent: false, reason: "crashed" }
  };
}

// ───────────────────────────────────────────────────────────────── helpers
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
  ]);
}

function clip(s) {
  return String(s ?? "").trim().slice(0, 200);
}

function describeError(e) {
  const m = String(e?.message ?? e);
  return m === "timeout" ? "timed_out" : m.slice(0, 120);
}
