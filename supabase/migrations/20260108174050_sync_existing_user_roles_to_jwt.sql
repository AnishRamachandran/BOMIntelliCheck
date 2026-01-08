/*
  # Sync Existing User Roles to JWT Metadata

  ## Overview
  Updates existing users' raw_user_meta_data to include their role from the profiles table.
  This ensures that the role is accessible in the JWT token without querying the profiles table.

  ## Why This Is Needed
  - Existing users were created before we added role to JWT metadata
  - RLS policies now check role from JWT instead of profiles table
  - This migration ensures all existing users have their role in JWT

  ## Security
  - Only updates metadata for users who have a profile
  - Preserves existing metadata while adding role
*/

-- Update existing users' metadata to include their role
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN
    SELECT p.id, p.role, p.full_name
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
  LOOP
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', profile_record.role,
        'full_name', profile_record.full_name
      )
    WHERE id = profile_record.id;
  END LOOP;
END $$;
