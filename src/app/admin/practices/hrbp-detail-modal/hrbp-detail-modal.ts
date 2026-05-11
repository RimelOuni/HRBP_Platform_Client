// hrbp-detail-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PracticeService } from '../../../core/services/practice.service';
import { Practice, UserRef } from '../../../core/models/practice.model';

interface Collaborator {
  _id:        string;
  first_name: string;
  last_name:  string;
  email:      string;
  grade:      string;
  is_active:  boolean;
  date_entree: Date;
  ro_id?:     string | null;
}

interface Manager {
  _id:        string;
  first_name: string;
  last_name:  string;
  email:      string;
  grade:      string;
  is_active:  boolean;
  date_entree: Date;
  ro_id?:     string | null;
}

@Component({
  selector: 'app-hrbp-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hrbp-detail-modal.html',
  styleUrls: ['./hrbp-detail-modal.css'],
})
export class HrbpDetailModal implements OnInit {
  @Input() practice!: Practice;
  @Input() hrbp!: UserRef;
  @Output() closeModal      = new EventEmitter<void>();
  @Output() actionCompleted = new EventEmitter<void>();

  private practiceService = inject(PracticeService);
  private cdr             = inject(ChangeDetectorRef);

  collaborators:           Collaborator[] = [];
  filteredCollaborators:   Collaborator[] = [];
  unassignedCollaborators: Collaborator[] = [];

  managers:           Manager[] = [];
  filteredManagers:   Manager[] = [];
  unassignedManagers: Manager[] = [];

  isLoading    = false;
  hasError     = false;
  errorMessage = '';

  showAddCollaboratorsModal = false;
  showAddManagersModal      = false;

  selectedCollaboratorIds: string[] = [];
  selectedManagerIds:      string[] = [];

  searchCollaborators = '';
  searchManagers      = '';

  activeTab: 'collaborators' | 'managers' = 'collaborators';

  ngOnInit(): void {
    this.loadAll();
  }

  // ── Chargement principal ─────────────────────────────────────────
  private loadAll(): void {
    this.isLoading = true;
    this.hasError  = false;
    this.cdr.detectChanges();

    this.practiceService
      .getCollaboratorsByPracticeAndHrbp(this.practice._id, this.hrbp._id)
      .subscribe({
        next: (data) => {
          this.collaborators = data.collaborators || [];
          this.managers      = data.managers      || [];
          this.applyCollaboratorFilter();
          this.applyManagerFilter();
          this.isLoading = false;
          this.cdr.detectChanges();
          this.loadUnassigned();
        },
        error: (err) => {
          console.error(err);
          this.hasError     = true;
          this.errorMessage = 'Failed to load data.';
          this.isLoading    = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Chargement des non-assignés ──────────────────────────────────
  private loadUnassigned(): void {
    // Collaborateurs non assignés à CET HRBP
    this.practiceService.getCollaboratorsByPractice(this.practice._id).subscribe({
      next: (data) => {
        const assignedIds = new Set(this.collaborators.map(c => c._id));
        this.unassignedCollaborators = (data.collaborators || []).filter(
          (c: any) => !assignedIds.has(c._id)
        );
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });

    // ✅ CORRECTION : récupérer TOUS les managers de la practice,
    // puis exclure uniquement ceux déjà assignés à CET HRBP spécifique.
    // Ne pas filtrer sur ro_id car ro_id = practice_id (pas hrbp_id).
    this.practiceService.getManagersByPractice(this.practice._id).subscribe({
      next: (data) => {
        console.log('ALL MANAGERS FROM API:', data.managers);

        // Les managers déjà assignés à CET HRBP
        const assignedManagerIds = new Set(this.managers.map(m => m._id));

        // ✅ On exclut seulement ceux déjà dans la liste de CET HRBP
        this.unassignedManagers = (data.managers || []).filter(
          (m: Manager) => !assignedManagerIds.has(m._id)
        );

        console.log('ASSIGNED MANAGER IDs:', [...assignedManagerIds]);
        console.log('UNASSIGNED MANAGERS:', this.unassignedManagers);
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  // ── Filtres ──────────────────────────────────────────────────────
  private applyCollaboratorFilter(): void {
    const q = this.searchCollaborators.toLowerCase().trim();
    this.filteredCollaborators = !q
      ? [...this.collaborators]
      : this.collaborators.filter(c =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
    this.cdr.detectChanges();
  }

  private applyManagerFilter(): void {
    const q = this.searchManagers.toLowerCase().trim();
    this.filteredManagers = !q
      ? [...this.managers]
      : this.managers.filter(m =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
    this.cdr.detectChanges();
  }

  onCollaboratorSearchChange(): void { this.applyCollaboratorFilter(); }
  onManagerSearchChange():      void { this.applyManagerFilter(); }

  setTab(tab: 'collaborators' | 'managers'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // ── Collaborateurs — ajout ───────────────────────────────────────
  onAddCollaborators(): void {
    this.selectedCollaboratorIds   = [];
    this.showAddCollaboratorsModal = true;
    this.cdr.detectChanges();
  }

  onAddCollaboratorsModalClose(): void {
    this.showAddCollaboratorsModal = false;
    this.selectedCollaboratorIds   = [];
    this.cdr.detectChanges();
  }

  onCollaboratorSelected(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedCollaboratorIds.includes(id)) this.selectedCollaboratorIds.push(id);
    } else {
      this.selectedCollaboratorIds = this.selectedCollaboratorIds.filter(x => x !== id);
    }
    this.cdr.detectChanges();
  }

  isCollaboratorSelected(id: string): boolean {
    return this.selectedCollaboratorIds.includes(id);
  }

  selectAllCollaborators(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedCollaboratorIds = checked
      ? this.unassignedCollaborators.map(c => c._id)
      : [];
    this.cdr.detectChanges();
  }

  isAllCollaboratorsSelected(): boolean {
    return this.unassignedCollaborators.length > 0 &&
           this.selectedCollaboratorIds.length === this.unassignedCollaborators.length;
  }

  isSomeCollaboratorsSelected(): boolean {
    return this.selectedCollaboratorIds.length > 0 &&
           this.selectedCollaboratorIds.length < this.unassignedCollaborators.length;
  }

  onConfirmAddCollaborators(): void {
    if (!this.selectedCollaboratorIds.length) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    this.practiceService
      .addCollaboratorsToHrbp(this.practice._id, this.hrbp._id, this.selectedCollaboratorIds)
      .subscribe({
        next: () => {
          this.isLoading                = false;
          this.showAddCollaboratorsModal = false;
          this.selectedCollaboratorIds   = [];
          this.loadAll();
        },
        error: (err) => {
          console.error(err);
          this.hasError     = true;
          this.errorMessage = 'Failed to add collaborators.';
          this.isLoading    = false;
          this.cdr.detectChanges();
        },
      });
  }

  onRemoveCollaborator(id: string): void {
    if (!confirm('Retirer ce collaborateur de cet HRBP ?')) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    this.practiceService
      .removeCollaboratorsFromHrbp(this.practice._id, this.hrbp._id, [id])
      .subscribe({
        next: () => { this.isLoading = false; this.loadAll(); },
        error: (err) => {
          console.error(err);
          this.hasError     = true;
          this.errorMessage = 'Failed to remove collaborator.';
          this.isLoading    = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Managers — ajout ─────────────────────────────────────────────
  onAddManagers(): void {
    this.selectedManagerIds   = [];
    this.showAddManagersModal = true;
    this.cdr.detectChanges();
  }

  onAddManagersModalClose(): void {
    this.showAddManagersModal = false;
    this.selectedManagerIds   = [];
    this.cdr.detectChanges();
  }

  onManagerSelected(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedManagerIds.includes(id)) this.selectedManagerIds.push(id);
    } else {
      this.selectedManagerIds = this.selectedManagerIds.filter(x => x !== id);
    }
    this.cdr.detectChanges();
  }

  isManagerSelected(id: string): boolean {
    return this.selectedManagerIds.includes(id);
  }

  selectAllManagers(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedManagerIds = checked
      ? this.unassignedManagers.map(m => m._id)
      : [];
    this.cdr.detectChanges();
  }

  isAllManagersSelected(): boolean {
    return this.unassignedManagers.length > 0 &&
           this.selectedManagerIds.length === this.unassignedManagers.length;
  }

  isSomeManagersSelected(): boolean {
    return this.selectedManagerIds.length > 0 &&
           this.selectedManagerIds.length < this.unassignedManagers.length;
  }

  onConfirmAddManagers(): void {
    if (!this.selectedManagerIds.length) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    this.practiceService
      .addManagersToHrbp(this.practice._id, this.hrbp._id, this.selectedManagerIds)
      .subscribe({
        next: () => {
          this.isLoading           = false;
          this.showAddManagersModal = false;
          this.selectedManagerIds   = [];
          this.loadAll();
        },
        error: (err) => {
          console.error(err);
          this.hasError     = true;
          this.errorMessage = 'Failed to add managers.';
          this.isLoading    = false;
          this.cdr.detectChanges();
        },
      });
  }

  onRemoveManager(id: string): void {
    if (!confirm('Retirer ce manager de cet HRBP ?')) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    this.practiceService
      .removeManagersFromHrbp(this.practice._id, this.hrbp._id, [id])
      .subscribe({
        next: () => { this.isLoading = false; this.loadAll(); },
        error: (err) => {
          console.error(err);
          this.hasError     = true;
          this.errorMessage = 'Failed to remove manager.';
          this.isLoading    = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  getHrbpFullName(): string { return `${this.hrbp.first_name} ${this.hrbp.last_name}`; }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'N/A'; }
  }

  hasNoCollaborators(): boolean { return !this.isLoading && this.filteredCollaborators.length === 0; }
  hasNoManagers():      boolean { return !this.isLoading && this.filteredManagers.length === 0; }

  onClose(): void { this.closeModal.emit(); }
}