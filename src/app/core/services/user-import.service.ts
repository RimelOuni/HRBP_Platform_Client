// services/user-import.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UserImportRow,
  UserImportForm,
  ImportLog,
  ImportResult,
  LogDetails,
} from '../models/user-import.model'

const BASE = 'http://localhost:5000/api/users/import';

@Injectable({ providedIn: 'root' })
export class UserImport {

  constructor(private http: HttpClient) {}

  getUsers(search?: string): Observable<UserImportRow[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<UserImportRow[]>(`${BASE}/list`, { params });
  }

  createUser(form: UserImportForm): Observable<UserImportRow> {
    return this.http.post<UserImportRow>(`${BASE}/user`, form);
  }

  updateUser(id: string, form: Pick<UserImportForm, 'first_name' | 'last_name'>): Observable<UserImportRow> {
    return this.http.put<UserImportRow>(`${BASE}/user/${id}`, form);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${BASE}/user/${id}`);
  }

  importFile(file: File): Observable<ImportResult> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ImportResult>(BASE, fd);
  }

  exportUrl(search?: string): string {
    const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return `${BASE}/export${q}`;
  }

  getLogs(): Observable<ImportLog[]> {
    return this.http.get<ImportLog[]>(`${BASE}/logs`);
  }

  /** Fetch full row-by-row details for a past import log */
  getLogDetails(logId: string): Observable<LogDetails> {
    return this.http.get<LogDetails>(`${BASE}/logs/${logId}/details`);
  }

  deleteLog(logId: string): Observable<{ message: string; deletedCount: number }> {
    return this.http.delete<{ message: string; deletedCount: number }>(`${BASE}/logs/${logId}`);
  }

  logDownloadUrl(logId: string): string {
    return `${BASE}/logs/${logId}/download`;
  }
}
