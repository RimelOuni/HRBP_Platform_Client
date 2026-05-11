import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PointService } from '../../../core/services/point';
import { PracticeService } from '../../../core/services/practice.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-update-point',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-point.html',
  styleUrl: './update-point.css',
})
export class UpdatePoint implements OnInit {

  users: any[] = [];
  practices: any[] = [];
  isSubmitting = false;
  isLoading = true;
  errorMessage = '';
  pointId = '';

  // ── Title subjects grouped by category (same as action categories) ──
  titleCategories = [
    {
      category: '🧑‍💼 Carrière & Développement',
      subjects: [
        'Entretien annuel d\'évaluation',
        'Entretien de mi-année',
        'Plan de développement individuel',
        'Bilan de compétences',
        'Suivi de formation',
        'Mobilité interne',
        'Promotion & évolution de carrière',
        'Objectifs & KPIs',
      ]
    },
    {
      category: '❤️ Bien-être & RPS',
      subjects: [
        'Suivi bien-être collaborateur',
        'Gestion du stress & charge de travail',
        'Risques psychosociaux (RPS)',
        'Absentéisme & presentéisme',
        'Qualité de vie au travail (QVT)',
        'Médiation / Conflit d\'équipe',
      ]
    },
    {
      category: '📋 Administratif & RH',
      subjects: [
        'Renouvellement de contrat',
        'Période d\'essai',
        'Gestion des congés & absences',
        'Régularisation administrative',
        'Mise à jour du dossier RH',
        'Rupture conventionnelle',
        'Démission / Départ',
      ]
    },
    {
      category: '🤝 Intégration & Onboarding',
      subjects: [
        'Suivi d\'intégration nouveau collaborateur',
        'Point onboarding J+30',
        'Point onboarding J+60',
        'Point onboarding J+90',
        'Parrainage & mentoring',
      ]
    },
    {
      category: '📊 Performance & Suivi',
      subjects: [
        'Suivi des objectifs',
        'Point de performance trimestriel',
        'Plan d\'amélioration de la performance (PIP)',
        'Feedback 360°',
        'Revue de talent',
      ]
    },
    {
      category: '🔧 Organisation & Équipe',
      subjects: [
        'Réorganisation d\'équipe',
        'Changement de manager',
        'Gestion de conflit',
        'Communication interne',
        'Réunion d\'équipe RH',
      ]
    },
  ];

  form = {
    titre: '',
    date: '',
    description: '',
    collaborateur: '',
    invite: '',
    criticite: '',
    duree_estimee: '',
    frequence: '',
    practice_id: '',
    status: '',
  };

  constructor(
    private pointService: PointService,
    private userService: UserService,
    private practiceService: PracticeService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.pointId = this.route.snapshot.paramMap.get('id') || '';
    this.loadUsers();
    this.loadPractices();
    this.loadPoint();
  }

  loadPoint() {
    if (!this.pointId) {
      this.errorMessage = 'Identifiant du point introuvable.';
      this.isLoading = false;
      return;
    }

    this.pointService.getPointById(this.pointId).subscribe({
      next: (res: any) => {
        const point = res.data || res;

        const rawDate = point.date ? new Date(point.date) : null;
        const formattedDate = rawDate ? rawDate.toISOString().substring(0, 10) : '';

        this.form = {
          titre:        point.titre        || '',
          date:         formattedDate,
          description:  point.description  || '',
          collaborateur: point.collaborateur?._id || point.collaborateur || '',
          invite:       point.invite?._id  || (Array.isArray(point.invite) && point.invite[0]?._id) || point.invite || '',
          criticite:    point.criticite    || '',
          duree_estimee: point.duree_estimee || '',
          frequence:    point.frequence    || '',
          practice_id:  point.practice_id?._id || point.practice_id || '',
          status:       point.status       || 'En attente',
        };

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Impossible de charger le point.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (res: any) => { this.users = res.data || res; this.cdr.detectChanges(); },
      error: (err: any) => { console.error('Error loading users:', err); }
    });
  }

  loadPractices() {
    this.practiceService.getAllPractices().subscribe({
      next: (res: any) => { this.practices = res.data || res; this.cdr.detectChanges(); },
      error: (err: any) => { console.error('Error loading practices:', err); }
    });
  }

  // ── Auto-update status when date changes ──
  onDateChange() {
    if (!this.form.date) return;

    const selected = new Date(this.form.date);
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);

    if (selected > today) {
      this.form.status = 'Reporté';
    } else if (selected.getTime() === today.getTime()) {
      this.form.status = 'En cours';
    } else {
      this.form.status = 'Terminé';
    }

    this.cdr.detectChanges();
  }

  onSubmit() {
    if (!this.form.titre || !this.form.date) {
      this.errorMessage = 'Le titre et la date sont obligatoires.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: any = { ...this.form };
    if (!payload.collaborateur) delete payload.collaborateur;
    if (!payload.invite)        delete payload.invite;
    if (!payload.practice_id)   delete payload.practice_id;

    this.pointService.updatePoint(this.pointId, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/hrbp/points', this.pointId]);
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCancel() {
    this.router.navigate(['/hrbp/points', this.pointId]);
  }
}
