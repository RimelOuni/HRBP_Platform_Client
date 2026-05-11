import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Collaborator } from '../models/user.model';
import { environment } from '../../../environments/environment';

export interface UpdateProfileResponse {
  message: string;
  user: Collaborator;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl      = `${environment.API_URL}/user`;
  private apiUrladmin = `${environment.API_URL}/admin`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getCurrentUser(): Observable<Collaborator> {
    return this.http.get<Collaborator>(`${this.apiUrl}/me`, {
      headers: this.getHeaders()
    });
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  getAllCollaborators(): Observable<Collaborator[]> {
    return this.http.get<Collaborator[]>(`${this.apiUrl}/collaborators`, {
      headers: this.getHeaders()
    });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  getCollaboratorsOfHrbp(hrbpId: string): Observable<Collaborator[]> {
    return this.http.get<Collaborator[]>(
      `${this.apiUrl}/hrbp/${hrbpId}/collaborators`,
      { headers: this.getHeaders() }
    );
  }

  getAllUsersadmin(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrladmin}/users`);
  }

  getUserByIdadmin(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  toggleUserStatus(userId: string): Observable<any> {
    return this.http.patch(`${this.apiUrladmin}/status/${userId}/toggle-status`, {});
  }

  updateUser(userId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrladmin}/editUser/${userId}`, data);
  }

  createUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrladmin}/userAdd`, data);
  }

  updateSelfProfile(data: { phone?: string; photo_url?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/me`, data);
  }

  getUsersByRole(role: string, practiceId?: string | null): Observable<any[]> {
    let params = new HttpParams().set('role', role);
    if (practiceId) params = params.set('practice', practiceId);
    return this.http.get<any[]>(`${environment.API_URL}/user/by-role`, { params });
  }

  getCriticiteForCollabs(ids: string[]): Observable<any> {
    return this.http.post<any>(
      `${environment.API_URL}/points/criticite/bulk`,
      { ids },
      { headers: this.getHeaders() }
    );
  }

  getMoodSatForCollabs(ids: string[]): Observable<any> {
    return this.http.post<any>(
      `${environment.API_URL}/points/moodsat/bulk`,
      { ids },
      { headers: this.getHeaders() }
    );
  }

  // ✅ Enregistrer un mood
  updateMood(data: { mood: string; comment?: string }): Observable<any> {
    return this.http.post<any>(
      `${environment.API_URL}/points/mood`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // ✅ Enregistrer une satisfaction — avec point_id optionnel
  updateSatisfaction(data: { value: number; comment?: string; point_id?: string | null }): Observable<any> {
    return this.http.post<any>(
      `${environment.API_URL}/points/satisfaction`,
      data,
      { headers: this.getHeaders() }
    );
  }

 getUsersByPractice(practiceId: string): Observable<Collaborator[]> {
  // ✅ this.apiUrl = .../user  →  .../user/practice/:id
  return this.http.get<Collaborator[]>(`${this.apiUrl}/practice/${practiceId}`, {
    headers: this.getHeaders()
  });
}

  getPractices(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.API_URL}/practices`, {
      headers: this.getHeaders()
    });
  }

  getLastMoodAndSatisfaction(): Observable<any> {
    return this.http.get<any>(`${environment.API_URL}/user/me/moodsat`, {
      headers: this.getHeaders()
    });
  }
}