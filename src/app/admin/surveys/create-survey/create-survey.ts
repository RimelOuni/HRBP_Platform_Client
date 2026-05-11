import {
  Component, OnInit, ViewEncapsulation, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { Survey, PracticeRef, UserRef } from '../../../core/models/survey.model';
import { SurveyService }   from '../../../core/services/survey.service';
import { PracticeService } from '../../../core/services/practice.service';
import { UserService }     from '../../../core/services/user.service';

type SurveyTypeOption = Survey['type'];

@Component({
  selector:      'app-create-survey',
  standalone:    true,
  imports:       [CommonModule, FormsModule],
  templateUrl:   './create-survey.html',
  styleUrl:      './create-survey.css',
  encapsulation: ViewEncapsulation.None,
})
export class CreateSurvey implements OnInit {

  // ── Listes ─────────────────────────────────────────────────────────
  practices:     { _id: string; name: string }[] = [];
  googleSurveys: any[] = [];
  loadingList          = false;

  // ── Modal Ajout ────────────────────────────────────────────────────
  showAddModal = false;
  isSaving     = false;
  newSurvey = {
    title:         '',
    googleFormUrl: '',
    type:          'ENGAGEMENT' as SurveyTypeOption,
  };

  // ── Modal Envoi ────────────────────────────────────────────────────
  showSendModal        = false;
  isSending            = false;
  showSendSuccessPopup = false;
  selectedSurvey:      any = null;

  sendConfig = {
    practice:            null as string | null,   // filtre UI seulement (non persisté seul)
    pointsReward:        10,
    newSpecificUserIds:  [] as string[],           // IDs sélectionnés dans CE nouvel envoi
  };

  // ── Sélecteur de destinataires ─────────────────────────────────────
  availableUsers: any[] = [];
  loadingUsers          = false;

  readonly SURVEY_TYPES: SurveyTypeOption[] = [
    'ENGAGEMENT', 'SATISFACTION', 'PULSE', 'MONTHLY', 'QUARTERLY', 'ANNUAL',
  ];

  constructor(
    private surveyService:   SurveyService,
    private practiceService: PracticeService,
    private userService:     UserService,
    private cdr:             ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.practiceService.getAllPractices().subscribe({
      next:  (data) => { this.practices = data; },
      error: (err)  => console.error('Practices load error', err),
    });
    this.loadSurveys();
  }

  // ── Helpers practices ──────────────────────────────────────────────

  /** Retourne le nom d'une practice (objet populé ou ID brut) */
  getPracticeName(practice: any): string {
    if (!practice) return '';
    if (typeof practice === 'object' && practice.name) return practice.name as string;
    const id = typeof practice === 'object' ? practice._id : practice;
    return this.practices.find(p => p._id === id)?.name ?? '';
  }

  /**
   * Retourne les noms de toutes les practices du tableau practices[].
   * Ne retourne jamais d'IDs bruts.
   */
  getPracticesNames(survey: any): string[] {
    const arr: any[] = survey?.practices ?? [];
    return arr
      .map((p: any) => {
        if (typeof p === 'object' && p?.name) return p.name as string;
        const id = typeof p === 'object' ? p?._id : p;
        return this.practices.find(x => x._id === id)?.name ?? null;
      })
      .filter((n): n is string => !!n);
  }

  // ── Helpers specificUserIds ────────────────────────────────────────

  /**
   * Retourne la liste des utilisateurs populés depuis specificUserIds[].
   * Fonctionne que les éléments soient des objets { _id, firstName, ... }
   * ou de simples IDs string.
   */
  getSpecificUsers(survey: any): UserRef[] {
    const arr: any[] = survey?.specificUserIds ?? [];
    return arr
      .map((u: any) => {
        if (typeof u === 'object' && u?.firstName) {
          return { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email } as UserRef;
        }
        return null;
      })
      .filter((u): u is UserRef => u !== null);
  }

  /**
   * Label du chip recipients affiché dans la liste.
   * Affiche le nombre de destinataires — jamais un ID brut.
   */
  getRecipientsLabel(survey: any): string {
    const ids: any[] = survey?.specificUserIds ?? [];
    if (ids.length === 0) return '';
    return `${ids.length} recipient(s)`;
  }

  // ── Chargement ─────────────────────────────────────────────────────

  loadSurveys(): void {
    this.loadingList = true;
    this.surveyService.getAllSurveys().subscribe({
      next: (all: any[]) => {
        this.googleSurveys = all;
        this.loadingList   = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingList = false; },
    });
  }

  // ── Modal Ajout ────────────────────────────────────────────────────

  openAddModal(): void {
    this.newSurvey    = { title: '', googleFormUrl: '', type: 'ENGAGEMENT' };
    this.showAddModal = true;
  }

  closeAddModal(): void { this.showAddModal = false; }

  saveSurvey(): void {
    if (!this.newSurvey.title?.trim())         { alert('Le titre est obligatoire'); return; }
    if (!this.newSurvey.googleFormUrl?.trim()) { alert("L'URL Google Forms est obligatoire"); return; }

    this.isSaving = true;

    const payload = {
      title:           this.newSurvey.title.trim(),
      googleFormUrl:   this.newSurvey.googleFormUrl.trim(),
      type:            this.newSurvey.type,
      target:          'COLLABORATOR',
      practices:       [],
      pointsReward:    10,
      status:          'INACTIVE',
      specificUserIds: [],
    };

    this.surveyService.createSurvey(payload as any).subscribe({
      next: (saved: any) => {
        this.googleSurveys.unshift(saved);
        this.isSaving     = false;
        this.showAddModal = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSaving = false;
        alert('❌ ' + (err.error?.message || 'Erreur lors de la création'));
      },
    });
  }

  // ── Modal Envoi ────────────────────────────────────────────────────

  openSendModal(s: any): void {
    this.selectedSurvey = s;
    this.sendConfig = {
      practice:           null,
      pointsReward:       s.pointsReward || 10,
      newSpecificUserIds: [],
    };
    this.showSendModal = true;
    this.loadCollaborators();
  }

  closeSendModal(): void {
    this.showSendModal  = false;
    this.selectedSurvey = null;
    this.availableUsers = [];
  }

  onPracticeChange(): void {
    this.sendConfig.newSpecificUserIds = [];
    this.loadCollaborators();
  }

  loadCollaborators(): void {
    this.loadingUsers = true;
    this.userService.getUsersByRole('COLLABORATOR', this.sendConfig.practice).subscribe({
      next: (users: any[]) => {
        this.availableUsers = users;
        this.loadingUsers   = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingUsers = false; },
    });
  }

  isUserSelected(userId: string): boolean {
    return this.sendConfig.newSpecificUserIds.includes(userId);
  }

  toggleUser(userId: string): void {
    const idx = this.sendConfig.newSpecificUserIds.indexOf(userId);
    if (idx === -1) this.sendConfig.newSpecificUserIds.push(userId);
    else            this.sendConfig.newSpecificUserIds.splice(idx, 1);
  }

  selectAllUsers(): void {
    // Cocher "tous" = vider la sélection spécifique pour cet envoi
    this.sendConfig.newSpecificUserIds = [];
  }

  get sendingToAll(): boolean {
    return this.sendConfig.newSpecificUserIds.length === 0;
  }

  /**
   * Confirme l'envoi.
   *
   * On envoie au backend :
   *  - practice      : la practice filtrée pour CET envoi (le backend l'ajoute à practices[])
   *  - specificUserIds : les IDs sélectionnés pour CET envoi (le backend les ajoute à specificUserIds[])
   *  - status ACTIVE
   *  - pointsReward
   *
   * Le backend accumule sans écraser → l'historique est préservé.
   */
  confirmSend(): void {
    if (!this.selectedSurvey?._id) return;
    this.isSending = true;

    const payload: any = {
      target:          'COLLABORATOR',
      pointsReward:    Number(this.sendConfig.pointsReward) || 0,
      status:          'ACTIVE',
      // IDs du NOUVEL envoi seulement — le backend accumule
      specificUserIds: this.sendConfig.newSpecificUserIds,
    };

    // Practice du filtre courant (si renseignée)
    if (this.sendConfig.practice) {
      payload.practice = this.sendConfig.practice;
    }

    this.surveyService.updateSurvey(this.selectedSurvey._id, payload).subscribe({
      next: (updated: any) => {
        this.isSending     = false;
        this.showSendModal = false;

        // Remplacer dans la liste locale par la réponse serveur (avec populate complet)
        const idx = this.googleSurveys.findIndex(s => s._id === updated._id);
        if (idx !== -1) this.googleSurveys[idx] = updated;
        else            this.googleSurveys.unshift(updated);

        this.showSendSuccessPopup = true;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSending = false;
        alert('❌ ' + (err.error?.message || "Erreur lors de l'envoi"));
      },
    });
  }

  onSendSuccessOk(): void {
    this.showSendSuccessPopup = false;
    this.selectedSurvey       = null;
    this.cdr.detectChanges();
  }

  // ── Suppression ────────────────────────────────────────────────────

  deleteSurvey(s: any, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer "${s.title || s.type}" ?`)) return;
    this.surveyService.deleteSurvey(s._id).subscribe({
      next: () => {
        this.googleSurveys = this.googleSurveys.filter(x => x._id !== s._id);
        this.cdr.detectChanges();
      },
      error: (err: any) => alert('❌ ' + (err.error?.message || 'Erreur lors de la suppression')),
    });
  }

  // ── Utilitaires UI ─────────────────────────────────────────────────

  typeColor(type: string): string {
    const map: Record<string, string> = {
      ENGAGEMENT:   '#16a34a',
      SATISFACTION: '#0d9488',
      PULSE:        '#7c3aed',
      MONTHLY:      '#ea580c',
      QUARTERLY:    '#0284c7',
      ANNUAL:       '#db2777',
    };
    return map[type] || '#16a34a';
  }

  getInitials(firstName: string, lastName: string): string {
    return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#16a34a','#0d9488','#7c3aed','#ea580c','#0284c7','#db2777','#ca8a04'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}