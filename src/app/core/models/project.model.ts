export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'ON_HOLD' | 'COMPLETED';

export interface ProjectUser {
  _id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  practice_id: string;
  manager?: ProjectUser | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  creationDate?: Date | string;
}
