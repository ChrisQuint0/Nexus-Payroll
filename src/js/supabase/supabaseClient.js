// Access the global supabase object exposed by the CDN
const { createClient } = window.supabase;

// Replace with your actual credentials from Supabase settings
const SUPABASE_URL = "https://gsihnjyewuzyxzdcztge.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaWhuanlld3V6eXh6ZGN6dGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjE2NjEsImV4cCI6MjA3NjQzNzY2MX0.ddqJR0n1qgSH5UIUCXP6q-dzWSMWvgybqiTB7EVDvJs";

// Create a Supabase client
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
