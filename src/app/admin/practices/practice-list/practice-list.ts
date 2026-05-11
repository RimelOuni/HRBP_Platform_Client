// components/practice-list/practice-list.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { PracticeService } from '../../../core/services/practice.service';
import { Practice, UserRef } from '../../../core/models/practice.model';
import { PracticeForm } from '../practice-form/practice-form';
import { HrbpDetailModal } from '../hrbp-detail-modal/hrbp-detail-modal';

@Component({
  selector: 'app-practice-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PracticeForm, HrbpDetailModal],
  templateUrl: './practice-list.html',
  styleUrls: ['./practice-list.css'],
})
export class PracticeList implements OnInit {
  private practiceService = inject(PracticeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  practices: Practice[] = [];
  filteredPractices: Practice[] = [];

  searchQuery: string = '';
  selectedStatus: string = 'ALL';

  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  showModal: boolean = false;
  selectedPracticeId: string | null = null;

  showDeleteModal: boolean = false;
  practiceToDelete: string | null = null;

  // Pour la vue HRBP
  showHrbpModal: boolean = false;
  selectedHrbp: UserRef | null = null;
  selectedPracticeForHrbp: Practice | null = null;

  ngOnInit(): void {
    this.loadPractices();
  }

  private loadPractices(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.practiceService.getAllPractices().subscribe({
      next: (data) => {
        this.practices = data;
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading practices:', err);
        this.hasError = true;
        this.errorMessage = 'Failed to load practices. Please try again later.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyFilters(): void {
    this.filteredPractices = this.practices.filter((p) => {
      return this.matchesSearchQuery(p) && this.matchesStatusFilter(p);
    });
    this.cdr.detectChanges();
  }

  private matchesSearchQuery(practice: Practice): boolean {
    if (!this.searchQuery.trim()) return true;
    const q = this.searchQuery.toLowerCase().trim();
    const name = practice.name.toLowerCase();
    const hrbpNames = this.getHrbpNames(practice).toLowerCase();
    return name.includes(q) || hrbpNames.includes(q);
  }

  private matchesStatusFilter(practice: Practice): boolean {
    if (this.selectedStatus === 'ALL') return true;
    return practice.status === this.selectedStatus;
  }

  onSearchChange(): void { this.applyFilters(); }
  onStatusFilterChange(): void { this.applyFilters(); }

  onCreatePractice(): void {
    this.selectedPracticeId = null;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  onEditPractice(practiceId: string): void {
    this.selectedPracticeId = practiceId;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  onDeletePractice(practiceId: string): void {
    this.practiceToDelete = practiceId;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  onModalClose(): void {
    this.showModal = false;
    this.selectedPracticeId = null;
    this.cdr.detectChanges();
  }

  onDeleteModalClose(): void {
    this.showDeleteModal = false;
    this.practiceToDelete = null;
    this.cdr.detectChanges();
  }

  onActionCompleted(): void {
    this.loadPractices();
    this.showModal = false;
    this.showDeleteModal = false;
    this.selectedPracticeId = null;
    this.practiceToDelete = null;
    this.cdr.detectChanges();
  }

  getHrbpNames(practice: Practice): string {
    if (!practice.hrbp || practice.hrbp.length === 0) return '-';
    return practice.hrbp
      .map(h => `${h.first_name} ${h.last_name}`)
      .join(', ');
  }

  getHrbpList(practice: Practice): UserRef[] {
    return practice.hrbp || [];
  }

  // ✅ CORRECTION : accepte le MouseEvent pour stopper la propagation
  onHrbpClick(hrbp: UserRef, practice: Practice, event: MouseEvent): void {
    event.stopPropagation(); // empêche le clic de remonter sur la <tr>
    this.selectedHrbp = hrbp;
    this.selectedPracticeForHrbp = practice;
    this.showHrbpModal = true;
    this.cdr.detectChanges();
  }

  onHrbpModalClose(): void {
    this.showHrbpModal = false;
    this.selectedHrbp = null;
    this.selectedPracticeForHrbp = null;
    this.cdr.detectChanges();
  }

  onHrbpActionCompleted(): void {
    this.showHrbpModal = false;
    this.selectedHrbp = null;
    this.selectedPracticeForHrbp = null;
    this.loadPractices();
    this.cdr.detectChanges();
  }

  onViewCollaborators(practiceId: string): void {
    this.router.navigate(['/admin/practices', practiceId, 'collaborators']);
  }

  onViewProjects(practiceId: string): void {
    this.router.navigate(['/admin/practices', practiceId, 'projects']);
  }

  getManagerName(practice: Practice): string {
    if (!practice.manager) return '-';
    return `${practice.manager.first_name} ${practice.manager.last_name}`;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Active' : 'Inactive';
  }

  getStatusClass(status: string): string {
    return status === 'ACTIVE' ? 'status-active' : 'status-inactive';
  }

  getTotalPractices(): number {
    return this.practices.length;
  }

  getFilteredPractices(): number {
    return this.filteredPractices.length;
  }

  hasNoResults(): boolean {
    return !this.isLoading && this.filteredPractices.length === 0;
  }
}