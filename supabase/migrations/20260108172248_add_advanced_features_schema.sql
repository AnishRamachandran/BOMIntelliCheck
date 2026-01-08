/*
  # Add Advanced Features Schema

  1. New Tables
    - `bom_items` - Individual BOM line items with validation status
      - `id` (uuid, primary key)
      - `check_id` (uuid, foreign key to bom_checks)
      - `part_number` (text)
      - `description` (text)
      - `quantity` (integer)
      - `status` (text: valid, warning, error)
      - `rule_violations` (jsonb)
      - `suggested_corrections` (jsonb)
      - `created_at` (timestamptz)
    
    - `standards_rules` - Validation rules and standards
      - `id` (uuid, primary key)
      - `rule_id` (text, unique)
      - `name` (text)
      - `category` (text: naming, compliance, material)
      - `description` (text)
      - `status` (text: active, deprecated)
      - `examples` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `compliance_history` - Historical compliance data for trends
      - `id` (uuid, primary key)
      - `week_start` (date)
      - `compliance_rate` (numeric)
      - `total_boms` (integer)
      - `compliant_boms` (integer)
      - `items_reviewed` (integer)
      - `created_at` (timestamptz)
    
    - `reports` - Generated reports
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `report_type` (text)
      - `format` (text: pdf, csv, json)
      - `status` (text: pending, processing, completed, failed)
      - `date_range_start` (date)
      - `date_range_end` (date)
      - `file_url` (text)
      - `created_at` (timestamptz)
    
    - `bom_corrections` - Correction history and approval workflow
      - `id` (uuid, primary key)
      - `check_id` (uuid, foreign key to bom_checks)
      - `original_data` (jsonb)
      - `corrected_data` (jsonb)
      - `changes` (jsonb)
      - `status` (text: pending, approved, rejected)
      - `approved_by` (uuid, foreign key to auth.users)
      - `approved_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Create bom_items table
CREATE TABLE IF NOT EXISTS bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid REFERENCES bom_checks(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  description text,
  quantity integer DEFAULT 0,
  status text DEFAULT 'pending',
  rule_violations jsonb DEFAULT '[]'::jsonb,
  suggested_corrections jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bom items"
  ON bom_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bom_checks
      WHERE bom_checks.id = bom_items.check_id
      AND bom_checks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bom items"
  ON bom_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bom_checks
      WHERE bom_checks.id = bom_items.check_id
      AND bom_checks.user_id = auth.uid()
    )
  );

-- Create standards_rules table
CREATE TABLE IF NOT EXISTS standards_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'general',
  description text,
  status text DEFAULT 'active',
  examples jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE standards_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rules"
  ON standards_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert rules"
  ON standards_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update rules"
  ON standards_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create compliance_history table
CREATE TABLE IF NOT EXISTS compliance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  compliance_rate numeric DEFAULT 0,
  total_boms integer DEFAULT 0,
  compliant_boms integer DEFAULT 0,
  items_reviewed integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance history"
  ON compliance_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert compliance history"
  ON compliance_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  format text DEFAULT 'pdf',
  status text DEFAULT 'pending',
  date_range_start date,
  date_range_end date,
  file_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create bom_corrections table
CREATE TABLE IF NOT EXISTS bom_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid REFERENCES bom_checks(id) ON DELETE CASCADE,
  original_data jsonb DEFAULT '{}'::jsonb,
  corrected_data jsonb DEFAULT '{}'::jsonb,
  changes jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bom_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON bom_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bom_checks
      WHERE bom_checks.id = bom_corrections.check_id
      AND bom_checks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own corrections"
  ON bom_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bom_checks
      WHERE bom_checks.id = bom_corrections.check_id
      AND bom_checks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own corrections"
  ON bom_corrections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bom_checks
      WHERE bom_checks.id = bom_corrections.check_id
      AND bom_checks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bom_checks
      WHERE bom_checks.id = bom_corrections.check_id
      AND bom_checks.user_id = auth.uid()
    )
  );

-- Insert sample rules
INSERT INTO standards_rules (rule_id, name, category, description, status, examples) VALUES
  ('101', 'Part Number Formatting', 'naming', 'Ensures all part numbers follow the [TYPE]-[ID]-[REV] format.', 'active', '{"correct": "PCB-10345-02", "incorrect": "PCB10345_rev2"}'::jsonb),
  ('102', 'Material Description Length', 'naming', 'Sets a character limit for material descriptions in the BOM.', 'active', '{"max_length": 100}'::jsonb),
  ('201', 'RoHS Compliance', 'compliance', 'Verifies all electronic components meet RoHS standards.', 'deprecated', '{}'::jsonb),
  ('402', 'Material Specification Mismatch', 'material', 'Ensures specified materials match approved materials for thermal requirements.', 'active', '{"approved": ["Copper C110", "Aluminum 6061"]}'::jsonb),
  ('711', 'Supplier AVL Check', 'compliance', 'Verifies supplier is on the Approved Vendor List (AVL).', 'active', '{}'::jsonb)
ON CONFLICT (rule_id) DO NOTHING;

-- Insert sample compliance history (last 8 weeks)
INSERT INTO compliance_history (week_start, compliance_rate, total_boms, compliant_boms, items_reviewed) VALUES
  (CURRENT_DATE - INTERVAL '56 days', 82.5, 40, 33, 320),
  (CURRENT_DATE - INTERVAL '49 days', 85.3, 42, 36, 335),
  (CURRENT_DATE - INTERVAL '42 days', 79.8, 38, 30, 304),
  (CURRENT_DATE - INTERVAL '35 days', 83.2, 45, 37, 360),
  (CURRENT_DATE - INTERVAL '28 days', 88.5, 50, 44, 400),
  (CURRENT_DATE - INTERVAL '21 days', 76.9, 39, 30, 312),
  (CURRENT_DATE - INTERVAL '14 days', 91.2, 48, 44, 384),
  (CURRENT_DATE - INTERVAL '7 days', 87.6, 52, 46, 416)
ON CONFLICT DO NOTHING;