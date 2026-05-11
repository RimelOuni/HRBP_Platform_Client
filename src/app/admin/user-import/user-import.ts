// user-import.component.ts

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { UserImportRow, UserImportForm, ImportLog, LogDetails, LogDetailRow } from '../../core/models/user-import.model';
import { UserImport } from '../../core/services/user-import.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Toast { message: string; type: 'success' | 'error'; }

@Component({
  selector: 'app-user-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-import.html',
  styleUrls: ['./user-import.css'],
})
export class UserImportComponent implements OnInit, OnDestroy {

  users: UserImportRow[] = [];
  filteredUsers: UserImportRow[] = [];
  importLogs: ImportLog[] = [];
  searchQuery = '';

  isLoading       = false;
  isLoadingLogs   = false;
  isImporting     = false;
  isSaving        = false;
  isDeleting      = false;
  isDeletingLog   = false;
  deletingLogId: string | null = null;

  toast: Toast | null = null;
  private toastTimer: any;

  showUserModal      = false;
  showDeleteModal    = false;
  showDeleteLogModal = false;
  showLogDetails     = false;   // ← log detail modal

  editingUser:  UserImportRow | null = null;
  userToDelete: UserImportRow | null = null;
  logToDelete:  ImportLog     | null = null;

  userForm: UserImportForm = { first_name: '', last_name: '', identifiant: '' };

  // Log details state
  logDetails:        LogDetails | null = null;
  isLoadingDetails   = false;
  detailsError:      string | null = null;
  detailFilter:      'all' | 'created' | 'skipped' | 'error' = 'all';

  constructor(
    private userImportService: UserImport,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.loadUsers(); this.loadLogs(); }
  ngOnDestroy(): void { clearTimeout(this.toastTimer); }

  // ── Load ──────────────────────────────────────────────────────────────────

  loadUsers(): void {
    this.isLoading = true; this.cdr.detectChanges();
    this.userImportService.getUsers().subscribe({
      next: (data) => { this.users = data; this.applyFilter(); this.isLoading = false; this.cdr.detectChanges(); },
      error: (err) => { console.error(err); this.showToast('Failed to load users', 'error'); this.isLoading = false; this.cdr.detectChanges(); },
    });
  }

  loadLogs(): void {
    this.isLoadingLogs = true; this.cdr.detectChanges();
    this.userImportService.getLogs().subscribe({
      next: (data) => { this.importLogs = data; this.isLoadingLogs = false; this.cdr.detectChanges(); },
      error: (err) => { console.error(err); this.isLoadingLogs = false; this.cdr.detectChanges(); },
    });
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredUsers = q
      ? this.users.filter(u =>
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q)  ||
          u.identifiant?.toLowerCase().includes(q))
      : [...this.users];
    this.cdr.detectChanges();
  }

  trackById(_: number, u: UserImportRow): string { return u._id; }

  // ── Import ────────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input?.files?.[0];
    if (!file) return;

    this.isImporting = true; this.cdr.detectChanges();

    this.userImportService.importFile(file).subscribe({
      next: (res) => {
        this.isImporting = false;
        this.showToast(res.message, 'success');
        this.loadUsers(); this.loadLogs();
        input.value = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.showToast(err.error?.error || 'Import failed', 'error');
        this.isImporting = false; input.value = '';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Log details modal ─────────────────────────────────────────────────────

  openLogDetails(log: ImportLog): void {
    this.logDetails      = null;
    this.detailsError    = null;
    this.detailFilter    = 'all';
    this.isLoadingDetails = true;
    this.showLogDetails  = true;
    this.cdr.detectChanges();

    this.userImportService.getLogDetails(log._id).subscribe({
      next: (data) => { this.logDetails = data; this.isLoadingDetails = false; this.cdr.detectChanges(); },
      error: (err) => {
        this.detailsError    = err.error?.error || 'Could not load file details';
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeLogDetails(): void { this.showLogDetails = false; this.logDetails = null; this.cdr.detectChanges(); }

  get filteredDetailRows(): LogDetailRow[] {
    if (!this.logDetails) return [];
    if (this.detailFilter === 'all') return this.logDetails.rows;
    return this.logDetails.rows.filter(r => r.status === this.detailFilter);
  }

  setDetailFilter(f: 'all' | 'created' | 'skipped' | 'error'): void {
    this.detailFilter = f; this.cdr.detectChanges();
  }

  // ── Export / Download ─────────────────────────────────────────────────────

  exportUsers(): void { window.open(this.userImportService.exportUrl(this.searchQuery), '_blank'); }
  downloadLog(log: ImportLog): void { window.open(this.userImportService.logDownloadUrl(log._id), '_blank'); }

  // ── Add / Edit User ───────────────────────────────────────────────────────

  openAddModal(): void {
    this.editingUser = null;
    this.userForm = { first_name: '', last_name: '', identifiant: '' };
    this.showUserModal = true; this.cdr.detectChanges();
  }

  openEditModal(user: UserImportRow): void {
    this.editingUser = user;
    this.userForm = { first_name: user.first_name, last_name: user.last_name, identifiant: user.identifiant };
    this.showUserModal = true; this.cdr.detectChanges();
  }

  closeUserModal(): void { this.showUserModal = false; this.editingUser = null; this.cdr.detectChanges(); }

  saveUser(): void {
    const { first_name, last_name, identifiant } = this.userForm;
    if (!first_name?.trim() || !last_name?.trim() || !identifiant?.trim()) {
      this.showToast('All fields are required', 'error'); return;
    }
    this.isSaving = true; this.cdr.detectChanges();

    const req$ = this.editingUser
      ? this.userImportService.updateUser(this.editingUser._id, { first_name, last_name })
      : this.userImportService.createUser({ first_name, last_name, identifiant });

    req$.subscribe({
      next: () => { this.isSaving = false; this.showToast(this.editingUser ? 'User updated' : 'User added', 'success'); this.closeUserModal(); this.loadUsers(); },
      error: (err) => { console.error(err); this.showToast(err.error?.error || 'Save failed', 'error'); this.isSaving = false; this.cdr.detectChanges(); },
    });
  }

  // ── Delete User ───────────────────────────────────────────────────────────

  openDeleteModal(user: UserImportRow): void { this.userToDelete = user; this.showDeleteModal = true; this.cdr.detectChanges(); }
  closeDeleteModal(): void { this.showDeleteModal = false; this.userToDelete = null; this.cdr.detectChanges(); }

  confirmDelete(): void {
    if (!this.userToDelete) return;
    this.isDeleting = true; this.cdr.detectChanges();
    this.userImportService.deleteUser(this.userToDelete._id).subscribe({
      next: () => { this.isDeleting = false; this.showToast('User deleted', 'success'); this.closeDeleteModal(); this.loadUsers(); },
      error: (err) => { console.error(err); this.showToast('Delete failed', 'error'); this.isDeleting = false; this.closeDeleteModal(); },
    });
  }

  // ── Delete Log ────────────────────────────────────────────────────────────

  openDeleteLogModal(log: ImportLog): void { this.logToDelete = log; this.showDeleteLogModal = true; this.cdr.detectChanges(); }
  closeDeleteLogModal(): void { this.showDeleteLogModal = false; this.logToDelete = null; this.cdr.detectChanges(); }

  confirmDeleteLog(): void {
    if (!this.logToDelete) return;
    this.isDeletingLog = true; this.deletingLogId = this.logToDelete._id; this.cdr.detectChanges();
    this.userImportService.deleteLog(this.logToDelete._id).subscribe({
      next: (res) => {
        this.isDeletingLog = false; this.deletingLogId = null;
        this.showToast(res.message, 'success');
        this.closeDeleteLogModal(); this.loadUsers(); this.loadLogs();
      },
      error: (err) => {
        console.error(err); this.showToast('Delete failed', 'error');
        this.isDeletingLog = false; this.deletingLogId = null;
        this.closeDeleteLogModal(); this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(d: string | Date): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  truncate(s: string, max: number): string {
    return s?.length > max ? s.slice(0, max) + '…' : (s ?? '');
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type }; this.cdr.detectChanges();
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 4000);
  }
}

export { UserImport };
