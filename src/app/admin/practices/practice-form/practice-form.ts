// practice-form/practice-form.component.ts
import {
  Component, Input, Output, EventEmitter,
  ChangeDetectorRef, inject, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PracticeService } from '../../../core/services/practice.service';
import { Practice, UserRef } from '../../../core/models/practice.model';

@Component({
  selector: 'app-practice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './practice-form.html',
  styleUrl: './practice-form.css',
})
export class PracticeForm implements OnChanges {
  @Input() practiceId: string | null = null;
  @Input() deleteMode: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() actionCompleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private practiceService = inject(PracticeService);
  private cdr = inject(ChangeDetectorRef);

  practiceForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  errorMessage = '';

  hrbpList: UserRef[] = [];
  managerList: UserRef[] = [];
  loadingDropdowns = false;

  // ✅ Tableau des IDs des HRBPs sélectionnés (multi-select)
  selectedHrbpIds: string[] = [];

  showSuccessModal = false;
  showDeleteConfirmModal = false;
  successMessage = '';

  constructor() {
    this.practiceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['ACTIVE', Validators.required],
      managerId: [null],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['practiceId'] || changes['deleteMode']) {
      this.loadDropdowns();
    }

    if (changes['practiceId']) {
      const id = changes['practiceId'].currentValue;
      if (id) {
        this.isEditMode = true;
        this.loadPractice(id);
      } else {
        this.isEditMode = false;
        this.resetForm();
      }
    }

    if (changes['deleteMode'] && this.deleteMode && this.practiceId) {
      this.showDeleteConfirmModal = true;
    }
  }

  private loadDropdowns(): void {
    this.loadingDropdowns = true;
    forkJoin({
      hrbps: this.practiceService.getUsersByRole('HRBP'),
      managers: this.practiceService.getUsersByRole('MANAGER'),
    }).subscribe({
      next: ({ hrbps, managers }) => {
        this.hrbpList = hrbps;
        this.managerList = managers;
        this.loadingDropdowns = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingDropdowns = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadPractice(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.practiceService.getPracticeById(id).subscribe({
      next: (practice: Practice) => {
        const managerId = practice.manager? practice.manager._id : null;

        // ✅ Extraire les IDs de tous les HRBPs (tableau)
        this.selectedHrbpIds = this.extractHrbpIds(practice.hrbp);

        this.practiceForm.patchValue({
          name: practice.name || '',
          description: practice.description || '',
          status: practice.status || 'ACTIVE',
          managerId,
        });

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = `Failed to load practice: ${err.message || err.status || 'Unknown error'}`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ Extraire les IDs d'un tableau d'HRBPs
  private extractHrbpIds(hrbp: UserRef[] | null | undefined): string[] {
    if (!hrbp || !Array.isArray(hrbp)) return [];
    return hrbp.map(h => h._id).filter(Boolean);
  }

  resetForm(): void {
    this.practiceForm.reset({ 
      name: '', 
      description: '', 
      status: 'ACTIVE', 
      managerId: null 
    });
    this.selectedHrbpIds = [];
    this.errorMessage = '';
  }

  // ── Gestion multi-HRBP ──────────────────────────────────────────

  isHrbpSelected(id: string): boolean {
    return this.selectedHrbpIds.includes(id);
  }

  toggleHrbp(id: string): void {
    const idx = this.selectedHrbpIds.indexOf(id);
    if (idx === -1) {
      this.selectedHrbpIds = [...this.selectedHrbpIds, id];
    } else {
      this.selectedHrbpIds = this.selectedHrbpIds.filter((x) => x !== id);
    }
  }

  removeHrbp(id: string): void {
    this.selectedHrbpIds = this.selectedHrbpIds.filter((x) => x !== id);
  }

  getSelectedHrbps(): UserRef[] {
    return this.hrbpList.filter((u) => this.selectedHrbpIds.includes(u._id));
  }

  getUnselectedHrbps(): UserRef[] {
    return this.hrbpList.filter((u) => !this.selectedHrbpIds.includes(u._id));
  }

  // ── Soumission ───────────────────────────────────────────────────

  onSubmit(): void {
    if (this.practiceForm.invalid) {
      this.practiceForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { name, description, status, managerId } = this.practiceForm.value;

    // ✅ Envoyer le tableau d'HRBPs
    const payload = {
      name,
      description: description || '',
      status,
      hrbp: this.selectedHrbpIds.length > 0 ? this.selectedHrbpIds : null, // ✅ Tableau
      manager: managerId || null,
    };

    const request = this.isEditMode && this.practiceId
      ? this.practiceService.updatePractice(this.practiceId, payload)
      : this.practiceService.createPractice(payload);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = this.isEditMode
          ? 'Practice updated successfully!'
          : 'Practice created successfully!';
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = `Failed to ${this.isEditMode ? 'update' : 'create'} practice`;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Suppression ──────────────────────────────────────────────────

  onDeleteConfirm(): void {
    if (!this.practiceId) return;
    this.showDeleteConfirmModal = false;
    this.isLoading = true;

    this.practiceService.deletePractice(this.practiceId).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Practice deleted successfully!';
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to delete practice';
        this.isLoading = false;
        this.showDeleteConfirmModal = false;
        this.cdr.detectChanges();
      },
    });
  }

  onDeleteCancel(): void {
    this.showDeleteConfirmModal = false;
    this.closeModal.emit();
  }

  onSuccessOk(): void {
    this.showSuccessModal = false;
    this.actionCompleted.emit();
    this.closeModal.emit();
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  getUserFullName(u: UserRef): string {
    return `${u.first_name} ${u.last_name}`;
  }

  getFieldError(fieldName: string): string {
    const field = this.practiceForm.get(fieldName);
    if (!field?.touched) return '';
    if (field.hasError('required')) return 'This field is required';
    if (field.hasError('minlength')) return 'Minimum 3 characters required';
    return '';
  }
}