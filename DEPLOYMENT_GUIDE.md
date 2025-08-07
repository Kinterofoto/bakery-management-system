# Deployment Guide for Vercel

## Environment Variables Setup

### Required Variables for Production:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: `https://khwcknapjnhpxfodsahb.supabase.co`
   - Environment: Production, Preview, Development

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod2NrbmFwam5ocHhmb2RzYWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MzE5ODcsImV4cCI6MjA2ODEwNzk4N30.R7SzlFP9jpmkS0mN37C8I0C_t3fatuFD23SimnO9RIA`
   - Environment: Production, Preview, Development

### Steps to Configure in Vercel:

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the exact values above
4. Make sure to select all environments (Production, Preview, Development)
5. Do NOT add quotes around the values
6. Ensure no extra spaces before or after the values
7. Click "Save"
8. Redeploy your application

### Troubleshooting:

If you see errors about malformed URLs:
1. Check for extra characters in environment variables
2. Verify the URL starts with `https://` and ends with `.supabase.co`
3. Ensure the ANON_KEY is the complete JWT token
4. Check browser console for detailed error messages

### Verification:

After deployment, you can verify the configuration is working by:
1. Opening browser developer tools
2. Going to the Console tab
3. Looking for the debug logs showing correct URL and key lengths