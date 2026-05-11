import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Practice, UserRef } from '../models/practice.model';
import { environment } from '../../../environments/environment';

interface CollaboratorsResponse {
  practiceId:         string;
  practiceName:       string;
  hrbpList:           UserRef[];
  totalCollaborators: number;
  collaborators:      any[];
}

// ✅ managers inclus
interface HrbpCollaboratorsResponse {
  practiceId:         string;
  practiceName:       string;
  hrbpId:             string;
  hrbpName:           string;
  hrbpEmail:          string;
  totalCollaborators: number;
  collaborators:      any[];
  totalManagers:      number;
  managers:           any[];
}

interface ManagersResponse {
  practiceId:    string;
  practiceName:  string;
  hrbpList:      UserRef[];
  totalManagers: number;
  managers:      any[];
}

type PracticeInput = Omit<Partial<Practice>, 'hrbp' | 'manager'> & {
  hrbp?:    string[] | null;
  manager?: string | null;
};

@Injectable({ providedIn: 'root' })
export class PracticeService {
  private apiUrl = `${environment.API_URL}/practices`;

  constructor(private http: HttpClient) {}

  getAllPractices(): Observable<Practice[]> {
    return this.http.get<Practice[]>(this.apiUrl);
  }

  getPracticeById(id: string): Observable<Practice> {
    return this.http.get<Practice>(`${this.apiUrl}/${id}`);
  }

  createPractice(practice: PracticeInput): Observable<Practice> {
    return this.http.post<Practice>(this.apiUrl, practice);
  }

  updatePractice(id: string, practice: PracticeInput): Observable<Practice> {
    return this.http.put<Practice>(`${this.apiUrl}/${id}`, practice);
  }

  deletePractice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getCollaboratorsByPractice(practiceId: string, hrbpId?: string): Observable<CollaboratorsResponse> {
    let url = `${this.apiUrl}/${practiceId}/collaborators`;
    if (hrbpId) url += `?hrbpId=${hrbpId}`;
    return this.http.get<CollaboratorsResponse>(url);
  }

  getCollaboratorsByPracticeAndHrbp(practiceId: string, hrbpId: string): Observable<HrbpCollaboratorsResponse> {
    return this.http.get<HrbpCollaboratorsResponse>(
      `${this.apiUrl}/${practiceId}/hrbp/${hrbpId}`
    );
  }

  addCollaboratorsToHrbp(practiceId: string, hrbpId: string, collaboratorIds: string[]): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${practiceId}/hrbp/${hrbpId}/collaborators`,
      { collaboratorIds }
    );
  }

  removeCollaboratorsFromHrbp(practiceId: string, hrbpId: string, collaboratorIds: string[]): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${practiceId}/hrbp/${hrbpId}/collaborators`,
      { body: { collaboratorIds } }
    );
  }

  // ✅ ro_id null = non assigné à aucun HRBP
  getManagersByPractice(practiceId: string): Observable<ManagersResponse> {
    return this.http.get<ManagersResponse>(`${this.apiUrl}/${practiceId}/managers`);
  }

  addManagersToHrbp(practiceId: string, hrbpId: string, managerIds: string[]): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${practiceId}/hrbp/${hrbpId}/managers`,
      { managerIds }
    );
  }

  removeManagersFromHrbp(practiceId: string, hrbpId: string, managerIds: string[]): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/${practiceId}/hrbp/${hrbpId}/managers`,
      { body: { managerIds } }
    );
  }

  getUsersByRole(role: 'HRBP' | 'MANAGER'): Observable<UserRef[]> {
    return this.http.get<UserRef[]>(`${this.apiUrl}/users`, {
      params: { role },
    });
  }
}