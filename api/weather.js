// api/weather.js
// Calling a real, KEYED API from the web (the last part of Session 7).
//   /api/weather?city=Ludhiana
//
// The key lives in process.env.WEATHER_API_KEY — it is never sent to the
// browser. The browser calls YOUR endpoint; your endpoint calls OpenWeatherMap.
// That is the whole point of putting a serverless function in the middle.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const city = req.query.city || "Ludhiana";
  const key = process.env.WEATHER_API_KEY;

  if (!key) {
    return res.status(500).json({
      error: "Server is not configured",
      detail: "WEATHER_API_KEY is missing. Add it in Vercel > Settings > Environment Variables, then redeploy."
    });
  }

  const url = "https://api.openweathermap.org/data/2.5/weather"
    + `?q=${encodeURIComponent(city)}&units=metric&appid=${key}`;

  try {
    const r = await fetch(url);

    if (r.status === 404) {
      return res.status(404).json({ error: `City "${city}" not found` });
    }
    if (r.status === 401) {
      return res.status(502).json({ error: "Weather API rejected the key" });
    }
    if (r.status === 429) {
      return res.status(429).json({ error: "Too many requests — free tier rate limit hit" });
    }
    if (!r.ok) {
      return res.status(502).json({ error: "Weather lookup failed", status: r.status });
    }

    const d = await r.json();

    return res.status(200).json({
      city: d.name,
      temp: Math.round(d.main.temp),
      condition: d.weather?.[0]?.description ?? "unknown",
      humidity: d.main.humidity,
      wind: d.wind?.speed ?? null
    });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach the weather service" });
  }
}
