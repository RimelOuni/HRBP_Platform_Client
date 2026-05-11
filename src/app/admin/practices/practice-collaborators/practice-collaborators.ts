import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PracticeService } from '../../../core/services/practice.service';
import { User } from '../../../core/models/user.model';

// ✅ Définir UserRef localement (compatible avec le service)
interface UserRef {
  _id: string;
  first_name: string;
  last_name: string;
  email?: string;  // optionnel comme dans le service
  role?: string;
}

interface CollaboratorsResponse {
  practiceId: string;
  practiceName: string;
  hrbpList: UserRef[];
  totalCollaborators: number;
  collaborators: User[];
}

@Component({
  selector: 'app-practice-collaborators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './practice-collaborators.html',
  styleUrl: './practice-collaborators.css',
})
export class PracticeCollaborators implements OnInit {
  private practiceService = inject(PracticeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  collaborators: User[] = [];
  filteredCollaborators: User[] = [];
  practiceName: string = '';
  hrbpList: UserRef[] = [];
  currentPracticeId: string = '';

  // Filtres
  searchTerm: string = '';
  selectedHrbpId: string = 'ALL';

  isLoading: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.currentPracticeId = params['id'];
        this.loadCollaborators(params['id']);
      }
    });
  }

  loadCollaborators(practiceId: string, hrbpId?: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.practiceService.getCollaboratorsByPractice(practiceId, hrbpId).subscribe({
      next: (data) => {
        this.collaborators = data.collaborators || [];
        this.hrbpList = data.hrbpList || [];
        this.practiceName = data.practiceName || 'Practice';
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading collaborators:', err);
        this.errorMessage = 'Erreur lors du chargement des collaborateurs';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredCollaborators = this.collaborators.filter((collab) => {
      const matchesSearch =
        !term ||
        (collab?.first_name || '').toLowerCase().includes(term) ||
        (collab?.last_name || '').toLowerCase().includes(term) ||
        (collab?.email || '').toLowerCase().includes(term);

      const matchesHrbp =
        this.selectedHrbpId === 'ALL' ||
        (collab as any)?.ro_id?._id === this.selectedHrbpId ||
        (collab as any)?.ro_id === this.selectedHrbpId;

      return matchesSearch && matchesHrbp;
    });

    this.cdr.detectChanges();
  }

  onSearch(): void { this.applyFilters(); }
  onHrbpFilterChange(): void { this.applyFilters(); }
  onBack(): void { this.router.navigate(['/admin/practices']); }

  getHrbpFullName(h: UserRef): string {
    return `${h.first_name} ${h.last_name}`;
  }

  getStatusLabel(isActive: boolean | null | undefined): string {
    return isActive === true ? 'Actif' : 'Inactif';
  }

  getGradeLabel(grade: string | null | undefined): string {
    if (!grade?.trim()) return '-';
    const map: Record<string, string> = {
      GRADUATE: 'Graduate', JUNIOR: 'Junior', CONFIRMED: 'Confirmé',
      SENIOR: 'Senior', MANAGER: 'Manager', SENIOR_MANAGER: 'Senior Manager',
      DIRECTOR: 'Director', EXPERT: 'Expert',
    };
    return map[grade.toUpperCase().trim()] || grade;
  }

  getRoleLabel(role: string | null | undefined): string {
    if (!role) return 'Collaborateur';
    return role.toUpperCase().trim() === 'HRBP' ? 'HRBP' : 'Collaborateur';
  }

  getRoleClass(role: string | null | undefined): string {
    if (!role) return 'collaborator';
    return role.toUpperCase().trim() === 'HRBP' ? 'hrbp' : 'collaborator';
  }

  formatPrettyDate(dateValue: Date | string | undefined | null): string {
    if (!dateValue) return '-';
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch { return '-'; }
  }

  getInitials(collab: any): string {
    const f = (collab?.first_name?.trim() || '?')[0]?.toUpperCase() ?? '?';
    const l = (collab?.last_name?.trim()  || '?')[0]?.toUpperCase() ?? '?';
    return f + l;
  }

  getFullName(collab: any): string {
    const f = collab?.first_name?.trim() || '';
    const l = collab?.last_name?.trim()  || '';
    return `${f} ${l}`.trim() || '-';
  }

  getEmail(collab: any): string { return collab?.email?.trim() || '-'; }
  getGrade(collab: any): string { return collab?.grade ? this.getGradeLabel(collab.grade) : '-'; }
  getStatus(collab: any): string { return this.getStatusLabel(collab?.is_active); }
}