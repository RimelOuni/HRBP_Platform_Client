import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';
import { PracticeService } from '../../../core/services/practice.service';
import { User, Practice } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-management-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management-list.html',
  styleUrls: ['./user-management-list.css']
})
export class UserManagementList implements OnInit, OnDestroy {

  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = true;

  searchQuery = '';
  selectedRole = 'ALL';
  selectedPractice = 'ALL';
  selectedGrade = 'ALL';
  selectedStatus = 'ALL';

  hasError = false;
  errorMessage = '';

  showModal = false;
  modalMessage = '';
  pendingToggleUserId: string | null = null;
  pendingToggleStatus = false;

  // Map of practiceId → practice name, built from ALL sources
  private practiceMap = new Map<string, string>();

  // All practices for the filter dropdown
  allPractices: Practice[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private practiceService: PracticeService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load users AND practices in parallel.
   * This guarantees we have a practiceId→name map even when
   * the API returns practice_id as plain string IDs (not populated objects).
   */
  private loadAll(): void {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges();

    forkJoin({
      users: this.userService.getAllUsers(),
      practices: this.practiceService.getAllPractices()
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: ({ users, practices }) => {
          // 1. Build id→name map from the /practices endpoint
          this.allPractices = practices || [];
          this.practiceMap.clear();
          this.allPractices.forEach(p => {
            if (p._id) this.practiceMap.set(String(p._id), p.name);
          });

          // 2. Also scan users for any inline populated practice objects
          (users || []).forEach(user => {
            const raw: any = user.practice_id;
            if (!raw) return;
            const arr: any[] = Array.isArray(raw) ? raw : [raw];
            arr.forEach((p: any) => {
              if (p && typeof p === 'object' && p._id && p.name) {
                this.practiceMap.set(String(p._id), p.name);
              }
            });
          });

          this.users = users || [];
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.hasError = true;
          this.errorMessage = 'Failed to load users.';
          this.cdr.detectChanges();
        }
      });
  }

  onSearchChange(): void { this.applyFilters(); }
  onFilterChange(): void { this.applyFilters(); }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      const firstName = (user.first_name || '').toLowerCase();
      const lastName  = (user.last_name  || '').toLowerCase();
      const email     = (user.email      || '').toLowerCase();

      const searchMatch = !query ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query);

      const roleMatch =
        this.selectedRole === 'ALL' ||
        (user.role || '').toUpperCase() === this.selectedRole.toUpperCase();

      const practiceMatch = this.checkPracticeMatch(user);

      const gradeMatch =
        this.selectedGrade === 'ALL' ||
        (user.grade || '').toUpperCase() === this.selectedGrade.toUpperCase();

      let statusMatch = true;
      if (this.selectedStatus === 'ACTIVE')        statusMatch = user.is_active === true;
      else if (this.selectedStatus === 'INACTIVE') statusMatch = user.is_active === false;

      return searchMatch && roleMatch && practiceMatch && gradeMatch && statusMatch;
    });

    this.cdr.detectChanges();
  }

  private checkPracticeMatch(user: User): boolean {
    if (this.selectedPractice === 'ALL') return true;
    if (!user.practice_id) return false;

    const selectedId = this.selectedPractice;
    const raw: any = user.practice_id;
    const practices: any[] = Array.isArray(raw) ? raw : [raw];

    return practices.some((p: any) => {
      if (!p) return false;
      if (typeof p === 'string') return String(p) === selectedId;
      if (typeof p === 'object') return String(p._id || '') === selectedId;
      return false;
    });
  }

  get uniquePractices(): Practice[] {
    return this.allPractices;
  }

  trackByUserId(index: number, user: User): string {
    return user._id || index.toString();
  }

  /* ── NAVIGATION ── */

  viewUser(userId: string): void {
    this.router.navigate(['/admin/users', userId]);
  }

  createUser(): void {
    this.router.navigate(['/admin/addUser']);
  }

  onEditUser(userId: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/editUser', userId]);
  }

  /* ── DISPLAY HELPERS ── */

  getInitials(user: User): string {
    return (
      (user.first_name || '').charAt(0) +
      (user.last_name  || '').charAt(0)
    ).toUpperCase();
  }

  getAvatarColor(user: User): string {
    const colors = [
      '#10b981','#3b82f6','#8b5cf6','#f59e0b',
      '#ef4444','#06b6d4','#ec4899','#6366f1'
    ];
    let hash = 0;
    const str = user._id || user.email || 'default';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      ADMIN_RH:     'Admin RH',
      HRBP:         'HRBP',
      MANAGER:      'Manager',
      COLLABORATOR: 'Collaborator',
      DIRECTION_RH: 'Direction RH'
    };
    return map[role] || role;
  }

  getRoleClass(role: string): string {
    const map: Record<string, string> = {
      ADMIN_RH:     'role-admin',
      HRBP:         'role-hrbp',
      MANAGER:      'role-manager',
      COLLABORATOR: 'role-collaborator',
      DIRECTION_RH: 'role-direction'
    };
    return map[role] || '';
  }

  /**
   * Resolve practice name(s) for a user.
   *
   * Handles all shapes the API might return:
   *   - populated object:   { _id, name, ... }
   *   - populated array:    [{ _id, name }, ...]
   *   - plain string ID:    "68abc123..."
   *   - plain string array: ["68abc123...", ...]
   *
   * Always falls back to the practiceMap built from /practices endpoint.
   */
  getPracticeName(user: User): string {
    const raw: any = user.practice_id;
    if (raw === null || raw === undefined) return '-';

    const list: any[] = Array.isArray(raw) ? raw : [raw];
    if (list.length === 0) return '-';

    const names: string[] = list
      .map((p: any): string | null => {
        if (!p) return null;

        // Populated object with name directly
        if (typeof p === 'object' && p.name) return String(p.name);

        // Populated object with only _id — look up in map
        if (typeof p === 'object' && p._id) {
          return this.practiceMap.get(String(p._id)) ?? null;
        }

        // Plain string ID — look up in map
        if (typeof p === 'string') {
          return this.practiceMap.get(p) ?? null;
        }

        return null;
      })
      .filter((n): n is string => n !== null && n !== '');

    return names.length ? names.join(', ') : '-';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[d.getMonth()]}. ${d.getFullYear()}`;
  }

  /* ── MODAL / TOGGLE ── */

  onToggleStatus(userId: string, currentStatus: boolean, event: Event): void {
    event.stopPropagation();
    this.pendingToggleUserId = userId;
    this.pendingToggleStatus = currentStatus;
    this.modalMessage =
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.modalMessage = '';
    this.pendingToggleUserId = null;
    this.pendingToggleStatus = false;
    this.cdr.detectChanges();
  }

  confirmToggleStatus(): void {
    if (!this.pendingToggleUserId) return;
    const userId = this.pendingToggleUserId;

    this.userService.toggleUserStatus(userId).subscribe({
      next: () => {
        const i = this.users.findIndex(u => u._id === userId);
        if (i !== -1) {
          this.users[i] = { ...this.users[i], is_active: !this.pendingToggleStatus };
          this.applyFilters();
        }
        this.closeModal();
      },
      error: (error) => {
        console.error('Toggle error:', error);
        this.modalMessage = error.status === 404
          ? 'Error: API endpoint not found. Contact admin.'
          : 'Error: Failed to update user status. Try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
