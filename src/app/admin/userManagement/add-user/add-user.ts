import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { UserService } from '../../../core/services/user.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ProjectService } from '../../../core/services/project.service';
import { User } from '../../../core/models/user.model';
import { Practice } from '../../../core/models/practice.model';
import { Project } from '../../../core/models/project.model';
import { AssignmentType } from '../../../core/models/user.model';

type TabType = 'personal' | 'professional' | 'relations';

export interface ProjectGroup {
  practiceId: string;
  practiceName: string;
  projects: Project[];
}

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-user.html',
  styleUrl: './add-user.css',
})
export class AddUser implements OnInit, OnDestroy {
  activeTab: TabType = 'personal';
  loading = false;
  saving = false;
  successMsg = '';
  errorMsg = '';

  form = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'COLLABORATOR',
    grade: '',
    practice_ids: [] as string[],
    ro_id: '',
    cc_id: '',
    employee_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    is_active: true,
    photo_url: '',
    project_id: '' as string,
    assignment_type: null as AssignmentType,
  };

  showPassword = false;
  showConfirmPassword = false;
  uploadingPhoto = false;

  practices: Practice[] = [];
  allUsers: User[] = [];
  selectableUsers: User[] = [];

  // ── Project assignment state ──────────────────────────────
  projectGroups: ProjectGroup[] = [];
  loadingProjects = false;
  // ─────────────────────────────────────────────────────────

  roSearch = '';
  ccSearch = '';
  roDropdownOpen = false;
  ccDropdownOpen = false;
  practiceDropdownOpen = false;

  roles = ['ADMIN_RH', 'HRBP', 'MANAGER', 'COLLABORATOR', 'DIRECTION_RH'];
  grades = ['GRADUATE', 'JUNIOR', 'CONFIRMED', 'SENIOR', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'EXPERT'];
  statusOptions = [
    { value: true, label: 'Active' },
    { value: false, label: 'Inactive' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private userService: UserService,
    private practiceService: PracticeService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.generateEmployeeId();
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper')) {
      this.roDropdownOpen = false;
      this.ccDropdownOpen = false;
      this.practiceDropdownOpen = false;
    }
  }

  // ── Computed ──────────────────────────────────────────────

  get filteredRoUsers(): User[] {
    const q = this.roSearch.toLowerCase();
    return this.selectableUsers.filter(u =>
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }

  get filteredCcUsers(): User[] {
    const q = this.ccSearch.toLowerCase();
    return this.selectableUsers.filter(u =>
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }

  get selectedRoDisplay(): string {
    if (!this.form.ro_id) return '';
    const u = this.allUsers.find(x => x._id === this.form.ro_id);
    return u ? `${u.first_name} ${u.last_name} - ${this.formatRole(u.role)}` : '';
  }

  get selectedCcDisplay(): string {
    if (!this.form.cc_id) return '';
    const u = this.allUsers.find(x => x._id === this.form.cc_id);
    return u ? `${u.first_name} ${u.last_name} - ${this.formatRole(u.role)}` : '';
  }

  get selectedPracticesDisplay(): string {
    if (this.form.practice_ids.length === 0) return '';
    const selected = this.practices.filter(p => this.form.practice_ids.includes(p._id));
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0].name;
    return `${selected.length} practices selected`;
  }

  get userInitials(): string {
    return `${this.form.first_name?.charAt(0) || ''}${this.form.last_name?.charAt(0) || ''}`.toUpperCase();
  }

  get passwordStrength(): { label: string; level: number; color: string } {
    const p = this.form.password;
    if (!p) return { label: '', level: 0, color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', level: 1, color: '#ef4444' };
    if (score === 2) return { label: 'Fair', level: 2, color: '#f59e0b' };
    if (score === 3) return { label: 'Good', level: 3, color: '#3b82f6' };
    return { label: 'Strong', level: 4, color: '#10b981' };
  }

  /** All projects flattened across all groups */
  get allProjects(): Project[] {
    return this.projectGroups.flatMap(g => g.projects);
  }

  /** True if at least one practice is selected and projects have loaded */
  get hasProjectsToShow(): boolean {
    return this.form.practice_ids.length > 0 && !this.loadingProjects;
  }

  generateEmployeeId() {
    const num = Math.floor(Math.random() * 9000) + 1000;
    this.form.employee_id = `EMP${num}`;
  }

  loadData() {
    this.loading = true;
    forkJoin({
      practices: this.practiceService.getAllPractices(),
      users: this.userService.getAllUsersadmin()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ practices, users }) => {
          this.practices = practices;
          this.allUsers = users;
          this.selectableUsers = users.filter((u: User) =>
            u.is_active &&
            ['MANAGER', 'HRBP', 'ADMIN_RH', 'DIRECTION_RH'].includes(u.role)
          );
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading data:', err);
          this.errorMsg = 'Failed to load form data';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  validate(): string | null {
    if (!this.form.first_name.trim()) return 'First name is required';
    if (!this.form.last_name.trim()) return 'Last name is required';
    if (!this.form.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) return 'Invalid email format';
    if (!this.form.password) return 'Password is required';
    if (this.form.password.length < 8) return 'Password must be at least 8 characters';
    if (this.form.password !== this.form.confirmPassword) return 'Passwords do not match';
    if (!this.form.role) return 'Role is required';
    if (!this.form.entry_date) return 'Entry date is required';
    return null;
  }

  saveChanges() {
    this.successMsg = '';
    this.errorMsg = '';

    const validationError = this.validate();
    if (validationError) {
      this.errorMsg = validationError;
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;

    const payload: any = {
      first_name: this.form.first_name.trim(),
      last_name: this.form.last_name.trim(),
      email: this.form.email.trim().toLowerCase(),
      phone: this.form.phone.trim(),
      password_hash: this.form.password,
      role: this.form.role,
      is_active: this.form.is_active,
      entry_date: this.form.entry_date,
      employee_id: this.form.employee_id,
      photo_url: this.form.photo_url,
      project_id: this.form.project_id || null,
      assignment_type: this.form.assignment_type || null,
    };

    if (this.form.practice_ids.length > 0) payload.practice_id = this.form.practice_ids;
    if (this.form.grade) payload.grade = this.form.grade;
    if (this.form.ro_id) payload.ro_id = this.form.ro_id;
    if (this.form.cc_id) payload.cc_id = this.form.cc_id;

    this.userService.createUser(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = 'User created successfully!';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.router.navigate(['/admin/UserManagement']);
          }, 1500);
        },
        error: (err) => {
          this.saving = false;
          this.errorMsg = err.error?.message || 'Failed to create user';
          this.cdr.detectChanges();
        }
      });
  }

  // ── Practice toggle (with auto project reload) ────────────

  togglePractice(practiceId: string) {
    const index = this.form.practice_ids.indexOf(practiceId);
    if (index > -1) {
      this.form.practice_ids.splice(index, 1);
      // Capture the group BEFORE removing it, then check if selected project was in it
      const removedGroup = this.projectGroups.find(g => g.practiceId === practiceId);
      const removedIds = removedGroup?.projects.map(p => p._id) ?? [];
      if (removedIds.includes(this.form.project_id)) {
        this.clearAssignment();
      }
      this.projectGroups = this.projectGroups.filter(g => g.practiceId !== practiceId);
    } else {
      this.form.practice_ids.push(practiceId);
      // Load projects for newly added practice
      this.loadProjectsForPractice(practiceId);
    }
  }

  clearAllPractices(event: MouseEvent) {
    event.stopPropagation();
    this.form.practice_ids = [];
    this.projectGroups = [];
    this.clearAssignment();
  }

  isPracticeSelected(practiceId: string): boolean {
    return this.form.practice_ids.includes(practiceId);
  }

  // ── Project assignment methods ────────────────────────────

  /**
   * Load projects for a SINGLE practice and add to groups (incremental).
   */
  private loadProjectsForPractice(practiceId: string): void {
    // Don't reload if already present
    if (this.projectGroups.some(g => g.practiceId === practiceId)) return;

    this.loadingProjects = true;
    this.cdr.detectChanges();

    this.projectService.getProjectsByPractice(practiceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          if (projects.length > 0) {
            const practice = this.practices.find(p => p._id === practiceId);
            this.projectGroups = [
              ...this.projectGroups,
              {
                practiceId,
                practiceName: practice?.name ?? practiceId,
                projects,
              }
            ];
          }
          this.loadingProjects = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading projects for practice:', practiceId, err);
          this.loadingProjects = false;
          this.cdr.detectChanges();
        }
      });
  }

  /** Called when the project select changes — reset assignment type */
  onProjectChange(): void {
    this.form.assignment_type = null;
  }

  setAssignmentType(type: AssignmentType): void {
    this.form.assignment_type = this.form.assignment_type === type ? null : type;
    this.cdr.detectChanges();
  }

  clearAssignment(): void {
    this.form.project_id = '';
    this.form.assignment_type = null;
    this.cdr.detectChanges();
  }

  getSelectedProjectName(): string {
    const p = this.allProjects.find(x => x._id === this.form.project_id);
    return p?.name || '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'Active', INACTIVE: 'Inactive',
      ON_HOLD: 'On Hold', COMPLETED: 'Completed'
    };
    return map[status] ?? status;
  }

  // ── Photo upload with compression ──
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    if (file.size > 2 * 1024 * 1024) {
      this.errorMsg = 'Image must be under 2MB';
      this.cdr.detectChanges();
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
      input.value = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowed.includes(file.type)) {
      this.errorMsg = 'Only JPG, PNG, or GIF files are allowed';
      this.cdr.detectChanges();
      setTimeout(() => { this.errorMsg = ''; this.cdr.detectChanges(); }, 3000);
      input.value = '';
      return;
    }

    this.uploadingPhoto = true;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX = 300;
      let { width, height } = img;
      if (width > height) {
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
      } else {
        if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      this.form.photo_url = canvas.toDataURL('image/jpeg', 0.8);
      this.uploadingPhoto = false;
      input.value = '';
      this.cdr.detectChanges();
    };

    img.onerror = () => {
      this.errorMsg = 'Failed to read image file';
      this.uploadingPhoto = false;
      input.value = '';
      this.cdr.detectChanges();
    };

    img.src = objectUrl;
  }

  removePhoto(): void {
    this.form.photo_url = '';
  }

  setTab(tab: TabType) {
    this.activeTab = tab;
    this.roDropdownOpen = false;
    this.ccDropdownOpen = false;
    this.practiceDropdownOpen = false;
  }

  togglePracticeDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.practiceDropdownOpen = !this.practiceDropdownOpen;
    this.roDropdownOpen = false;
    this.ccDropdownOpen = false;
  }

  selectRo(user: User) {
    this.form.ro_id = user._id;
    this.roDropdownOpen = false;
    this.roSearch = '';
  }

  selectCc(user: User) {
    this.form.cc_id = user._id;
    this.ccDropdownOpen = false;
    this.ccSearch = '';
  }

  clearRo(event: MouseEvent) {
    event.stopPropagation();
    this.form.ro_id = '';
    this.roSearch = '';
  }

  clearCc(event: MouseEvent) {
    event.stopPropagation();
    this.form.cc_id = '';
    this.ccSearch = '';
  }

  toggleRoDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.roDropdownOpen = !this.roDropdownOpen;
    this.ccDropdownOpen = false;
    this.practiceDropdownOpen = false;
    if (this.roDropdownOpen) this.roSearch = '';
  }

  toggleCcDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.ccDropdownOpen = !this.ccDropdownOpen;
    this.roDropdownOpen = false;
    this.practiceDropdownOpen = false;
    if (this.ccDropdownOpen) this.ccSearch = '';
  }

  formatRole(role: string): string {
    const map: Record<string, string> = {
      ADMIN_RH: 'Admin RH',
      HRBP: 'HRBP',
      MANAGER: 'Manager',
      COLLABORATOR: 'Collaborator',
      DIRECTION_RH: 'Direction RH',
    };
    return map[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      ADMIN_RH: 'badge-admin',
      HRBP: 'badge-hrbp',
      MANAGER: 'badge-manager',
      COLLABORATOR: 'badge-collab',
      DIRECTION_RH: 'badge-direction',
    };
    return map[role] || 'badge-collab';
  }

  goBack() {
    this.router.navigate(['/admin/UserManagement']);
  }
}
