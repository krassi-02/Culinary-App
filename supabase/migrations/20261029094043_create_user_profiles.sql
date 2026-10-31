/*
# Create user_profiles table

1. New Tables
- `user_profiles`: one row per signed-in user, keyed by their sign-in ID.
  - `id` (text, primary key): the signed-in user's ID.
  - `data` (jsonb, not null): the profile contents (name, macro targets, preferences).
  - `created_at` (timestamptz): when the profile was first created.
  - `updated_at` (timestamptz): when the profile was last changed.

2. Security
- Row level security is enabled, with no policies for the public or signed-in client roles, so the browser cannot read or write profiles directly.
- Only the server (service role) is granted access. The server checks each sign-in token before touching a profile.

3. Notes
- This table replaces the profile storage that previously lived in the Firestore database.
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON user_profiles TO service_role;
