import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';  // ✅ throwError importé ici
import { map, catchError } from 'rxjs/operators';

export interface User {
  _id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface Point {
  _id: string;
  titre: string;
  date: string;
  description?: string;
  collaborateur?: {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  invite?: any[] | any;
  criticite?: string;
  duree_estimee?: string;
  frequence?: string;
  labels?: string[];
  created_by?: User;
  status?: 'En attente' | 'En cours' | 'Terminé' | 'Annulé';
  is_recurring?: boolean;
  parent_point_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
  practice_id?: { _id?: string; name: string } | null;
}

interface ApiRes<T> {
  success: boolean;
  data: T;
}

export interface PointUser {
  _id: string;
  first_name: string;
  last_name: string;
  email?: string;
  photo_url?: string;
  grade?: string;
}

export interface PointRequest {
  _id: string;
 requester?: PointUser;
  requester_type?: 'COLLABORATEUR' | 'MANAGER';
  // Garder pour compatibilité backend si nécessaire
  collaborateur?: PointUser;
  practice_id?: { _id?: string; name: string } | null;
  titre: string;
  commentaire?: string;
  date_souhaitee: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  createdAt?: string;
  updatedAt?: string;
}

export interface Reclamation {
_id: string;
  point_id?: {
    _id: string;
    titre: string;
    status: string;
    date: string;
    criticite?: string;
    description?: string;
    duree_estimee?: string;
  } | null;
  // ✅ CORRECTION: 'collaborateur' devient 'claimant' + ajout 'claimant_type'
  claimant?: PointUser;
  claimant_type?: 'COLLABORATEUR' | 'MANAGER';
  // Garder pour compatibilité
  collaborateur?: PointUser;
  practice_id?: { _id?: string; name: string } | null;
  titre: string;
  commentaire?: string;
  nouvelle_date_proposee?: string | null;
  point_snapshot?: {
    titre?: string;
    date?: string;
    status?: string;
    criticite?: string;
  };
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  reponse_hrbp?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PointService {

  private apiUrl = 'http://localhost:5000/api/points';

  constructor(private http: HttpClient) {}

  // ✅ FIX PRINCIPAL : était 'hrbp_token' → doit être 'authToken' comme partout ailleurs
  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('authToken'); // ✅ corrigé
    return {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // ── HRBP / Admin — Points CRUD ─────────────────────────────────

  getAllPoints(filters?: any): Observable<Point[]> {
    return this.http.get<ApiRes<Point[]>>(this.apiUrl, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  getPointsByHrbp(hrbpId: string): Observable<Point[]> {
    return this.http
      .get<ApiRes<Point[]>>(`${this.apiUrl}/hrbp/${hrbpId}`, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  getPointsByPractice(practiceId: string): Observable<Point[]> {
    return this.http
      .get<ApiRes<Point[]>>(`${this.apiUrl}/practices/${practiceId}/points`, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  getActionsByPoint(pointId: string): Observable<any[]> {
    return this.http
      .get<ApiRes<any[]>>(`${this.apiUrl}/${pointId}/actions`, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  getPointById(id: string): Observable<Point> {
    return this.http.get<ApiRes<Point>>(`${this.apiUrl}/${id}`, this.getAuthHeaders())
      .pipe(map(r => r.data));
  }

  createPoint(point: Partial<Point>): Observable<Point> {
    return this.http.post<ApiRes<Point>>(this.apiUrl, point, this.getAuthHeaders())
      .pipe(map(r => r.data));
  }

  updatePoint(id: string, point: Partial<Point>): Observable<Point> {
    return this.http.put<ApiRes<Point>>(`${this.apiUrl}/${id}`, point, this.getAuthHeaders())
      .pipe(map(r => r.data));
  }

  deletePoint(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, this.getAuthHeaders());
  }

  // ── HRBP — Demandes ────────────────────────────────────────────

  getPracticeRequests(): Observable<PointRequest[]> {
    return this.http
      .get<ApiRes<PointRequest[]>>(`${this.apiUrl}/requests`, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  getRequestById(id: string): Observable<PointRequest> {
    return this.http
      .get<ApiRes<PointRequest>>(`${this.apiUrl}/requests/${id}`, this.getAuthHeaders())
      .pipe(map(r => r.data));
  }

  updateRequestStatus(id: string, status: 'PROCESSED' | 'REJECTED'): Observable<PointRequest> {
    return this.http
      .patch<ApiRes<PointRequest>>(`${this.apiUrl}/requests/${id}`, { status }, this.getAuthHeaders())
      .pipe(map(r => r.data));
  }

  // ── HRBP — Réclamations ────────────────────────────────────────

  getPracticeReclamations(): Observable<Reclamation[]> {
    return this.http
      .get<ApiRes<Reclamation[]>>(`${this.apiUrl}/reclamations`, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  getReclamationById(id: string): Observable<Reclamation> {
    return this.http
      .get<ApiRes<Reclamation>>(`${this.apiUrl}/reclamations/${id}`, this.getAuthHeaders())
      .pipe(map(r => r.data));
  }

  updateReclamation(id: string, body: { status: string; reponse_hrbp?: string }): Observable<Reclamation> {
    return this.http
      .patch<ApiRes<Reclamation>>(`${this.apiUrl}/reclamations/${id}`, body, this.getAuthHeaders())
      .pipe(map(r => r.data));
  }

  // ── Collaborateur ──────────────────────────────────────────────
  getMyPoints(status?: string): Observable<Point[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    
    return this.http
      .get<ApiRes<Point[]>>(`${this.apiUrl}/me`, { ...this.getAuthHeaders(), params })
      .pipe(
        map(r => r.data ?? []),
        catchError((err: any) => {  // ✅ Type explicite pour err
          console.error('Erreur getMyPoints:', err);
          return throwError(() => err);
        })
      );
  }

  getMyRequests(): Observable<PointRequest[]> {
    return this.http
      .get<ApiRes<PointRequest[]>>(`${this.apiUrl}/my-requests`, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  getMyReclamations(): Observable<Reclamation[]> {
    return this.http
      .get<ApiRes<Reclamation[]>>(`${this.apiUrl}/my-reclamations`, this.getAuthHeaders())
      .pipe(map(r => r.data ?? []));
  }

  createPointRequest(
    titre: string,
    commentaire: string,
    date_souhaitee: string,
  ): Observable<PointRequest> {
    return this.http
      .post<ApiRes<PointRequest>>(
        `${this.apiUrl}/request`,
        { titre, commentaire, date_souhaitee },
        this.getAuthHeaders(),
      )
      .pipe(map(r => r.data));
  }

  createReclamation(
    pointId: string,
    titre: string,
    commentaire: string,
    nouvelle_date_proposee?: string | null,
  ): Observable<Reclamation> {
    return this.http
      .post<ApiRes<Reclamation>>(
        `${this.apiUrl}/reclamation`,
        { pointId, titre, commentaire, nouvelle_date_proposee: nouvelle_date_proposee || null },
        this.getAuthHeaders(),
      )
      .pipe(map(r => r.data));
  }

  // ── Satisfaction par point ─────────────────────────────────────

  ratePointSatisfaction(data: { value: number; comment?: string; point_id: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/satisfaction`, data, this.getAuthHeaders());
  }

  getPointSatisfactions(pointIds: string[]): Observable<Record<string, number>> {
    return this.http
      .post<Record<string, number>>(
        `${this.apiUrl}/satisfaction/by-points`,
        { point_ids: pointIds },
        this.getAuthHeaders()
      );
  }

  // ── Mood & Satisfaction bulk ───────────────────────────────────

  getCriticiteForCollabs(ids: string[]): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/criticite/bulk`, { ids }, this.getAuthHeaders());
  }

  getMoodSatForCollabs(ids: string[]): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/moodsat/bulk`, { ids }, this.getAuthHeaders());
  }

  saveMood(data: { mood: string; comment?: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/mood`, data, this.getAuthHeaders());
  }

  saveSatisfaction(data: { value: number; comment?: string; point_id?: string | null }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/satisfaction`, data, this.getAuthHeaders());
  }



  // AJOUTER ces méthodes à la fin de la classe PointService existante
// (ne rien modifier d'autre dans le service)

// ── MANAGER ──────────────────────────────────────────────

getManagerPoints(status?: string): Observable<Point[]> {
  let params = new HttpParams();
  if (status) params = params.set('status', status);
  
  return this.http
    .get<ApiRes<Point[]>>(`${this.apiUrl}/manager/me`, { ...this.getAuthHeaders(), params })
    .pipe(
      map(r => r.data ?? []),
      catchError((err: any) => {
        console.error('Erreur getManagerPoints:', err);
        return throwError(() => err);
      })
    );
}

getManagerRequests(): Observable<PointRequest[]> {
  return this.http
    .get<ApiRes<PointRequest[]>>(`${this.apiUrl}/manager/my-requests`, this.getAuthHeaders())
    .pipe(map(r => r.data ?? []));
}

getManagerReclamations(): Observable<Reclamation[]> {
  return this.http
    .get<ApiRes<Reclamation[]>>(`${this.apiUrl}/manager/my-reclamations`, this.getAuthHeaders())
    .pipe(map(r => r.data ?? []));
}

createManagerPointRequest(
  titre: string,
  commentaire: string,
  date_souhaitee: string,
): Observable<PointRequest> {
  return this.http
    .post<ApiRes<PointRequest>>(
      `${this.apiUrl}/manager/request`,
      { titre, commentaire, date_souhaitee },
      this.getAuthHeaders(),
    )
    .pipe(map(r => r.data));
}

createManagerReclamation(
  pointId: string,
  titre: string,
  commentaire: string,
  nouvelle_date_proposee?: string | null,
): Observable<Reclamation> {
  return this.http
    .post<ApiRes<Reclamation>>(
      `${this.apiUrl}/manager/reclamation`,
      { pointId, titre, commentaire, nouvelle_date_proposee: nouvelle_date_proposee || null },
      this.getAuthHeaders(),
    )
    .pipe(map(r => r.data));
}




}