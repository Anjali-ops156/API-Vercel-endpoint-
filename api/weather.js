// api/weather.js
// Session 8 feature — Weather-Based Suggestion (Open-Meteo).
//
//   /api/weather?city=Ludhiana
//
// Open-Meteo needs NO API key and NO sign-up, which is why it is used here
// instead of OpenWeatherMap. Two calls happen on the server:
//   1. Geocoding  — turn "Ludhiana" into latitude/longitude
//   2. Forecast   — get the current temperature, humidity, wind and code
// Then the function turns that into an actual SUGGESTION, which is the
// point of the activity — the raw numbers are not the feature.

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const city = (req.query.city || "Ludhiana").trim();
  if (!city) return res.status(400).json({ error: "city is required" });

  try {
    // ---- 1. City -> coordinates ----------------------------------------
    const geoRes = await fetch(`${GEO}?name=${encodeURIComponent(city)}&count=1`);
    if (!geoRes.ok) {
      return res.status(502).json({ error: "Geocoding service failed", status: geoRes.status });
    }
    const geo = await geoRes.json();
    const place = geo.results?.[0];
    if (!place) {
      return res.status(404).json({ error: `City "${city}" not found` });
    }

    // ---- 2. Coordinates -> current weather ------------------------------
    const url = `${FORECAST}?latitude=${place.latitude}&longitude=${place.longitude}`
      + "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
      + "&timezone=auto";

    const wRes = await fetch(url);
    if (!wRes.ok) {
      return res.status(502).json({ error: "Weather service failed", status: wRes.status });
    }
    const w = await wRes.json();
    const c = w.current;

    const temp = Math.round(c.temperature_2m);
    const humidity = c.relative_humidity_2m;
    const wind = c.wind_speed_10m;
    const condition = describeCode(c.weather_code);
    const wet = isWet(c.weather_code);

    // ---- 3. The actual feature: turn weather into advice -----------------
    return res.status(200).json({
      city: place.name,
      region: place.admin1 || null,
      country: place.country || null,
      observed_at: c.time,
      temperature_c: temp,
      humidity_percent: humidity,
      wind_kmh: wind,
      condition,
      suggestion: {
        drink: suggestDrink(temp, wet),
        service: suggestService(temp, humidity, wet),
        note: ownerNote(temp, humidity, wet)
      }
    });
  } catch (e) {
    return res.status(502).json({ error: "Could not reach the weather service", detail: String(e.message || e) });
  }
}

// --------------------------------------------------------------------------
// WMO weather codes -> plain English.
// Reference: Open-Meteo documents these as standard WMO codes.
function describeCode(code) {
  if (code === 0) return "clear sky";
  if (code <= 3) return "partly cloudy";
  if (code === 45 || code === 48) return "foggy";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code >= 95) return "thunderstorm";
  return "unsettled";
}

function isWet(code) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 86) || code >= 95;
}

// The slide's own example: suggest hot or cold drinks by temperature.
function suggestDrink(temp, wet) {
  if (temp >= 35) return "Cold — nimbu paani or iced tea at the counter";
  if (temp >= 28) return "Cold — chilled water or a soft drink";
  if (temp >= 18) return wet ? "Hot — masala chai" : "Either — chai or chilled water";
  return "Hot — masala chai or coffee";
}

// Adapted to SalonEase: weather changes which service is worth offering.
function suggestService(temp, humidity, wet) {
  if (humidity >= 70 || wet) return "Anti-frizz or smoothening treatment — humidity is high";
  if (temp >= 35) return "Hair spa with a cooling head massage";
  if (temp >= 28) return "Hair wash add-on with styling";
  if (temp >= 15) return "Regular styling — comfortable conditions";
  return "Hot oil treatment and deep conditioning — dry, cold air";
}

// A one-line operational note for the salon owner.
function ownerNote(temp, humidity, wet) {
  if (wet) return "Rain usually means more no-shows. Call today's customers to confirm.";
  if (temp >= 38) return "Very hot. Expect walk-ins to drop in the afternoon; push evening slots.";
  if (temp <= 8) return "Cold morning. Early slots may be thin — offer them a later time.";
  if (humidity >= 75) return "Humid day. Smoothening and anti-frizz services sell well.";
  return "Normal conditions. No change to the day's plan.";
}
