import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../auth/auth.service';
import { UserService } from '../core/services/user.service';
import { PracticeService } from '../core/services/practice.service';

import { Collaborator } from '../core/models/user.model';
import { Practice } from '../core/models/practice.model';


@Component({
  selector: 'app-direction',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './direction.html',
  styleUrls: ['./direction.css']
})
export class Direction implements OnInit {
  private authService     = inject(AuthService);
  private userService     = inject(UserService);
  private practiceService = inject(PracticeService);
  private cdr             = inject(ChangeDetectorRef);
  private router          = inject(Router);

  // Header user info
  userName      = '';
  userInitials  = '';
  userPhotoUrl  = '';
  currentUserId = '';

  // Data
  practices:     Practice[]     = [];
  collaborators: Collaborator[] = [];

 

  // UI
  isSidebarCollapsed = false;
  isLoadingStats     = true;
  hasNotifications   = false;
  showNotifications  = false;

  ngOnInit(): void {
    this.initializeUser();
    this.restoreSidebarState();
    this.loadAllData();
  }

  /* ─────────────── USER ─────────────── */

  private initializeUser(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName      = `${user.first_name} ${user.last_name}`;
      this.userInitials  = this.generateInitials(this.userName);
      this.userPhotoUrl  = (user as any).photo_url || '';
      this.currentUserId = (user as any)._id || (user as any).id || '';
    }

    if (!this.currentUserId) this.extractIdFromToken();
    if (!this.userPhotoUrl && this.currentUserId) this.loadUserPhoto();
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

  private loadUserPhoto(): void {
    if (!this.currentUserId) return;
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
    localStorage.setItem('direction_sidebar_collapsed', String(this.isSidebarCollapsed));
  }

  private restoreSidebarState(): void {
    this.isSidebarCollapsed = localStorage.getItem('direction_sidebar_collapsed') === 'true';
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

  





  /* ─────────────── AUTH ─────────────── */

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}