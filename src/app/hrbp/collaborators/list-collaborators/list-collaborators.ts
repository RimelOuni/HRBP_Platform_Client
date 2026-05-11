import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { Collaborator, UserRole } from '../../../core/models/user.model';
import { DetailCollaborator } from '../detail-collaborator/detail-collaborator';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-list-collaborators',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, DetailCollaborator],
  templateUrl: './list-collaborators.html',
  styleUrls: ['./list-collaborators.css']
})
export class ListCollaborators implements OnInit {

  private cdr = inject(ChangeDetectorRef);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  collaborators: Collaborator[] = [];
  filteredCollaborators: Collaborator[] = [];
  practices: string[] = [];
  grades: string[] = [];

  search = '';
  selectedPractice = 'ALL';
  selectedGrade = 'ALL';
  selectedStatus = 'ALL';
  selectedRole = 'ALL';

  showModal = false;
  selectedCollaborator!: Collaborator;
  isLoading = true;
  hrbp: any;

  ngOnInit(): void {
    this.hrbp = this.authService.getUser();
    if (!this.hrbp) { this.isLoading = false; return; }
    this.loadCollaborators();
  }

  private loadCollaborators(): void {
    this.isLoading = true;
    this.userService.getCollaboratorsOfHrbp(this.hrbp.id).subscribe({
      next: (data) => {
        this.collaborators = this.sortUsers(data);
        this.filteredCollaborators = [...this.collaborators];
        this.buildFilterOptions();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; }
    });
  }

  private sortUsers(users: Collaborator[]): Collaborator[] {
    return [...users].sort((a, b) => {
      if (a.role === UserRole.MANAGER && b.role !== UserRole.MANAGER) return -1;
      if (a.role !== UserRole.MANAGER && b.role === UserRole.MANAGER) return 1;
      return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
    });
  }

  private buildFilterOptions(): void {
    const pSet = new Set<string>();
    const gSet = new Set<string>();
    this.collaborators.forEach(c => {
      const p = this.getPracticeName(c);
      if (p && p !== 'N/A') pSet.add(p);
      if (c.grade) gSet.add(c.grade);
    });
    this.practices = Array.from(pSet).sort();
    this.grades = Array.from(gSet).sort();
  }

  getPracticeName(c: Collaborator): string {
    if (!c.practice_id) return 'N/A';
    const p = c.practice_id as any;
    if (Array.isArray(p)) return p[0]?.name ?? 'N/A';
    return p?.name ?? 'N/A';
  }

  filter(): void {
    const s = this.search.toLowerCase();
    this.filteredCollaborators = this.sortUsers(
      this.collaborators.filter(c => {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        return (
          (!this.search || name.includes(s) || c.email.toLowerCase().includes(s)) &&
          (this.selectedRole === 'ALL' || (c.role as string) === this.selectedRole) &&
          (this.selectedPractice === 'ALL' || this.getPracticeName(c) === this.selectedPractice) &&
          (this.selectedGrade === 'ALL' || c.grade === this.selectedGrade) &&
          (this.selectedStatus === 'ALL' || (this.selectedStatus === 'ACTIVE' ? c.is_active : !c.is_active))
        );
      })
    );
  }

  hasActiveFilters(): boolean {
    return !!this.search || this.selectedRole !== 'ALL' || this.selectedPractice !== 'ALL'
      || this.selectedGrade !== 'ALL' || this.selectedStatus !== 'ALL';
  }

  clearAllFilters(): void {
    this.search = '';
    this.selectedRole = this.selectedPractice = this.selectedGrade = this.selectedStatus = 'ALL';
    this.filter();
  }

  isManager(c: Collaborator): boolean { return c.role === UserRole.MANAGER; }

  getManagerCount(): number { return this.collaborators.filter(c => this.isManager(c)).length; }
  getActiveCount(): number  { return this.collaborators.filter(c => c.is_active).length; }

  openDetails(collab: Collaborator): void {
    this.selectedCollaborator = collab;
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  trackByCollaboratorId(_: number, c: Collaborator): any { return c._id; }
}