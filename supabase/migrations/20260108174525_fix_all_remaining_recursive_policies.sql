/*
  # Fix All Remaining Recursive RLS Policies

  ## Problem
  Some policies still query the profiles table to check admin status, causing
  infinite recursion errors. This affects:
  - Storage policies for reference-files bucket
  - Table policies for standards_rules table

  ## Solution
  Update all remaining policies to use JWT metadata instead of querying profiles table

  ## Changes
  1. Drop and recreate storage policies for reference-files bucket
  2. Drop and recreate table policies for standards_rules table
  3. All admin checks now use auth.jwt()->'role' instead of profiles table queries

  ## Security
  - Maintains same security level as before
  - Eliminates infinite recursion by avoiding table queries in policies
*/

-- Fix storage policies for reference-files bucket
DROP POLICY IF EXISTS "Admins can upload reference files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete reference files" ON storage.objects;

CREATE POLICY "Admins can upload reference files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reference-files' AND
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can delete reference files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reference-files' AND
    (auth.jwt()->>'role')::text = 'admin'
  );

-- Fix standards_rules table policies
DROP POLICY IF EXISTS "Only admins can insert rules" ON standards_rules;
DROP POLICY IF EXISTS "Only admins can update rules" ON standards_rules;

CREATE POLICY "Only admins can insert rules"
  ON standards_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Only admins can update rules"
  ON standards_rules FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );
