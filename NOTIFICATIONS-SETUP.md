# Notification setup — Features 01 and 02

Both notifications fire when a booking is created through `POST /api/bookings`.
Neither one can break a booking: if a message fails, the appointment is already
saved and the response simply reports which channel did not go out.

Test either of them without creating a booking:

```
https://<your-project>.vercel.app/api/notify-test
```

---

# Feature 01 — WhatsApp (CallMeBot)

**No account. No credit card. About 2 minutes.**

### Step 1 — Save the bot's number

Add this number to your phone contacts, under any name you like:

```
+34 694 242 562
```

### Step 2 — Message it on WhatsApp

Open WhatsApp, find that contact, and send **exactly** this text:

```
I allow callmebot to send me messages
```

### Step 3 — Wait for your key

Within about two minutes the bot replies with your **API key** — a number
like `123456`. Keep that chat open, you will need the key in a moment.

> If no reply comes, check the number was saved correctly and that you sent
> the sentence exactly as written above.

### Step 4 — Add two variables in Vercel

Go to your Vercel project → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `WHATSAPP_PHONE` | Your own WhatsApp number with country code, **no `+`, no spaces** — e.g. `919876543210` |
| `WHATSAPP_APIKEY` | The key the bot sent you |

### Step 5 — Redeploy

**Deployments → the latest one → ⋯ → Redeploy.** Environment variables are
only injected at build time, so a redeploy is required.

### Step 6 — Test

Open `/api/notify-test`. You should see:

```json
"whatsapp": { "sent": true, ... }
```

and your phone should buzz.

---

# Feature 02 — Email (EmailJS)

**Free account needed. About 5 minutes.**

### Step 1 — Create an account

Sign up at [emailjs.com](https://www.emailjs.com) (free tier: 200 emails/month).

### Step 2 — Add an email service

**Email Services → Add New Service → Gmail** (or whichever you use) → connect
your account. Copy the **Service ID** — it looks like `service_abc1234`.

### Step 3 — Create a template

**Email Templates → Create New Template.**

In the template body, use these variables — they must match exactly what the
code sends:

```
Subject:  {{subject}}

{{message}}

Customer: {{customer_name}}
Phone:    {{phone}}
Service:  {{service}}
Stylist:  {{stylist}}
When:     {{booking_date}} at {{start_time}}
Amount:   Rs {{amount}}
```

Set the **To Email** field to your own email address. Save, then copy the
**Template ID** — like `template_xyz5678`.

### Step 4 — Copy your keys

**Account → General**. Copy the **Public Key**, and the **Private Key** from
**Account → Security**.

### Step 5 — Allow non-browser API calls

**Account → Security →** turn on **"Allow EmailJS API for non-browser
applications"**.

> This step is easy to miss. Without it EmailJS rejects the call with
> *"API calls are disabled for non-browser applications"* — your serverless
> function is not a browser. `/api/notify-test` will show that exact message
> in `hints` if it happens.

### Step 6 — Add four variables in Vercel

| Name | Where it comes from |
|---|---|
| `EMAILJS_SERVICE_ID` | Step 2 |
| `EMAILJS_TEMPLATE_ID` | Step 3 |
| `EMAILJS_PUBLIC_KEY` | Account → General |
| `EMAILJS_PRIVATE_KEY` | Account → Security |

### Step 7 — Redeploy, then test

Open `/api/notify-test`. You want:

```json
"email": { "sent": true, "detail": "OK" }
```

---

# What the booking response looks like now

`POST /api/bookings` returns the created row **plus** a notification report:

```json
{
  "id": 6,
  "customer_name": "Priya Sharma",
  "service": "Facial",
  "booking_date": "2026-10-04",
  "start_time": "12:30:00",
  "notifications": {
    "whatsapp": { "sent": true,  "detail": "Message queued" },
    "email":    { "sent": true,  "detail": "OK" }
  }
}
```

If a channel is not set up yet it reports `"sent": false, "reason": "not_configured"`
and the booking still returns `201`. That is the design working correctly, not a bug.

---

# Troubleshooting

| What you see | What it means |
|---|---|
| `"reason": "not_configured"` | Variables missing in Vercel, or you did not redeploy after adding them |
| `"reason": "callmebot_203"` | The CallMeBot key or phone number is wrong. Check for a stray `+` or space in `WHATSAPP_PHONE` |
| `"reason": "emailjs_403"` | Step 5 above — non-browser API calls are still disabled |
| `"reason": "emailjs_400"` | A template variable name does not match. Compare your template with Step 3 |
| `"reason": "timed_out"` | The service took over 9 seconds. Try again — the booking was still saved |

---

# What to say about it

**"Why send the notification after the insert and not before?"**
Because the booking is the thing that must not be lost. If I sent the message
first and the database write then failed, the owner would be told about an
appointment that does not exist. Saving first means the worst case is a real
booking with no message — which I can resend from the response, since it tells
me exactly which channel failed.

**"What if WhatsApp is down?"**
The booking still returns `201`. The response carries
`notifications.whatsapp.sent: false` with a reason, so the failure is visible
rather than silent. In the full SalonEase design this is the `notifications`
table with a resend button in the admin panel.
