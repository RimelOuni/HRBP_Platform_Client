export enum UserRole {
  ADMIN_RH = 'ADMIN_RH',
  HRBP = 'HRBP',
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
  DIRECTION_RH = 'DIRECTION_RH'
}

export enum Grade {
  GRADUATE = 'GRADUATE',
  JUNIOR = 'JUNIOR',
  CONFIRMED = 'CONFIRMED',
  SENIOR = 'SENIOR',
  MANAGER = 'MANAGER',
  SENIOR_MANAGER = 'SENIOR_MANAGER',
  DIRECTOR = 'DIRECTOR',
  EXPERT = 'EXPERT'
}
export type AssignmentType = 'AFFECTE' | 'INTERCONTRAT' | null;


export interface Practice {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProjectRef {
  _id: string;
  name: string;
  status?: string;
}


export interface UserReference {
  _id: string;
  first_name: string;
  last_name: string;
  email?: string;
  photo_url?: string;
}

export interface User {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  photo_url?: string;
  identifiant: string;
  date_entree: Date;
  role: UserRole;
  grade: Grade;
  ro_id?: string | UserReference;
  cc_id?: string | UserReference;
  practice_id?: Practice | Practice[];
  project_id?: string | ProjectRef | null;      // ← NEW
  assignment_type?: AssignmentType;  
  is_active: boolean;
  last_login?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
}
// ============================
// ROLES
// ============================
export interface Rhbp extends User {
  practice_id?: Practice | Practice[] | undefined;
}

export interface Manager extends User {
  practice_id?: Practice | Practice[] | undefined;
}

export interface Collaborator extends User {
  role: UserRole.COLLABORATOR | UserRole.MANAGER;
}

export interface MoodEntry {
  mood: "Content" | "Moyen" | "Démotivé";
  comment?: string;
  date?: string; // ou Date si tu préfères
}

export interface SatisfactionEntry {
  _id?: string;
  collaborateur: string;
  value: number;
  comment?: string;
  date?: string; 
  createdAt?: string;
}

// ============================
// CRITICITE
// ============================
export interface CriticiteCount {
  Haute: number;
  Moyenne: number;
  Basse: number;
  total: number;
}

export interface Collaborator extends User {
  role: UserRole.COLLABORATOR | UserRole.MANAGER;
  satisfactionHistory?: SatisfactionEntry[]; // ✅ cette ligne doit être présente
}