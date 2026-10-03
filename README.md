# SalonEase API — Session 7 Homework

Vercel serverless functions backed by a Supabase database.

| Endpoint | Method | What it does |
|---|---|---|
| `/api/hello` | GET | Proves the pipeline works — no input, no database |
| `/api/greet?name=Anjali` | GET | Input shapes the response — first query parameter |
| `/api/bookings` | GET | Reads all bookings from Supabase, totals the revenue |
| `/api/bookings` | POST | Writes a new booking and returns the created row |
| `/api/weather?city=Ludhiana` | GET | Calls a real keyed API — key stays on the server |

Opening the deployed site gives you a test page with a button for each one. **That page is what you screenshot for submission.**

---

# Deploy it — 6 steps, about 20 minutes

You need three free accounts: **GitHub**, **Supabase**, **Vercel**. Sign in with GitHub for all three and it is quicker.

---

## Step 1 — Create the Supabase database

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name it `salonease`, pick any region, set a database password (save it somewhere)
3. Wait about a minute for it to finish setting up
4. Open **SQL Editor** → **New query**
5. Paste the whole of [`supabase-setup.sql`](supabase-setup.sql) → **Run**

You should see five booking rows in the result. The table is ready.

## Step 2 — Copy your Supabase keys

In Supabase go to **Project Settings → API** and copy two values:

| Supabase calls it | You need it as |
|---|---|
| Project URL | `SUPABASE_URL` |
| `anon` `public` key | `SUPABASE_ANON_KEY` |

> Copy the **anon public** key, not the `service_role` key. The service_role key bypasses all security rules and must never leave your own machine.

## Step 3 — Make your local env file

In this folder:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your two values in. On Windows without `cp`:

```powershell
Copy-Item .env.local.example .env.local
```

`.env.local` is already in `.gitignore`, so it will never be committed.

## Step 4 — Push to GitHub

```bash
git init
git add .
git commit -m "SalonEase API - Session 7 homework"
```

Then create an empty repo on GitHub called `salonease-api` and:

```bash
git remote add origin https://github.com/<your-username>/salonease-api.git
git branch -M main
git push -u origin main
```

**Now check your repo on GitHub and confirm `.env.local` is NOT there.** The homework asks for this explicitly. If you can see it, you have committed your keys — delete the repo, fix `.gitignore`, and push again.

## Step 5 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your `salonease-api` repo
3. **Before clicking Deploy**, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `SUPABASE_URL` | your project URL |
| `SUPABASE_ANON_KEY` | your anon public key |
| `WEATHER_API_KEY` | your OpenWeatherMap key *(optional)* |

4. Click **Deploy** and wait about a minute

You get a URL like `https://salonease-api.vercel.app`.

> If you deploy first and add the variables after, you must **redeploy** for them to take effect. Vercel only injects environment variables at build time.

## Step 6 — Test and screenshot

Open your Vercel URL. You get the test page. Press the buttons in this order:

1. **`/api/hello`** → `200` with a greeting and the server time
2. **`/api/greet`** → `200` with `Hello, Anjali!`
3. **`/api/bookings` GET** → `200` with your five rows from Supabase ← **screenshot this one**
4. **`/api/bookings` POST** → `201` with the row just created
5. Press GET again → now shows six rows, proving the write reached the database

**For submission:**

```
Endpoint URL: https://<your-project>.vercel.app/api/bookings
Screenshot:   the test page showing the GET response with real booking data
```

A screenshot that shows the **URL bar, the status code and the JSON rows together** is the strongest one. The test page is laid out so all three are visible at once.

---

# Running it locally (optional)

```bash
npm install
npx vercel dev
```

Opens on `http://localhost:3000`. It reads `.env.local` automatically.

---

# If something breaks

| What you see | What it means |
|---|---|
| `500 — Server is not configured` | Environment variables missing in Vercel. Add them, then **redeploy** |
| `500 — Could not read bookings` + *"permission denied"* | The RLS policies in step 1 did not run. Re-run `supabase-setup.sql` |
| Empty array `[]` from GET | Table exists but has no rows — run the `insert` part of the SQL again |
| `404` on `/api/bookings` | The `api/` folder is not at the repo root. On Vercel check **Settings → Root Directory** |
| `401` from `/api/weather` | OpenWeatherMap keys take a few minutes to activate after signup |
| `429` from `/api/weather` | Free tier rate limit — wait a minute |

---

# What to say if you are asked about it

**"Why not call Supabase straight from the browser?"**
Because the key would be in the page, and anyone could open DevTools and copy it. The function keeps the key on the server and validates every request before it reaches the database.

**"What is serverless here?"**
There is no server I started or maintain. Each file in `api/` becomes an endpoint. When a request arrives, Vercel spins up a runtime, runs the function, returns the response and destroys the runtime. I pay nothing while it is idle.

**"What happens if two requests come at once?"**
Each invocation is isolated — that is why the function holds no state in memory. Anything that must persist goes to Supabase.

**"Is this secure?"**
The keys are secure. The *data* is open on purpose for this demo — the RLS policies let the anon key read and insert. A real deployment would require a signed-in user and scope each booking to them.
