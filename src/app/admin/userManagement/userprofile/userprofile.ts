import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { catchError, takeUntil, finalize } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';
import { User, UserRole, Grade } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './userprofile.html',
  styleUrls: ['./userprofile.css']
})
export class Userprofile implements OnInit, OnDestroy {
  user: User | null = null;
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';

  roleDescriptions: { [key: string]: string } = {
    'COLLABORATOR': 'Employee who benefits from HRBP points, can view points history, complete mood checks, and evaluate satisfaction.',
    'MANAGER': 'Manages team members, can view team analytics, assign objectives, and conduct performance reviews.',
    'HRBP': 'Human Resources Business Partner, supports employees and managers with HR processes and interventions.',
    'ADMIN_RH': 'HR Administrator with full system access to manage users, practices, and system configurations.',
    'DIRECTION_RH': 'HR Director with strategic oversight and advanced administrative capabilities.'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(userId);
    } else {
      this.hasError = true;
      this.errorMessage = 'User ID not provided';
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUser(userId: string): void {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges();

    // Use getUserByIdadmin so project_id is populated (via /user/:id which
    // already does .populate('project_id', 'name status') in the backend)
    this.userService.getUserByIdadmin(userId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading user:', error);
          this.hasError = true;
          this.errorMessage = 'Failed to load user profile. Please try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
          throw error;
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (user) => {
          this.user = user;
          this.cdr.detectChanges();
        }
      });
  }

  // ── Display helpers ───────────────────────────────────────

  getInitials(): string {
    if (!this.user) return '';
    return (this.user.first_name?.charAt(0)?.toUpperCase() || '') +
           (this.user.last_name?.charAt(0)?.toUpperCase()  || '');
  }

  getAvatarColor(): string {
    if (!this.user) return '#ec4899';
    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
      '#ef4444', '#06b6d4', '#ec4899', '#6366f1',
      '#84cc16', '#f97316', '#14b8a6', '#a855f7'
    ];
    let hash = 0;
    const str = this.user._id || this.user.email || 'default';
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getRoleLabel(): string {
    if (!this.user) return '';
    const labels: { [key: string]: string } = {
      'ADMIN_RH': 'Admin RH',
      'HRBP': 'HRBP',
      'MANAGER': 'Manager',
      'COLLABORATOR': 'Collaborator',
      'DIRECTION_RH': 'Direction RH'
    };
    return labels[this.user.role] || this.user.role;
  }

  getRoleDescription(): string {
    return this.user ? this.roleDescriptions[this.user.role] || '' : '';
  }

  getGradeLabel(): string {
    if (!this.user?.grade) return '-';
    return this.user.grade.charAt(0) + this.user.grade.slice(1).toLowerCase().replace('_', ' ');
  }

  getPracticeName(): string {
    if (!this.user?.practice_id) return '-';
    const p = this.user.practice_id;
    if (Array.isArray(p)) {
      if (p.length === 0) return '-';
      const names = p.map(x => typeof x === 'object' ? x.name : null).filter(Boolean);
      return names.length > 0 ? names.join(', ') : '-';
    }
    if (typeof p === 'object') return (p as any).name || '-';
    return '-';
  }

  getROName(): string {
    if (!this.user?.ro_id) return '-';
    const ro = this.user.ro_id;
    if (typeof ro === 'object' && (ro as any).first_name) {
      return `${(ro as any).first_name} ${(ro as any).last_name}`;
    }
    return '-';
  }

  getCCName(): string {
    if (!this.user?.cc_id) return '-';
    const cc = this.user.cc_id;
    if (typeof cc === 'object' && (cc as any).first_name) {
      return `${(cc as any).first_name} ${(cc as any).last_name}`;
    }
    return '-';
  }

  /**
   * Returns the project name when project_id is populated by the backend,
   * or '-' if no project is assigned.
   */
  getProjectName(): string {
    if (!this.user?.project_id) return '-';
    const p = this.user.project_id;
    // Populated object: { _id, name, status }
    if (typeof p === 'object' && (p as any).name) {
      return (p as any).name;
    }
    // Raw string ID (not yet populated) — shouldn't happen with getUserByIdadmin
    if (typeof p === 'string' && p.length > 0) return p;
    return '-';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/UserManagement']);
  }

  editUser(): void {
    this.router.navigate(['/admin/editUser', this.user?._id]);
  }
}
