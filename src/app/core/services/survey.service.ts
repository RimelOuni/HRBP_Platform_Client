import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Survey,
  SurveyAnswerResult,
  GamificationProfile,
} from '../models/survey.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private api = `${environment.API_URL}/survey`;

  constructor(private http: HttpClient) {}

  // ─── Admin ────────────────────────────────────────────────────────
  createSurvey(payload: Partial<Survey>): Observable<Survey> {
    return this.http.post<Survey>(this.api, payload);
  }

  getAllSurveys(): Observable<Survey[]> {
    return this.http.get<Survey[]>(`${this.api}/all`);
  }

  updateSurvey(surveyId: string, payload: Partial<Survey>): Observable<Survey> {
    return this.http.patch<Survey>(`${this.api}/${surveyId}`, payload);
  }

  toggleSurvey(surveyId: string): Observable<Survey> {
    return this.http.patch<Survey>(`${this.api}/${surveyId}/toggle`, {});
  }

  deleteSurvey(surveyId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${surveyId}`);
  }

  getSurveyStats(surveyId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/${surveyId}/stats`);
  }

  // ═══ MANAGER ═══════════════════════════════════════════════════════
  
  /** Créer un sondage en tant que manager (auto-limité au practice du manager) */
  createSurveyAsManager(payload: Partial<Survey>): Observable<Survey> {
    return this.http.post<Survey>(`${this.api}/manager`, payload);
  }

  /** Récupérer les sondages du manager */
  getManagerSurveys(): Observable<Survey[]> {
    return this.http.get<Survey[]>(`${this.api}/manager/mine`);
  }

  /** Mettre à jour un sondage du manager (envoyer à plus de monde) */
  updateSurveyAsManager(surveyId: string, payload: Partial<Survey>): Observable<Survey> {
    return this.http.patch<Survey>(`${this.api}/manager/${surveyId}`, payload);
  }

  /** Supprimer un sondage du manager */
  deleteSurveyAsManager(surveyId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/manager/${surveyId}`);
  }

  /** Stats d'un sondage du manager */
  getManagerSurveyStats(surveyId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/manager/${surveyId}/stats`);
  }

  // ─── User ─────────────────────────────────────────────────────────
  getSurveysForUser(): Observable<Survey[]> {
    return this.http.get<Survey[]>(`${this.api}/me`);
  }

  getSurveyCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.api}/me/count`);
  }

  answerSurvey(
    surveyId: string,
    body: { answers: { questionId: string; responseValue: number }[] }
  ): Observable<SurveyAnswerResult> {
    return this.http.post<SurveyAnswerResult>(`${this.api}/${surveyId}/answer`, body);
  }

  completeGoogleSurvey(surveyId: string): Observable<SurveyAnswerResult> {
    return this.http.post<SurveyAnswerResult>(
      `${this.api}/${surveyId}/complete-google`,
      {}
    );
  }

  getMyGamification(): Observable<GamificationProfile> {
    return this.http.get<GamificationProfile>(`${this.api}/me/gamification`);
  }
}