import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://amzwobhsctdgkdyyrwiw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtendvYmhzY3RkZ2tkeXlyd2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzUyNDgsImV4cCI6MjA5NTk1MTI0OH0.-0JNwaynvA0Nu0T5iHW9OPAXpsOM2pi_WP8uJwj-RLo";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);