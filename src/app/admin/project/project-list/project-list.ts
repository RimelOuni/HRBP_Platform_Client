import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { ProjectForm } from '../project-form/project-form';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProjectForm],
  templateUrl: './project-list.html',
  styleUrls: ['./project-list.css']
})
export class ProjectList implements OnInit {
  private projectService = inject(ProjectService);
  private route          = inject(ActivatedRoute);
  private cdr            = inject(ChangeDetectorRef);

  practiceId!: string;

  projects:         Project[] = [];
  filteredProjects: Project[] = [];

  searchQuery    = '';
  selectedStatus = 'ALL';

  isLoading  = false;
  hasError   = false;
  errorMessage = '';

  showModal        = false;
  selectedProjectId: string | null = null;

  showDeleteModal  = false;
  projectToDelete: string | null = null;

  ngOnInit(): void {
    this.practiceId = this.route.snapshot.paramMap.get('practiceId') ?? '';
    this.loadProjects();
  }

  private loadProjects(): void {
    this.isLoading = true;
    this.hasError  = false;
    this.cdr.detectChanges();

    this.projectService.getProjectsByPractice(this.practiceId).subscribe({
      next: (data) => {
        this.projects = data;
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading projects:', err);
        this.hasError    = true;
        this.errorMessage = 'Failed to load projects. Please try again.';
        this.isLoading   = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyFilters(): void {
    this.filteredProjects = this.projects.filter(p => {
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q || p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q);
      const matchStatus = this.selectedStatus === 'ALL' || p.status === this.selectedStatus;
      return matchSearch && matchStatus;
    });
    this.cdr.detectChanges();
  }

  onSearchChange(): void       { this.applyFilters(); }
  onStatusFilterChange(): void { this.applyFilters(); }

  onCreateProject(): void {
    this.selectedProjectId = null;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  onEditProject(id: string): void {
    this.selectedProjectId = id;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  onDeleteProject(id: string): void {
    this.projectToDelete = id;
    this.showDeleteModal  = true;
    this.cdr.detectChanges();
  }

  onModalClose(): void {
    this.showModal        = false;
    this.selectedProjectId = null;
    this.cdr.detectChanges();
  }

  onDeleteModalClose(): void {
    this.showDeleteModal = false;
    this.projectToDelete  = null;
    this.cdr.detectChanges();
  }

  onActionCompleted(): void {
    this.showModal        = false;
    this.showDeleteModal  = false;
    this.selectedProjectId = null;
    this.projectToDelete  = null;
    this.loadProjects();
  }

  // ── Helpers ──────────────────────────────────────────────────

  getManagerName(p: Project): string {
    if (!p.manager) return '—';
    return `${p.manager.first_name} ${p.manager.last_name}`;
  }

  formatDate(date: Date | string | undefined | null): string {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return '—'; }
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'Active', INACTIVE: 'Inactive',
      ON_HOLD: 'On Hold', COMPLETED: 'Completed'
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'status-active', INACTIVE: 'status-inactive',
      ON_HOLD: 'status-on-hold', COMPLETED: 'status-completed'
    };
    return map[status] ?? '';
  }

  getTotalProjects():    number  { return this.projects.length; }
  getFilteredCount():   number  { return this.filteredProjects.length; }
  hasNoResults():       boolean { return !this.isLoading && this.filteredProjects.length === 0; }
}
