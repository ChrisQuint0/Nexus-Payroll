// adminClient.js
// Access the global supabase object exposed by the CDN
const { createClient } = window.supabase;

const SUPABASE_URL = "https://gsihnjyewuzyxzdcztge.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaWhuanlld3V6eXh6ZGN6dGdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg2MTY2MSwiZXhwIjoyMDc2NDM3NjYxfQ.V5OYaeImilPySELjfu_hGFov2iaapHOMJlvpkZaQYF8";

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);
