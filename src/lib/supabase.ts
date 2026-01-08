import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface BomCheck {
  id: string;
  user_id: string;
  file_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  issues_found: number;
  issues_corrected: number;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface DocCheck {
  id: string;
  user_id: string;
  file_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  issues_found: string; // JSON string
  corrections_made: string; // JSON string
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface StandardRule {
  id: string;
  rule_id: string;
  name: string;
  category: string;
  description: string;
  status: 'active' | 'deprecated' | 'draft';
  examples: {
    correct?: string;
    incorrect?: string;
    max_length?: number;
    approved?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface ComplianceHistory {
  id: string;
  week_start: string;
  compliance_rate: number;
  created_at: string;
}
