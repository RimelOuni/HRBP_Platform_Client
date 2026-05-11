// models/user-import.model.ts

export interface UserImportRow {
  _id: string;
  first_name: string;
  last_name: string;
  identifiant: string;
  is_active: boolean;
  date_entree: string | Date;
  createdAt: string | Date;
}

export interface UserImportForm {
  first_name: string;
  last_name: string;
  identifiant: string;
}

export interface ImportLog {
  _id: string;
  filename: string;
  stored_as: string;
  uploaded_by: string | null;
  user_ids: string[];
  identifiants: string[];
  count: number;
  skipped: number;
  errors: number;
  createdAt: string | Date;
}

export interface ImportResult {
  log_id: string;
  message: string;
  created: { _id: string; identifiant: string }[];
  skipped: string[];
  errors:  { identifiant?: string; row?: any; reason: string }[];
}

export interface LogDetailRow {
  first_name:  string;
  last_name:   string;
  identifiant: string;
  status:      'created' | 'skipped' | 'error';
  reason:      string;
}

export interface LogDetails {
  log_id:   string;
  filename: string;
  date:     string | Date;
  total:    number;
  created:  number;
  skipped:  number;
  errors:   number;
  rows:     LogDetailRow[];
}
