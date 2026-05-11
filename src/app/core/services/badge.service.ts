import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EarnedBadge {
  _id: string;
  userId: string;
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  surveysRequired: number;
  surveysAnsweredAtEarn: number;
  pointsAtEarn: number;
  earnedAt: string | Date;
  practiceId?: { _id: string; name: string } | null;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  surveysRequired: number;
}

@Injectable({ providedIn: 'root' })
export class BadgeService {
  private api = `${environment.API_URL}/badges`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getMyBadges(): Observable<EarnedBadge[]> {
    return this.http.get<EarnedBadge[]>(`${this.api}/me`, {
      headers: this.getHeaders()
    });
  }

  getBadgeDefinitions(): Observable<BadgeDefinition[]> {
    return this.http.get<BadgeDefinition[]>(`${this.api}/definitions`);
  }

  getAllBadges(): Observable<EarnedBadge[]> {
    return this.http.get<EarnedBadge[]>(`${this.api}`, {
      headers: this.getHeaders()
    });
  }
}