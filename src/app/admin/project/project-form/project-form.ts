import {
  Component, OnInit, Input, Output, EventEmitter, inject, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectStatus } from '../../../core/models/project.model';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-form.html',
  styleUrls: ['./project-form.css']
})
export class ProjectForm implements OnInit {
  @Input() practiceId!: string;
  @Input() projectId: string | null = null;
  @Input() deleteMode: boolean = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() actionCompleted = new EventEmitter<void>();

  private projectService = inject(ProjectService);
  private cdr = inject(ChangeDetectorRef);

  // Form fields
  name: string = '';
  description: string = '';
  status: ProjectStatus = 'ACTIVE';
  startDate: string = '';
  endDate: string = '';

  isLoading = false;
  isSaving = false;
  hasError = false;
  errorMessage = '';
  projectToDeleteName = '';

  readonly statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'ACTIVE',    label: 'Active'     },
    { value: 'INACTIVE',  label: 'Inactive'   },
    { value: 'ON_HOLD',   label: 'On Hold'    },
    { value: 'COMPLETED', label: 'Completed'  },
  ];

  get modalTitle(): string {
    if (this.deleteMode) return 'Delete Project';
    return this.projectId ? 'Edit Project' : 'Create Project';
  }

  ngOnInit(): void {
    if (this.projectId) {
      this.loadProject();
    }
  }

  private loadProject(): void {
    this.isLoading = true;
    this.projectService.getProjectById(this.practiceId, this.projectId!).subscribe({
      next: (p) => {
        this.name        = p.name;
        this.description = p.description ?? '';
        this.status      = p.status;
        this.startDate   = p.startDate ? this.toDateInput(p.startDate) : '';
        this.endDate     = p.endDate   ? this.toDateInput(p.endDate)   : '';
        this.projectToDeleteName = p.name;
        this.isLoading   = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showError('Failed to load project details.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit(): void {
    if (this.deleteMode) { this.doDelete(); return; }
    if (!this.name.trim()) { this.showError('Project name is required.'); return; }

    this.isSaving = true;
    this.hasError = false;

    const payload: Partial<Project> = {
      name:        this.name.trim(),
      description: this.description.trim(),
      status:      this.status,
      startDate:   this.startDate || null,
      endDate:     this.endDate   || null,
    };

    const obs = this.projectId
      ? this.projectService.updateProject(this.practiceId, this.projectId, payload)
      : this.projectService.createProject(this.practiceId, payload);

    obs.subscribe({
      next:  () => { this.isSaving = false; this.actionCompleted.emit(); },
      error: () => { this.isSaving = false; this.showError('Failed to save project.'); this.cdr.detectChanges(); }
    });
  }

  private doDelete(): void {
    this.isSaving = true;
    this.projectService.deleteProject(this.practiceId, this.projectId!).subscribe({
      next:  () => { this.isSaving = false; this.actionCompleted.emit(); },
      error: () => { this.isSaving = false; this.showError('Failed to delete project.'); this.cdr.detectChanges(); }
    });
  }

  onClose(): void { this.closeModal.emit(); }

  private showError(msg: string): void {
    this.hasError = true;
    this.errorMessage = msg;
    this.cdr.detectChanges();
  }

  private toDateInput(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }
}
