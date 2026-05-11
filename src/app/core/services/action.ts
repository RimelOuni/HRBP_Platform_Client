// src/app/components/points/action.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  _id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface Action {
  _id?: string;
  point_id: string;
  action: string;
  description?: string;
  status: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  created_by?: User;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActionService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('hrbp_token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  // Get all actions for a point
  getActionsByPoint(pointId: string): Observable<Action[]> {
    return this.http.get<Action[]>(
      `${this.apiUrl}/points/${pointId}/actions`,
      this.getAuthHeaders()
    );
  }

  // Get single action
  getActionById(actionId: string): Observable<Action> {
    return this.http.get<Action>(
      `${this.apiUrl}/actions/${actionId}`,
      this.getAuthHeaders()
    );
  }

  // Create action
  createAction(action: Action): Observable<Action> {
    return this.http.post<Action>(
      `${this.apiUrl}/actions`,
      action,
      this.getAuthHeaders()
    );
  }

  // Update action
  updateAction(actionId: string, action: Partial<Action>): Observable<Action> {
    return this.http.put<Action>(
      `${this.apiUrl}/actions/${actionId}`,
      action,
      this.getAuthHeaders()
    );
  }

  // Delete action
  deleteAction(actionId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/actions/${actionId}`,
      this.getAuthHeaders()
    );
  }
}
