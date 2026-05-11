import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../core/services/user.service';

@Component({
  selector: 'app-update-self-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-self-profile.html',
  styleUrl: './update-self-profile.css',
})
export class UpdateSelfProfile implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  uploadingPhoto = false;
  successMsg = '';
  errorMsg = '';

  // Editable fields only
  form = {
    phone: '',
    photo_url: '',
  };

  // Read-only display data from API
  firstName = '';
  lastName = '';
  displayEmail = '';
  displayRole = '';
  displayGrade = '';
  displayEmpId = '';
  displayPractice = '';
  displayRo = '';
  displayCc = '';
  isActive = true;
  joinedDate: any = null;
  lastLogin: any = null;
  createdAt: any = null;
  updatedAt: any = null;

  originalData = { phone: '', photo_url: '' };

  private userId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // 1. Try route param
    this.userId = this.route.snapshot.paramMap.get('id') || '';

    // 2. Fallback to stored user object
    if (!this.userId) {
      const raw = localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (raw) {
        try {
          const u = JSON.parse(raw);
          // _id is always a string in JSON (MongoDB ObjectId toString)
          this.userId = u._id || u.id || '';
        } catch {}
      }
    }

    // 3. Fallback to JWT decode
    if (!this.userId) {
      const token = localStorage.getItem('hrbp_token') || localStorage.getItem('authToken');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            this.userId = payload._id || payload.id || payload.userId || payload.sub || '';
          }
        } catch (e) {
          console.error('Failed to decode token', e);
        }
      }
    }

    if (this.userId) {
      this.loadUser();
    } else {
      this.errorMsg = 'User not found';
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUser() {
    this.loading = true;
    this.userService.getUserByIdadmin(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          // Editable
          this.form.phone     = user.phone     || '';
          this.form.photo_url = user.photo_url || '';
          this.originalData   = { ...this.form };

          // Read-only
          this.firstName    = user.first_name || '';
          this.lastName     = user.last_name  || '';
          this.displayEmail = user.email      || '';
          this.displayRole  = user.role       || '';
          this.displayGrade = user.grade      || '';
          this.displayEmpId = user.identifiant || user.employee_id || '';
          this.isActive     = user.is_active ?? true;

          // Practice — can be object, array, or string
          if (Array.isArray(user.practice_id)) {
            const names = user.practice_id
              .map((p: any) => (typeof p === 'object' && p !== null ? p.name : null))
              .filter(Boolean);
            this.displayPractice = names.join(', ') || user.practice_id.join(', ') || '';
          } else if (user.practice_id && typeof user.practice_id === 'object') {
            this.displayPractice = user.practice_id.name || '';
          } else {
            this.displayPractice = user.practice_id || '';
          }

          // RO
          if (user.ro_id && typeof user.ro_id === 'object') {
            this.displayRo = `${user.ro_id.first_name || ''} ${user.ro_id.last_name || ''}`.trim();
          }

          // CC
          if (user.cc_id && typeof user.cc_id === 'object') {
            this.displayCc = `${user.cc_id.first_name || ''} ${user.cc_id.last_name || ''}`.trim();
          }

          this.joinedDate = user.entry_date || user.date_entree || user.createdAt || null;
          this.lastLogin  = user.last_login  || null;
          this.createdAt  = user.createdAt   || null;
          this.updatedAt  = user.updatedAt   || user.updated_at || null;

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading profile:', err);
          this.errorMsg = 'Failed to load profile data';
          this.loading  = false;
          this.cdr.detectChanges();
        }
      });
  }

  get displayName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get userInitials(): string {
    return `${this.firstName?.charAt(0) || ''}${this.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  get hasChanges(): boolean {
    return (
      this.form.phone     !== this.originalData.phone ||
      this.form.photo_url !== this.originalData.photo_url
    );
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    if (file.size > 2 * 1024 * 1024) {
      this.showError('Image must be under 2MB');
      input.value = '';
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      this.showError('Only JPG, PNG, or GIF allowed');
      input.value = '';
      return;
    }

    this.uploadingPhoto = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.form.photo_url = reader.result as string;
      this.uploadingPhoto = false;
      input.value = '';
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.showError('Failed to read image');
      this.uploadingPhoto = false;
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.form.photo_url = '';
  }

  saveChanges(): void {
    this.saving = true;
    this.successMsg = '';
    this.errorMsg   = '';

    const payload = {
      phone:     this.form.phone,
      photo_url: this.form.photo_url,
    };

    this.userService.updateSelfProfile(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.saving     = false;
          this.successMsg = 'Profile updated successfully!';
          this.originalData = { ...this.form };

          // Update localStorage cache
          const key = localStorage.getItem('user') ? 'user' : 'currentUser';
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const stored = JSON.parse(raw);
              stored.phone     = res.user?.phone     ?? this.form.phone;
              stored.photo_url = res.user?.photo_url ?? this.form.photo_url;
              localStorage.setItem(key, JSON.stringify(stored));
            } catch {}
          }

          this.cdr.detectChanges();
          setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
        },
        error: (err) => {
          this.saving   = false;
          this.errorMsg = err.error?.message || 'Failed to update profile';
          this.cdr.detectChanges();
        }
      });
  }

  private showError(msg: string): void {
    this.errorMsg = msg;
    this.cdr.detectChanges();
    setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
  }

  formatRole(role: string): string {
    const map: Record<string, string> = {
      ADMIN_RH:     'Admin RH',
      HRBP:         'HRBP',
      MANAGER:      'Manager',
      COLLABORATOR: 'Collaborator',
      DIRECTION_RH: 'Direction RH',
    };
    return map[role] || role;
  }

  getRoleDescription(role: string): string {
    const map: Record<string, string> = {
      COLLABORATOR: 'Employee who benefits from HRBP points, can view points history, complete mood checks, and evaluate satisfaction.',
      MANAGER:      'Manages a team of collaborators, can view team performance and assign tasks.',
      HRBP:         'HR Business Partner who manages practices and collaborator well-being.',
      ADMIN_RH:     'Full administrative access to manage users, practices, and platform settings.',
      DIRECTION_RH: 'HR Direction with strategic oversight and full reporting access.',
    };
    return map[role] || 'Platform user with standard access.';
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day:   'numeric',
      month: 'long',
      year:  'numeric',
    });
  }
}