import { createClient } from "@supabase/supabase-js";
// import { readFileSync } from "node:fs";

// Set these in your terminal before running this script.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.TARGET_USER_ID;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USER_ID) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and TARGET_USER_ID."
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.admin.updateUserById(
  USER_ID,
  {
    app_metadata: { role: "admin" },
  }
);

if (error) {
  console.error("Could not promote user:", error.message);
  process.exitCode = 1;
} else {
  console.log("Updated account:", data.user.id);
  console.log("App metadata:", data.user.app_metadata);
}