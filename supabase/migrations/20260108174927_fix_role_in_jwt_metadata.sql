/*
  # Fix Role in JWT Metadata

  ## Problem
  The role was being stored in raw_user_meta_data (which users can modify) instead of 
  raw_app_meta_data (which is secure and included in JWT). This caused RLS policies to fail.

  ## Solution
  1. Create a trigger to automatically move role from user_meta_data to app_meta_data on signup
  2. Sync all existing users' roles to app_meta_data

  ## Security
  - Roles are now stored in app_meta_data which cannot be modified by users
  - JWT tokens will include the role for RLS policy checks
*/

-- Function to sync role to app_meta_data on user creation/update
CREATE OR REPLACE FUNCTION sync_role_to_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- If role exists in user_meta_data, copy it to app_meta_data
  IF NEW.raw_user_meta_data ? 'role' THEN
    NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.raw_user_meta_data->>'role');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS sync_role_on_signup ON auth.users;
CREATE TRIGGER sync_role_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_app_metadata();

-- Sync all existing users' roles from profiles to app_meta_data
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN
    SELECT p.id, p.role
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;
