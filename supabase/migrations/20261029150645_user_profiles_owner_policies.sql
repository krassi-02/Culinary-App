/*
# Restrict user profiles to their owner

1. Modified Tables
- `user_profiles`: each row is now owned by the signed-in user whose ID matches the row's `id`.

2. Security
- Row level security stays enabled.
- Signed-in users can read, create, and update only their own profile row. They cannot delete profiles.
- Anonymous visitors have no access to profiles.
- The server no longer reads or writes profiles, so its access is removed.

3. Notes
- Profiles previously saved under the old sign-in provider are no longer linked to any account.
*/

REVOKE SELECT, INSERT, UPDATE ON user_profiles FROM service_role;

GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);
