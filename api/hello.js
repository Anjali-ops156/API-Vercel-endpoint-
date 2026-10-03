// api/hello.js
// Step 1 — proves the pipeline works. No input, no database.
// Vercel maps this file to the endpoint  /api/hello

export default function handler(req, res) {
  res.status(200).json({
    message: "Hello from the SalonEase API!",
    time: new Date().toISOString()
  });
}
