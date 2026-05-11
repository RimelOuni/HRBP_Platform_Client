
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardFilters {
  practiceId?:      string;
  hrbp?:            string;
  grade?:           string;
  month?:           string;
  collaborateurId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private apiUrl = 'http://localhost:5000/api/dashboard';

  constructor(private http: HttpClient) {}

  // ✅ Token envoyé dans chaque requête
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private buildParams(filters?: DashboardFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Mapping des clés pour correspondre au backend
        const keyMapping: Record<string, string> = {
          'practiceId': 'practice',
          'collaborateurId': 'collaborateur'
        };
        
        const backendKey = keyMapping[key] || key;
        params = params.set(backendKey, value);
      }
    });
    return params;
  }

  // 🔹 Dashboard Admin / Direction / Manager
  getDashboard(filters?: DashboardFilters): Observable<any> {
    return this.http.get<any>(this.apiUrl, {
      params:  this.buildParams(filters),
      headers: this.getHeaders()
    });
  }

  // 🔹 Dashboard HRBP
  getDashboardHRBP(filters?: DashboardFilters): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/hrbp`, {
      params:  this.buildParams(filters),
      headers: this.getHeaders()
    });
  }

  // 🔹 Filtres HRBP
  getHRBPFilters(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/hrbp/filters`, {
      headers: this.getHeaders()
    });
  }

  // 🔹 Dashboard Direction
  getDashboardDirection(filters?: DashboardFilters): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/direction`, {
      params:  this.buildParams(filters),
      headers: this.getHeaders()
    });
  }

  // 🔹 Filtres Direction
  getDirectionFilters(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/direction/filters`, {
      headers: this.getHeaders()
    });
  }
}
