import {
  Component, OnInit, OnDestroy,
  inject, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { UserService } from '../core/services/user.service';

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './manager.html',
  styleUrls: ['./manager.css'],
})
export class Manager implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router      = inject(Router);
  private cdr         = inject(ChangeDetectorRef);

  userName      = '';
  userInitials  = '';
  userPhotoUrl  = '';
  currentUserId = '';

  isSidebarCollapsed = false;
  hasNotifications   = false;
  showNotifications  = false;

  private subs = new Subscription();

  ngOnInit(): void {
    this.initUser();
    this.restoreSidebarState();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /* ─────────────── USER ─────────────── */

  private initUser(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName      = `${user.first_name} ${user.last_name}`.trim();
      this.userInitials  = [user.first_name?.[0], user.last_name?.[0]]
        .filter(Boolean).join('').toUpperCase();
      this.userPhotoUrl  = (user as any).photo_url || '';
      this.currentUserId = (user as any)._id || (user as any).id || '';
    }

    if (!this.currentUserId) this.extractIdFromToken();
    if (this.currentUserId)  this.loadUserPhoto();
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

  /* ─────────────── SIDEBAR ─────────────── */

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('manager_sidebar_collapsed', String(this.isSidebarCollapsed));
  }

  private restoreSidebarState(): void {
    this.isSidebarCollapsed = localStorage.getItem('manager_sidebar_collapsed') === 'true';
  }

  /* ─────────────── AUTH ─────────────── */

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}