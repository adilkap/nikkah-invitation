// ------------------------------------------------------------
//  Public Supabase config.
//  These two values are SAFE to commit and ship in the browser —
//  the anon key is meant to be public. All real security is
//  enforced by Row Level Security + the token-scoped RPCs
//  (see supabase/schema.sql).
//
//  Fill these in from: Supabase dashboard → Settings → API
// ------------------------------------------------------------
export const SUPABASE_URL      = 'https://YOUR-PROJECT-ref.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

// The email allowed to use the admin dashboard. Must match the
// address used in supabase/schema.sql's RLS policy.
export const ADMIN_EMAIL = 'adilkapadia0@gmail.com';
