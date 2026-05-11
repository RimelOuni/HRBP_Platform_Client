// models/practice.model.ts
export interface UserRef {
  _id:        string;
  first_name: string;
  last_name:  string;
  email?:     string;
  role?:      string;
}

export interface Practice {
  _id:          string;
  name:         string;
  description?: string;
  status:       'ACTIVE' | 'INACTIVE';
  creationDate: Date;

  // ✅ Tableau d'HRBPs (plusieurs possibles)
  hrbp?:        UserRef[] | null;
  manager?:     UserRef | null;

  collaborators?:      any[];
  collaboratorsCount:  number;
}