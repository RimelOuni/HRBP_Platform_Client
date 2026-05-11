// detail-collaborator.component.ts
import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Collaborator, UserRole } from '../../../core/models/user.model';
import { Point, PointService } from '../../../core/services/point';
import { UserService } from '../../../core/services/user.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SatisfactionEntry {
  value: number;
  comment?: string;
  date?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-collaborator-detail',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './detail-collaborator.html',
  styleUrls: ['./detail-collaborator.css']
})
export class DetailCollaborator implements OnInit {

  @Input() collaborator!: Collaborator;
  @Output() closeModal = new EventEmitter<void>();

  points: Point[] = [];
  loadingPoints = false;

  // ✅ Satisfaction chargée depuis l'API
  lastSatisfactionData: SatisfactionEntry | null = null;
  loadingSatisfaction = false;

  private pointService = inject(PointService);
  private userService  = inject(UserService);

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    if (!this.collaborator?._id) return;

    this.loadingPoints      = true;
    this.loadingSatisfaction = true;

    // ✅ Chargement en parallèle : satisfaction + points
    forkJoin({
      moodSat: this.userService.getMoodSatForCollabs([this.collaborator._id]).pipe(
        catchError(() => of({}))
      ),
      points: this.pointService.getAllPoints().pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ moodSat, points }) => {
        // ── Satisfaction ──────────────────────────────────────
        const entry = moodSat?.[this.collaborator._id];
        if (entry?.satisfaction != null) {
this.lastSatisfactionData = {
  value:   entry.satisfaction,
  comment: entry.satComment ?? '',
  date:    undefined  
};
        } else {
          this.lastSatisfactionData = null;
        }
        this.loadingSatisfaction = false;

        // ── Points ────────────────────────────────────────────
        // ✅ Un collaborateur apparaît dans "invite" OU dans "collaborateur"
        const collabId = this.collaborator._id;
        this.points = (points as Point[])
          .filter(p => {
            // Cas 1 : champ collaborateur
            const collabField = (p.collaborateur as any)?._id ?? p.collaborateur;
            if (collabField === collabId) return true;

            // Cas 2 : champ invite (tableau de users ou d'IDs)
            if (Array.isArray(p.invite)) {
              return p.invite.some((inv: any) =>
                (inv?._id ?? inv) === collabId
              );
            }
            return false;
          })
          .sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );

        this.loadingPoints = false;
      },
      error: () => {
        this.loadingPoints       = false;
        this.loadingSatisfaction = false;
      }
    });
  }

  close(): void { this.closeModal.emit(); }

  isManager(): boolean {
    return this.collaborator?.role === UserRole.MANAGER;
  }

  getInitials(): string {
    if (!this.collaborator) return '?';
    return (
      (this.collaborator.first_name?.[0] ?? '') +
      (this.collaborator.last_name?.[0]  ?? '')
    ).toUpperCase() || '?';
  }

  getPracticeName(): string {
    if (!this.collaborator?.practice_id) return '—';
    const p = this.collaborator.practice_id as any;
    if (Array.isArray(p)) return p[0]?.name || '—';
    if (typeof p === 'object' && p?.name) return p.name;
    if (typeof p === 'string') return p;
    return '—';
  }

  // ── Satisfaction ─────────────────────────────────────────────────

  getLastSatisfaction(): SatisfactionEntry | null {
    return this.lastSatisfactionData;
  }

  getSatisfactionLabel(v: number): string {
    if (v >= 4.5) return 'Excellent';
    if (v >= 3.5) return 'Good';
    if (v >= 2.5) return 'Neutral';
    if (v >= 1.5) return 'Low';
    return 'Very Low';
  }

  getSatisfactionColor(v: number): string {
    if (v >= 4) return '#16a34a';
    if (v >= 3) return '#ca8a04';
    return '#dc2626';
  }

  getSatisfactionBg(v: number): string {
    if (v >= 4) return '#dcfce7';
    if (v >= 3) return '#fef9c3';
    return '#fee2e2';
  }

  // ── Points ────────────────────────────────────────────────────────

  getStatusKey(s?: string): string {
    const map: Record<string, string> = {
      'En attente': 'waiting',
      'En cours':   'progress',
      'Terminé':    'done',
      'Annulé':     'cancelled'
    };
    return map[s ?? ''] ?? 'waiting';
  }

  getCritKey(c?: string): string {
    const map: Record<string, string> = {
      'Basse':   'low',
      'Moyenne': 'medium',
      'Haute':   'high'
    };
    return map[c ?? ''] ?? 'low';
  }
}