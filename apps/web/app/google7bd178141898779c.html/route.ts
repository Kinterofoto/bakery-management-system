export function GET() {
  return new Response(
    "google-site-verification: google7bd178141898779c.html",
    { headers: { "Content-Type": "text/html" } }
  )
}
