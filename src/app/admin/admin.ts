import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../auth/auth.service';
import { UserService } from '../core/services/user.service';
import { PracticeService } from '../core/services/practice.service';

import { Collaborator } from '../core/models/user.model';
import { Practice } from '../core/models/practice.model';

interface OverviewStats {
  totalPractices: number;
  totalCollaborators: number;
}

interface PracticeStat {
  id: string;
  name: string;
  collaboratorsCount: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit {
  private authService  = inject(AuthService);
  private userService  = inject(UserService);
  private practiceService = inject(PracticeService);
  private cdr          = inject(ChangeDetectorRef);
  private router       = inject(Router);

  // Header user info
  userName     = '';
  userInitials = '';
  userPhotoUrl = '';   // ← photo for header avatar
  currentUserId = '';

  // Data
  practices:    Practice[]    = [];
  collaborators: Collaborator[] = [];

  overviewStats: OverviewStats = { totalPractices: 0, totalCollaborators: 0 };
  practiceStats: PracticeStat[] = [];

  // UI
  isSidebarCollapsed  = false;
  isLoadingStats      = true;
  hasNotifications    = false;
  showNotifications   = false;

  ngOnInit(): void {
    this.initializeUser();
    this.restoreSidebarState();
    this.loadAllData();
  }

  /* ─────────────── USER ─────────────── */

  private initializeUser(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName     = `${user.first_name} ${user.last_name}`;
      this.userInitials = this.generateInitials(this.userName);
      // Photo from stored user object
      this.userPhotoUrl = (user as any).photo_url || '';
      // ID
      this.currentUserId = (user as any)._id || (user as any).id || '';
    }

    // Fallback: decode JWT for ID
    if (!this.currentUserId) {
      this.extractIdFromToken();
    }

    // If photo not in stored user, load from API
    if (!this.userPhotoUrl && this.currentUserId) {
      this.loadUserPhoto();
    }
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
    } catch (e) {
      console.error('Failed to decode token', e);
    }
  }

  /**
   * Fetch the current user's profile to get the latest photo_url.
   * Called once on init so the header avatar stays in sync after profile updates.
   */
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

  /**
   * Called by UpdateSelfProfile (or any child) after a successful save,
   * so the header avatar updates without a page reload.
   * Use a shared service / event bus in production; this simple approach
   * works if you inject Admin and call refreshUserPhoto() from the child.
   */
  refreshUserPhoto(): void {
    this.loadUserPhoto();
  }

  private generateInitials(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name[0]?.toUpperCase() || '?';
  }

  /* ─────────────── NOTIFICATIONS ─────────────── */

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  /* ─────────────── SIDEBAR ─────────────── */

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('admin_sidebar_collapsed', String(this.isSidebarCollapsed));
  }

  private restoreSidebarState(): void {
    this.isSidebarCollapsed = localStorage.getItem('admin_sidebar_collapsed') === 'true';
  }

  /* ─────────────── DATA ─────────────── */

  private loadAllData(): void {
    this.isLoadingStats = true;
    this.practiceService.getAllPractices().subscribe({
      next: (practices) => {
        this.practices = practices;
        this.loadCollaborators();
      },
      error: () => this.stopLoading()
    });
  }

  private loadCollaborators(): void {
    this.userService.getAllCollaborators().subscribe({
      next: (collaborators) => {
        this.collaborators = collaborators;
        this.computeOverviewStats();
        this.computePracticeStats();
        this.stopLoading();
      },
      error: () => this.stopLoading()
    });
  }

  private stopLoading(): void {
    this.isLoadingStats = false;
    this.cdr.detectChanges();
  }

  /* ─────────────── STATS ─────────────── */

  private computeOverviewStats(): void {
    this.overviewStats = {
      totalPractices:    this.practices.length,
      totalCollaborators: this.collaborators.length
    };
  }

  private computePracticeStats(): void {
    const map = new Map<string, PracticeStat>();
    this.practices.forEach(p => map.set(p._id, { id: p._id, name: p.name, collaboratorsCount: 0 }));

    this.collaborators.forEach(c => {
      const id = this.extractPracticeId(c.practice_id);
      if (id && map.has(id)) map.get(id)!.collaboratorsCount++;
    });

    this.practiceStats = Array.from(map.values())
      .sort((a, b) => b.collaboratorsCount - a.collaboratorsCount);
  }

  private extractPracticeId(practice: any): string | null {
    if (!practice) return null;
    if (typeof practice === 'string') return practice;
    if (Array.isArray(practice)) return practice[0]?._id || null;
    if (typeof practice === 'object') return practice._id || null;
    return null;
  }

  /* ─────────────── AUTH ─────────────── */

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}