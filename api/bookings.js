// api/bookings.js
// Steps 3 and 4 — the real SalonEase endpoint.
//   GET  /api/bookings            -> read all bookings from Supabase
//   GET  /api/bookings?date=...   -> only that date
//   POST /api/bookings            -> create a booking
//
// The frontend never touches the database directly. It calls this
// function, and this function talks to Supabase using keys that live
// only in environment variables — never in the code, never in GitHub.

import { createClient } from "@supabase/supabase-js";
import { notifyAll } from "../lib/notify.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Allow the test page (and your frontend) to call this from a browser.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Fail loudly if the environment variables were never set in Vercel.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({
      error: "Server is not configured",
      detail: "SUPABASE_URL or SUPABASE_ANON_KEY is missing. Add them in Vercel > Settings > Environment Variables, then redeploy."
    });
  }

  // ---------------------------------------------------------------- GET
  if (req.method === "GET") {
    let query = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (req.query.date) query = query.eq("booking_date", req.query.date);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: "Could not read bookings", detail: error.message });
    }

    const total = data.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    return res.status(200).json({
      count: data.length,
      total_amount: Number(total.toFixed(2)),
      bookings: data
    });
  }

  // --------------------------------------------------------------- POST
  if (req.method === "POST") {
    const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
    if (!body) {
      return res.status(400).json({ error: "Body must be valid JSON" });
    }

    const { customer_name, phone, service, stylist, booking_date, start_time, amount } = body;

    // Validate on the server. Never trust what the browser sends.
    const missing = [];
    if (!customer_name) missing.push("customer_name");
    if (!service) missing.push("service");
    if (!booking_date) missing.push("booking_date");
    if (!start_time) missing.push("start_time");
    if (missing.length) {
      return res.status(400).json({ error: "Missing required fields", fields: missing });
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert([{
        customer_name,
        phone: phone || null,
        service,
        stylist: stylist || null,
        booking_date,
        start_time,
        amount: amount == null ? null : Number(amount),
        status: "confirmed"
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Could not create booking", detail: error.message });
    }

    // The booking is saved. Everything below is a bonus — if a notification
    // fails, the appointment still exists and the customer still has their
    // slot. That is why this sits AFTER the insert and never throws.
    const notifications = await notifyAll(data);

    return res.status(201).json({ ...data, notifications });
  }

  // ------------------------------------------------------------ anything else
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
