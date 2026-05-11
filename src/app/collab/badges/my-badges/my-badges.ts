import {
  Component, OnInit, inject,
  ChangeDetectorRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SurveyService }  from '../../../core/services/survey.service';
import { BadgeService, EarnedBadge, BadgeDefinition } from '../../../core/services/badge.service';
import { GamificationProfile } from '../../../core/models/survey.model';
import { forkJoin }       from 'rxjs';

@Component({
  selector:      'app-my-badges',
  standalone:    true,
  imports:       [CommonModule, DatePipe],
  templateUrl:   './my-badges.html',
  styleUrls:     ['./my-badges.css'],
  encapsulation: ViewEncapsulation.None,
})
export class MyBadges implements OnInit {
  private surveyService = inject(SurveyService);
  private badgeService  = inject(BadgeService);
  private cdr           = inject(ChangeDetectorRef);

  loading = true;
  error   = '';

  // Badges gagnés (depuis la collection Badge — source de vérité)
  earnedBadges:   EarnedBadge[]     = [];
  // Toutes les définitions (pour la section "à débloquer")
  allDefinitions: BadgeDefinition[] = [];
  // Profil gamification (points, surveysAnswered, nextBadge)
  gamification:   GamificationProfile | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error   = '';

    // Charger en parallèle : profil gamification + badges gagnés + définitions
    forkJoin({
      gamification: this.surveyService.getMyGamification(),
      earnedBadges: this.badgeService.getMyBadges(),
      definitions:  this.badgeService.getBadgeDefinitions(),
    }).subscribe({
      next: ({ gamification, earnedBadges, definitions }) => {
        this.gamification   = gamification;
        this.earnedBadges   = earnedBadges;     // source : collection Badge
        this.allDefinitions = definitions;
        this.loading        = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('load error', e);
        this.error   = 'Erreur lors du chargement du profil.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Sections ─────────────────────────────────────────────────────

  /** Badges non encore gagnés = définitions dont l'id n'est pas dans earnedBadges */
  get lockedBadges(): BadgeDefinition[] {
    const earnedIds = new Set(this.earnedBadges.map((b) => b.badgeId));
    return this.allDefinitions.filter((d) => !earnedIds.has(d.id));
  }

  // ── Progress bar vers le prochain badge ─────────────────────────

  get nextBadgeProgress(): number {
    if (!this.gamification?.nextBadge) return 100;
    const answered     = this.gamification.surveysAnswered;
    const required     = this.gamification.nextBadge.surveysRequired;
    const prevRequired = this.allDefinitions
      .filter((d) => d.surveysRequired <= answered)
      .reduce((max, d) => Math.max(max, d.surveysRequired), 0);
    const range = required - prevRequired;
    const done  = answered - prevRequired;
    if (range <= 0) return 100;
    return Math.min(100, Math.round((done / range) * 100));
  }

  // ── Utilitaire visuel ────────────────────────────────────────────

  getBadgeGradient(b: any): string {
    if (!b.gradient?.length) {
      return `linear-gradient(135deg, ${b.color ?? '#16a34a'}, ${b.color ?? '#059669'})`;
    }
    return `linear-gradient(135deg, ${b.gradient[0]}, ${b.gradient[1]})`;
  }
}