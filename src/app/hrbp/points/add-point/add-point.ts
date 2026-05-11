import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PointService } from '../../../core/services/point';
import { PracticeService } from '../../../core/services/practice.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-add-point',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-point.html',
  styleUrl: './add-point.css',
})
export class AddPoint implements OnInit {

  hrbp: any = null;
  hrbpPractices: any[] = [];
  practiceMembers: any[] = [];
  allCollaborators: any[] = [];
  isSubmitting = false;
  isLoading = true;
  errorMessage = '';

  form = {
    date: '',
    invite: [] as string[],
    practice_id: '',
    duree_estimee: '',
    frequence: '',
  };

  constructor(
    private pointService: PointService,
    private userService: UserService,
    private practiceService: PracticeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    const currentUser = this.authService.getUser();
    if (!currentUser?.id) {
      this.errorMessage = 'Utilisateur non authentifié';
      this.isLoading = false;
      return;
    }

    forkJoin({
      hrbp: this.userService.getUserById(currentUser.id).pipe(
        catchError(err => {
          console.error('Error loading HRBP:', err);
          return of(null);
        })
      ),
      practices: this.practiceService.getAllPractices().pipe(
        catchError(err => {
          console.error('Error loading practices:', err);
          return of([]);
        })
      ),
      collaborators: this.userService.getCollaboratorsOfHrbp(currentUser.id).pipe(
        catchError(err => {
          console.error('Error loading collaborators:', err);
          return of([]);
        })
      )
    }).subscribe({
      next: (results) => {
        console.log('All data loaded:', results);

        this.hrbp = results.hrbp;

        if (results.hrbp?.practice_id) {
          const hrbpPracticeIds = Array.isArray(results.hrbp.practice_id)
            ? results.hrbp.practice_id.map((p: any) => p._id || p.toString())
            : [results.hrbp.practice_id._id || results.hrbp.practice_id.toString()];

          this.hrbpPractices = (results.practices as any[]).filter((p: any) =>
            hrbpPracticeIds.includes(p._id?.toString())
          );

          if (Array.isArray(results.hrbp.practice_id) && typeof results.hrbp.practice_id[0] === 'object') {
            this.hrbpPractices = results.hrbp.practice_id;
          }
        }

        this.allCollaborators = results.collaborators as any[];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.errorMessage = 'Erreur lors du chargement des données';
        this.isLoading = false;
      }
    });
  }

  onPracticeChange() {
    if (!this.form.practice_id) {
      this.practiceMembers = [];
      return;
    }

    this.practiceMembers = this.allCollaborators.filter((member: any) => {
      const memberPractices = Array.isArray(member.practice_id)
        ? member.practice_id
        : [member.practice_id];

      const isInPractice = memberPractices.some((p: any) => {
        const practiceId = p._id || p;
        return practiceId?.toString() === this.form.practice_id;
      });

      const isNotHrbp = member._id !== this.hrbp?._id;

      return isInPractice && isNotHrbp;
    });

    this.form.invite = [];
  }

  toggleInvite(memberId: string) {
    const index = this.form.invite.indexOf(memberId);
    if (index > -1) {
      this.form.invite.splice(index, 1);
    } else {
      this.form.invite.push(memberId);
    }
  }

  isInvited(memberId: string): boolean {
    return this.form.invite.includes(memberId);
  }

  onSubmit() {
    if (!this.form.date) {
      this.errorMessage = 'La date est obligatoire.';
      return;
    }

    if (!this.form.practice_id) {
      this.errorMessage = 'Veuillez sélectionner une practice.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const currentUser = this.authService.getUser();

    const payload: any = {
      date: this.form.date,
      practice_id: this.form.practice_id,
      duree_estimee: this.form.duree_estimee,
      frequence: this.form.frequence,
      collaborateur: currentUser?.id,
      invite: this.form.invite.length > 0 ? this.form.invite : undefined,
      titre: `Point de suivi - ${this.hrbp?.first_name || ''} ${this.hrbp?.last_name || ''} - ${new Date(this.form.date).toLocaleString('fr-FR')}`
    };

    this.pointService.createPoint(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/hrbp/points']);
      },
      error: (err: any) => {
        console.error('Error creating point:', err);
        this.errorMessage = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.isSubmitting = false;
      }
    });
  }

  getHrbpFullName(): string {
    if (!this.hrbp) return 'Chargement...';
    const first = this.hrbp.first_name || '';
    const last = this.hrbp.last_name || '';
    return (first + ' ' + last).trim() || 'HRBP';
  }

  getHrbpInitials(): string {
    if (!this.hrbp) return 'HR';
    const first = this.hrbp.first_name?.[0] || 'H';
    const last = this.hrbp.last_name?.[0] || 'R';
    return (first + last).toUpperCase();
  }

  getInitials(member: any): string {
    const first = member?.first_name?.[0] || '';
    const last = member?.last_name?.[0] || '';
    return (first + last).toUpperCase();
  }

  getAvatarColor(id: string): string {
    const colors = [
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #06b6d4, #0891b2)',
    ];
    let hash = 0;
    for (let i = 0; i < id?.length || 0; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  onCancel() {
    this.router.navigate(['/hrbp/points']);
  }
}
