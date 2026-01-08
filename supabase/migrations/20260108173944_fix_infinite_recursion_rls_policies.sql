/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The RLS policies were querying the profiles table to check if a user is an admin,
  which caused infinite recursion. When checking profiles.role, it would trigger
  another RLS check on profiles, leading to a loop.

  ## Solution
  Instead of querying the profiles table, we check the user's role from the JWT
  token's raw_user_meta_data. The role is stored there during signup and is
  accessible without triggering RLS.

  ## Changes
  1. Drop existing policies that cause recursion
  2. Recreate policies using auth.jwt() to check roles
  3. Ensure no policy queries the table it's protecting when checking permissions

  ## Security
  - Users can only view/update their own profile
  - Admins (identified by JWT metadata) can view all profiles
  - Admin checks use JWT claims instead of table queries
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert reference files" ON reference_files;
DROP POLICY IF EXISTS "Admins can update reference files" ON reference_files;
DROP POLICY IF EXISTS "Admins can delete reference files" ON reference_files;
DROP POLICY IF EXISTS "Admins can view all BoM checks" ON bom_checks;
DROP POLICY IF EXISTS "Admins can view all doc checks" ON doc_checks;
DROP POLICY IF EXISTS "Admins can view all validation issues" ON validation_issues;

-- Recreate admin policies using JWT metadata check (no table recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can insert reference files"
  ON reference_files FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can update reference files"
  ON reference_files FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can delete reference files"
  ON reference_files FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can view all BoM checks"
  ON bom_checks FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can view all doc checks"
  ON doc_checks FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can view all validation issues"
  ON validation_issues FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- Update the handle_new_user function to set role in user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from signup metadata, default to 'user'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    user_role
  );
  
  -- Update the user's raw_user_meta_data to include the role
  -- This makes it accessible in the JWT without querying profiles
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', user_role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
