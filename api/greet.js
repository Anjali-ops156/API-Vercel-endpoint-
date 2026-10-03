// api/greet.js
// Step 2 — input shapes the response. Your first query parameter.
// Try:  /api/greet?name=Anjali   ->  { "message": "Hello, Anjali!" }

export default function handler(req, res) {
  const name = req.query.name || "there";
  res.status(200).json({ message: `Hello, ${name}!` });
}
