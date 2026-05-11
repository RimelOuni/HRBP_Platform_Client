import {
  Component, OnInit, OnDestroy,
  inject, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import { UserService } from '../core/services/user.service';
import { SurveyService } from '../core/services/survey.service';

interface OverviewStats {
  surveysToAnswer: number;
  badgesEarned: number;
}

@Component({
  selector: 'app-collab',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './collab.html',
  styleUrls: ['./collab.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Collab implements OnInit, OnDestroy {

  private authService   = inject(AuthService);
  private userService   = inject(UserService);
  private surveyService = inject(SurveyService);
  private router        = inject(Router);
  private cdr           = inject(ChangeDetectorRef);

  userName      = '';
  userInitials  = '';
  userPhotoUrl  = '';   // ← photo for header avatar
  currentUserId = '';   // ← for SelfProfile link

  overviewStats: OverviewStats = { surveysToAnswer: 0, badgesEarned: 0 };
  isSidebarCollapsed = false;

  hasNotifications  = false;
  showNotifications = false;

  private subs = new Subscription();

  ngOnInit(): void {
    this.initUser();
    this.restoreSidebarState();
    this.loadStats();

    const routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => this.loadStats());

    this.subs.add(routerSub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /* ─────────────── USER ─────────────── */

  private initUser(): void {
    const user = this.authService.getUser();
    if (!user) return;

    this.userName     = `${user.first_name} ${user.last_name}`.trim();
    this.userInitials = [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean).join('').toUpperCase();
    this.userPhotoUrl  = (user as any).photo_url || '';
    this.currentUserId = (user as any)._id || (user as any).id || '';

    // Fallback JWT decode
    if (!this.currentUserId) this.extractIdFromToken();

    // Load latest photo from API
    if (this.currentUserId) this.loadUserPhoto();
  }

  private extractIdFromToken(): void {
    const token = localStorage.getItem('hrbp_token') || localStorage.getItem('authToken');
    if (!token) return;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        this.currentUserId = payload._id || payload.id || payload.userId || payload.sub || '';
      }
    } catch {}
  }

  private loadUserPhoto(): void {
    this.userService.getUserByIdadmin(this.currentUserId).subscribe({
      next: (user: any) => {
        if (user?.photo_url) {
          this.userPhotoUrl = user.photo_url;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  /* ─────────────── NOTIFICATIONS ─────────────── */

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  /* ─────────────── STATS ─────────────── */

  private loadStats(): void {
    const surveysSub = this.surveyService.getSurveysForUser().subscribe({
      next: (surveys) => {
        this.overviewStats = { ...this.overviewStats, surveysToAnswer: surveys.length };
        this.cdr.detectChanges();
      },
      error: () => {
        this.overviewStats = { ...this.overviewStats, surveysToAnswer: 0 };
      },
    });

    const badgesSub = this.surveyService.getMyGamification().subscribe({
      next: (gamif) => {
        this.overviewStats = {
          ...this.overviewStats,
          badgesEarned: gamif.earnedBadges?.length ?? 0,
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.overviewStats = { ...this.overviewStats, badgesEarned: 0 };
      },
    });

    this.subs.add(surveysSub);
    this.subs.add(badgesSub);
  }

  /* ─────────────── SIDEBAR ─────────────── */

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('collab_sidebar_collapsed', String(this.isSidebarCollapsed));
  }

  private restoreSidebarState(): void {
    this.isSidebarCollapsed = localStorage.getItem('collab_sidebar_collapsed') === 'true';
  }

  /* ─────────────── AUTH ─────────────── */

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}