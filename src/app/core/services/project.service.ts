import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project } from '../models/project.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private base = `${environment.API_URL}/practices`;

  getProjectsByPractice(practiceId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.base}/${practiceId}/projects`);
  }

  getProjectById(practiceId: string, projectId: string): Observable<Project> {
    return this.http.get<Project>(`${this.base}/${practiceId}/projects/${projectId}`);
  }

  createProject(practiceId: string, payload: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.base}/${practiceId}/projects`, payload);
  }

  updateProject(practiceId: string, projectId: string, payload: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.base}/${practiceId}/projects/${projectId}`, payload);
  }

  deleteProject(practiceId: string, projectId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${practiceId}/projects/${projectId}`);
  }
}
