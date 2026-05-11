import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { UserService } from '../../../core/services/user.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ProjectService } from '../../../core/services/project.service';
import { User } from '../../../core/models/user.model';
import { Practice } from '../../../core/models/practice.model';
import { Project } from '../../../core/models/project.model';
import { AssignmentType } from '../../../core/models/user.model';

type TabType = 'personal' | 'professional' | 'relations' | 'status';

export interface ProjectGroup {
  practiceId: string;
  practiceName: string;
  projects: Project[];
}

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-user.html',
  styleUrl: './edit-user.css',
})
export class EditUser implements OnInit, OnDestroy {
  activeTab: TabType = 'personal';
  userId: string = '';
  loading = true;
  saving = false;
  successMsg = '';
  errorMsg = '';

  user: User | null = null;

  form = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    photo_url: '',
    role: '',
    grade: '',
    practice_ids: [] as string[],
    ro_id: '',
    cc_id: '',
    is_active: true,
    project_id: '' as string,
    assignment_type: null as AssignmentType,
  };

  practices: Practice[] = [];
  allUsers: User[] = [];
  selectableUsers: User[] = [];

  // ── Project assignment state ──────────────────────────────
  projectGroups: ProjectGroup[] = [];   // projects grouped by practice
  loadingProjects = false;
  // Stash the saved values while project groups are loading on init
  private _pendingProjectId: string = '';
  private _pendingAssignmentType: AssignmentType = null;
  // ─────────────────────────────────────────────────────────

  roSearch = '';
  ccSearch = '';
  roDropdownOpen = false;
  ccDropdownOpen = false;
  practiceDropdownOpen = false;

  roles = ['ADMIN_RH', 'HRBP', 'MANAGER', 'COLLABORATOR', 'DIRECTION_RH'];
  grades = ['GRADUATE', 'JUNIOR', 'CONFIRMED', 'SENIOR', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'EXPERT'];

  uploadingPhoto = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private practiceService: PracticeService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.userId) {
      this.errorMsg = 'User ID not provided';
      this.loading = false;
      return;
    }
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

  /** All projects flattened across all groups */
  get allProjects(): Project[] {
    return this.projectGroups.flatMap(g => g.projects);
  }

  /** True if at least one practice is selected and projects have loaded */
  get hasProjectsToShow(): boolean {
    return this.form.practice_ids.length > 0 && !this.loadingProjects;
  }

  // ── Data loading ──────────────────────────────────────────

  loadData() {
    this.loading = true;
    this.errorMsg = '';

    this.userService.getUserByIdadmin(this.userId).pipe(
      takeUntil(this.destroy$),
      switchMap(user => {
        this.user = user;
        this.populateForm(user);
        return forkJoin({
          practices: this.practiceService.getAllPractices(),
          users: this.userService.getAllUsersadmin()
        });
      })
    ).subscribe({
      next: ({ practices, users }) => {
        this.practices = practices;
        this.allUsers = users.filter((u: User) => u._id !== this.userId);
        this.selectableUsers = users.filter((u: User) =>
          u._id !== this.userId &&
          u.is_active &&
          ['MANAGER', 'HRBP', 'ADMIN_RH', 'DIRECTION_RH'].includes(u.role)
        );

        // Pre-load projects for already-selected practices.
        // Keep loading=true so the form only renders once options are ready.
        if (this.form.practice_ids.length > 0) {
          this.loadProjectsForSelectedPractices(true);
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.errorMsg = 'Failed to load user data';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  populateForm(u: User) {
    this.form.first_name      = u.first_name  || '';
    this.form.last_name       = u.last_name   || '';
    this.form.email           = u.email       || '';
    this.form.phone           = u.phone       || '';
    this.form.photo_url       = u.photo_url   || '';
    this.form.role            = u.role        || '';
    this.form.grade           = u.grade       || '';
    this.form.is_active       = u.is_active   ?? true;
    this.form.practice_ids    = this.extractIds(u.practice_id);
    this.form.ro_id           = this.extractId(u.ro_id);
    this.form.cc_id           = this.extractId(u.cc_id);

    // Stash these — the <select> options won't exist until projectGroups loads.
    // We restore them in loadProjectsForSelectedPractices() once the groups are ready.
    this._pendingProjectId      = this.extractId(u.project_id);
    this._pendingAssignmentType = (u.assignment_type as AssignmentType) ?? null;
    this.form.project_id        = '';
    this.form.assignment_type   = null;
  }

  private extractId(value: any): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) return value[0]?._id || value[0] || '';
    if (value && typeof value === 'object' && '_id' in value) return value._id || '';
    return '';
  }

  private extractIds(value: any): string[] {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) {
      return value.map(v => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && '_id' in v) return v._id;
        return '';
      }).filter(id => id !== '');
    }
    if (value && typeof value === 'object' && '_id' in value) return [value._id];
    return [];
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

  // ── Project assignment methods ────────────────────────────

  /**
   * Load projects for ALL currently selected practices (used on init).
   * Pass isInit=true to also restore the saved project_id / assignment_type
   * after the <option> elements exist in the DOM.
   */
  private loadProjectsForSelectedPractices(isInit = false): void {
    if (this.form.practice_ids.length === 0) {
      this.projectGroups = [];
      if (isInit) { this.loading = false; this.cdr.detectChanges(); }
      return;
    }

    this.loadingProjects = true;
    if (!isInit) this.cdr.detectChanges(); // avoid double-trigger on init path

    const requests = this.form.practice_ids.map(id =>
      this.projectService.getProjectsByPractice(id)
    );

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        this.projectGroups = results.map((projects, i) => {
          const pid = this.form.practice_ids[i];
          const practice = this.practices.find(p => p._id === pid);
          return {
            practiceId: pid,
            practiceName: practice?.name ?? pid,
            projects,
          };
        }); // keep groups even if empty so the section is visible

        this.loadingProjects = false;

        // Restore saved project + assignment now that <option> elements exist
        if (isInit && this._pendingProjectId) {
          this.form.project_id      = this._pendingProjectId;
          this.form.assignment_type = this._pendingAssignmentType;
        }

        if (isInit) this.loading = false; // unblock the whole view now
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading projects:', err);
        this.loadingProjects = false;
        if (isInit) this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

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

  // ── Tab & dropdown helpers ────────────────────────────────

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

  isPracticeSelected(practiceId: string): boolean {
    return this.form.practice_ids.includes(practiceId);
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

  // ── Formatting ────────────────────────────────────────────

  formatRole(role: string): string {
    const map: Record<string, string> = {
      ADMIN_RH: 'Admin RH', HRBP: 'HRBP', MANAGER: 'Manager',
      COLLABORATOR: 'Collaborator', DIRECTION_RH: 'Direction RH',
    };
    return map[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      ADMIN_RH: 'badge-admin', HRBP: 'badge-hrbp',
      MANAGER: 'badge-manager', COLLABORATOR: 'badge-collab',
      DIRECTION_RH: 'badge-direction',
    };
    return map[role] || 'badge-collab';
  }

  // ── Save ──────────────────────────────────────────────────

  saveChanges() {
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';

    const payload: any = {
      first_name:      this.form.first_name,
      last_name:       this.form.last_name,
      email:           this.form.email,
      phone:           this.form.phone,
      role:            this.form.role,
      grade:           this.form.grade,
      is_active:       this.form.is_active,
      photo_url:       this.form.photo_url,
      project_id:      this.form.project_id || null,
      assignment_type: this.form.assignment_type || null,
    };

    if (this.form.practice_ids.length > 0) payload.practice_id = this.form.practice_ids;
    if (this.form.ro_id) payload.ro_id = this.form.ro_id;
    if (this.form.cc_id) payload.cc_id = this.form.cc_id;

    this.userService.updateUser(this.userId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMsg = 'User updated successfully!';
          this.cdr.detectChanges();
          setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
        },
        error: (err) => {
          this.saving = false;
          this.errorMsg = err.error?.message || 'Failed to update user';
          this.cdr.detectChanges();
        },
      });
  }

  toggleStatus() {
    this.userService.toggleUserStatus(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.form.is_active = res.is_active;
          this.successMsg = `User ${res.is_active ? 'activated' : 'deactivated'} successfully`;
          this.cdr.detectChanges();
          setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
        },
        error: (err) => {
          this.errorMsg = err.error?.message || 'Failed to toggle status';
          this.cdr.detectChanges();
        },
      });
  }

  resetPassword() {
    if (!confirm('Send password reset email to this user?')) return;
    alert('Password reset email sent!');
  }

  goBack() {
    this.router.navigate(['/admin/UserManagement']);
  }

  formatDate(dateStr?: string | Date): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('fr-FR');
  }

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
}
