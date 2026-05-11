import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Alerte {
  _id?: string;
  titre: string;
  description?: string;
  type: string;
  statut: 'En attente' | 'Envoyée' | 'Lue' | 'Traitée';
  date: string;
  created_by?: any;
  destination_label?: string;
  destination_user_id?: string | any;
  managerNote?: string;
  keyPoints?: string[];
  point_id?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  // ✅ FIXED: Full URL with backend port (like ActionService)
  private apiUrl = 'http://localhost:5000/api/alerts';

  constructor(private http: HttpClient) {}

  // ✅ FIXED: Add Bearer token (required by authMiddleware)
  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('hrbp_token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  getAlertsByManager(managerId: string): Observable<Alerte[]> {
    return this.http.get<Alerte[]>(
      `${this.apiUrl}/manager/${managerId}`,
      this.getAuthHeaders()  // ✅ Send auth token
    );
  }

  getAlertsByPoint(pointId: string): Observable<Alerte[]> {
    return this.http.get<Alerte[]>(
      `${this.apiUrl}/point/${pointId}`,
      this.getAuthHeaders()
    );
  }

  createAlert(data: Partial<Alerte>): Observable<Alerte> {
    return this.http.post<Alerte>(
      this.apiUrl,
      data,
      this.getAuthHeaders()
    );
  }

  updateAlert(id: string, data: Partial<Alerte>): Observable<Alerte> {
    return this.http.put<Alerte>(
      `${this.apiUrl}/${id}`,
      data,
      this.getAuthHeaders()
    );
  }

  deleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      this.getAuthHeaders()
    );
  }
}
