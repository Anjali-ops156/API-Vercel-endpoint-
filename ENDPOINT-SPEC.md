# Endpoint Spec — Class Activity (Session 7)

**Product:** SalonEase — salon appointment & management system
**Student:** Anjali
**Date:** Session 7

The class activity asks for three things. Here they are for the endpoint I chose to build.

---

## 1. Endpoint + method

```
GET   /api/bookings     — read all bookings, with the day's total revenue
POST  /api/bookings     — create a new booking
```

One path, two methods. The function checks `req.method` and branches.

**Why this endpoint:** it is the one SalonEase cannot work without. The booking wizard, the staff schedule and the admin dashboard all read from it, and the booking form writes to it. Every other screen is secondary.

---

## 2. Input and output

### GET /api/bookings

| | |
|---|---|
| **Input** | Optional query parameter `?date=YYYY-MM-DD` to filter to one day |
| **Output** | `200 OK` with JSON |

```json
{
  "count": 5,
  "total_amount": 11550.00,
  "bookings": [
    {
      "id": 1,
      "customer_name": "Simran Kaur",
      "phone": "9876500011",
      "service": "Haircut",
      "stylist": "Ravi",
      "booking_date": "2026-10-03",
      "start_time": "11:00:00",
      "amount": 300.00,
      "status": "confirmed",
      "created_at": "2026-10-03T06:12:41.221Z"
    }
  ]
}
```

### POST /api/bookings

| | |
|---|---|
| **Input** | JSON body |
| **Required** | `customer_name`, `service`, `booking_date`, `start_time` |
| **Optional** | `phone`, `stylist`, `amount` |
| **Output** | `201 Created` with the row that was inserted |

```json
{
  "customer_name": "Priya Sharma",
  "phone": "9876500022",
  "service": "Facial",
  "stylist": "Neha",
  "booking_date": "2026-10-04",
  "start_time": "12:30",
  "amount": 900
}
```

### Status codes

| Code | When |
|---|---|
| `200` | GET succeeded |
| `201` | POST created the booking |
| `400` | A required field is missing — the response names which ones |
| `405` | Any method other than GET or POST |
| `500` | Database error, or environment variables not configured |

---

## 3. Database + keys

### Table — `bookings` (Supabase / PostgreSQL)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | primary key |
| `customer_name` | text | not null |
| `phone` | text | |
| `service` | text | not null |
| `stylist` | text | |
| `booking_date` | date | not null |
| `start_time` | time | not null |
| `amount` | numeric(10,2) | |
| `status` | text | default `confirmed` |
| `created_at` | timestamptz | default `now()` |

Index on `(booking_date, start_time)` — that is what the "bookings for one day" query sorts and filters on.

### Keys

| Variable | Used by | Stored where |
|---|---|---|
| `SUPABASE_URL` | `/api/bookings` | `.env.local` locally, Vercel environment variables in production |
| `SUPABASE_ANON_KEY` | `/api/bookings` | same |
| `WEATHER_API_KEY` | `/api/weather` | same |

**Never in the code, never in GitHub.** `.env.local` is listed in `.gitignore`.

### External services

`/api/bookings` uses no external service beyond Supabase.
`/api/weather` calls **OpenWeatherMap** — a keyed API, included to show the pattern from the slides.

---

## Why the API sits in the middle

```
Browser  →  /api/bookings  →  Supabase
```

The browser never holds the database key and never talks to Supabase directly. If it did, anyone could open DevTools, copy the key and read or write the whole table. Putting a serverless function in between means the key stays on the server and every request can be validated before it reaches the database.

That is the same reason `/api/weather` exists rather than calling OpenWeatherMap from the page — one pattern, used twice.
