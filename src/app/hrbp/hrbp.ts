// src/app/hrbp/hrbp.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { AuthService }    from '../auth/auth.service';
import { Collaborator }   from '../core/models/user.model';
import { UserService }    from '../core/services/user.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

interface PracticeStat {
  name:  string;
  count: number;
}

@Component({
  selector:    'app-hrbp',
  standalone:  true,
  imports:     [RouterModule, CommonModule, FormsModule],
  templateUrl: './hrbp.html',
  styleUrls:   ['./hrbp.css']
})
export class HRBP implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router      = inject(Router);
  private cdr         = inject(ChangeDetectorRef);

  // ── Header / user ──────────────────────────────────────────────────
  userName      = '';
  userInitials  = '';
  userPhotoUrl  = '';
  currentUserId = '';

  // ── Data ───────────────────────────────────────────────────────────
  collaborators: Collaborator[]  = [];
  practiceStats: PracticeStat[]  = [];

  // ── UI ─────────────────────────────────────────────────────────────
  isSidebarCollapsed = false;
  selectedPractice   = 'ALL';
  isLoadingStats     = true;
  hasNotifications   = false;
  showNotifications  = false;

  ngOnInit() {
    this.initializeUser();
    this.restoreSidebarState();
    this.loadCollaborators();
  }

  // ════════════════════════════════════════════════════════════════════
  // USER
  // ════════════════════════════════════════════════════════════════════

  private initializeUser(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName      = `${user.first_name} ${user.last_name}`;
      this.userInitials  = this.generateInitials(this.userName);
      this.userPhotoUrl  = (user as any).photo_url || '';
      this.currentUserId = (user as any)._id || (user as any).id || '';
    }

    if (!this.currentUserId) {
      this.extractIdFromToken();
    }

    if (this.currentUserId) {
      this.loadUserPhoto();
    }
  }

  private extractIdFromToken(): void {
    const token = localStorage.getItem('hrbp_token') || localStorage.getItem('authToken');
    if (!token) return;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload      = JSON.parse(atob(parts[1]));
        this.currentUserId = payload._id || payload.id || payload.userId || payload.sub || '';
      }
    } catch (e) {
      console.error('Failed to decode token', e);
    }
  }

  private loadUserPhoto(): void {
    if (!this.currentUserId) return;
    this.userService.getUserByIdadmin(this.currentUserId).subscribe({
      next: (user: any) => {
        if (user?.photo_url) {
          this.userPhotoUrl = user.photo_url;
          this.cdr.detectChanges();
        }
      },
      error: () => { /* silently ignore */ }
    });
  }

  private generateInitials(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name[0]?.toUpperCase() || '?';
  }

  /** Backward-compat alias */
  getInitials(): string { return this.userInitials; }

  // ════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  // ════════════════════════════════════════════════════════════════════
  // SIDEBAR
  // ════════════════════════════════════════════════════════════════════

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('hrbp_sidebar_collapsed', String(this.isSidebarCollapsed));
  }

  private restoreSidebarState(): void {
    this.isSidebarCollapsed = localStorage.getItem('hrbp_sidebar_collapsed') === 'true';
  }

  // ════════════════════════════════════════════════════════════════════
  // COLLABORATORS
  // ════════════════════════════════════════════════════════════════════

  private loadCollaborators(): void {
    const user = this.authService.getUser();
    if (!user) {
      this.isLoadingStats = false;
      return;
    }

    this.isLoadingStats = true;
    this.userService.getCollaboratorsOfHrbp(user.id).subscribe({
      next: (data) => {
        this.collaborators  = data;
        this.calculateStats();
        this.isLoadingStats = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement collaborateurs', err);
        this.isLoadingStats = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calculateStats(): void {
    const statsMap: Record<string, number> = {};

    this.collaborators.forEach(c => {
      let practiceName = 'Non assigné';
      if (c.practice_id) {
        const p = c.practice_id as any;
        if (Array.isArray(p) && p.length > 0) {
          practiceName = p[0]?.name || 'Non assigné';
        } else if (p && typeof p === 'object' && 'name' in p) {
          practiceName = p.name || 'Non assigné';
        }
      }
      statsMap[practiceName] = (statsMap[practiceName] || 0) + 1;
    });

    this.practiceStats = Object.keys(statsMap)
      .map(name => ({ name, count: statsMap[name] }))
      .sort((a, b) => b.count - a.count);

    if (this.practiceStats.length > 0) {
      this.practiceStats.unshift({ name: 'ALL', count: this.collaborators.length });
    }
  }

  selectPractice(practice: string): void {
    this.selectedPractice = practice;
  }

  // ════════════════════════════════════════════════════════════════════
  // AUTH
  // ════════════════════════════════════════════════════════════════════

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}