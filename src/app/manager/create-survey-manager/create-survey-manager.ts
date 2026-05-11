// create-survey-manager.component.ts — VERSION AMÉLIORÉE PREMIUM

import {
  Component, OnInit, ViewEncapsulation, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { Survey, UserRef } from '../../core/models/survey.model';
import { SurveyService }   from '../../core/services/survey.service';
import { UserService }     from '../../core/services/user.service';
import { AuthService }     from '../../auth/auth.service';

type SurveyTypeOption = Survey['type'];
type SendMode = 'ALL' | 'SELECTED';

@Component({
  selector:      'app-create-survey-manager',
  standalone:    true,
  imports:       [CommonModule, FormsModule],
  templateUrl:   './create-survey-manager.html',
  styleUrl:      './create-survey-manager.css',
  encapsulation: ViewEncapsulation.None,
})
export class CreateSurveyManager implements OnInit {

  managerSurveys: any[] = [];
  loadingList = false;

  showAddModal = false;
  isSaving     = false;
  newSurvey = {
    title:         '',
    googleFormUrl: '',
    type:          'ENGAGEMENT' as SurveyTypeOption,
  };

  showSendModal        = false;
  isSending            = false;
  showSendSuccessPopup = false;
  selectedSurvey: any  = null;

  sendMode: SendMode = 'ALL';

  sendConfig = {
    pointsReward:       10,
    newSpecificUserIds: [] as string[],
  };

  availableUsers: any[] = [];
  loadingUsers          = false;
  managerPracticeName   = '';
  managerPracticeId: string | null = null;

  lastSendResult: { mode: SendMode; count: number } | null = null;

  readonly SURVEY_TYPES: SurveyTypeOption[] = [
    'ENGAGEMENT', 'SATISFACTION', 'PULSE', 'MONTHLY', 'QUARTERLY', 'ANNUAL',
  ];

  constructor(
    private surveyService: SurveyService,
    private userService:   UserService,
    private authService:   AuthService,
    private cdr:           ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadManagerInfo();
    this.loadManagerSurveys();
  }

  loadManagerInfo(): void {
    const currentUser = this.authService.getUser();
    console.log('[Manager] currentUser:', currentUser);

    if (!currentUser) return;

    const practiceArr = currentUser.practice_id ?? currentUser.practiceId ?? [];

    if (practiceArr.length > 0) {
      const practice = practiceArr[0];

      if (typeof practice === 'object' && practice !== null) {
        this.managerPracticeId   = practice._id?.toString() ?? practice.id?.toString() ?? null;
        this.managerPracticeName = practice.name ?? 'Your Practice';
      } else {
        this.managerPracticeId   = practice.toString();
        this.managerPracticeName = 'Your Practice';
      }
    }

    console.log('[Manager] practiceId:', this.managerPracticeId, '| practiceName:', this.managerPracticeName);
  }

  loadManagerSurveys(): void {
    this.loadingList = true;
    this.surveyService.getManagerSurveys().subscribe({
      next: (surveys: any[]) => {
        this.managerSurveys = surveys;
        this.loadingList    = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingList = false; },
    });
  }

  getPracticesNames(survey: any): string[] {
    const arr: any[] = survey?.practices ?? [];
    return arr
      .map((p: any) => (typeof p === 'object' && p?.name ? p.name as string : null))
      .filter((n): n is string => !!n);
  }

  getSpecificUsers(survey: any): UserRef[] {
    if (!survey?.specificUserIds) return [];
    return (survey.specificUserIds as any[])
      .map((u: any) => {
        if (typeof u === 'object' && u?.firstName) {
          return {
            _id:       u._id.toString(),
            firstName: u.firstName,
            lastName:  u.lastName,
            email:     u.email,
          } as UserRef;
        }
        return null;
      })
      .filter((u): u is UserRef => u !== null);
  }

  getRecipientsCount(survey: any): number {
    return this.getSpecificUsers(survey).length;
  }

  getSurveyAudienceLabel(survey: any): { label: string; type: 'all' | 'selected' | 'draft' } {
    if (survey.status === 'INACTIVE') return { label: 'Draft', type: 'draft' };
    const count = this.getRecipientsCount(survey);
    if (count === 0) return { label: 'All collaborators', type: 'all' };
    return { label: `${count} recipient${count > 1 ? 's' : ''}`, type: 'selected' };
  }

  hasSpecificRecipients(survey: any): boolean {
    return this.getRecipientsCount(survey) > 0;
  }

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
      title:         this.newSurvey.title.trim(),
      googleFormUrl: this.newSurvey.googleFormUrl.trim(),
      type:          this.newSurvey.type,
      pointsReward:  10,
      status:        'INACTIVE',
    };

    this.surveyService.createSurveyAsManager(payload as any).subscribe({
      next: (saved: any) => {
        this.managerSurveys.unshift(saved);
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

  openSendModal(s: any): void {
    this.selectedSurvey = s;
    this.sendMode = this.hasSpecificRecipients(s) ? 'SELECTED' : 'ALL';
    this.sendConfig = {
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
    this.sendMode       = 'ALL';
    this.sendConfig.newSpecificUserIds = [];
  }

  loadCollaborators(): void {
    this.loadingUsers = true;

    if (!this.managerPracticeId) {
      this.userService.getCurrentUser().subscribe({
        next: (user: any) => {
          const practice = user.practice_id?.[0];
          if (practice) {
            this.managerPracticeId   = typeof practice === 'object' ? practice._id : practice;
            this.managerPracticeName = typeof practice === 'object' ? practice.name : 'Your Practice';
          }
          if (this.managerPracticeId) {
            this._fetchCollaborators();
          } else {
            console.error('Aucun practice trouvé même depuis /user/me');
            this.loadingUsers = false;
            this.cdr.detectChanges();
          }
        },
        error: () => { this.loadingUsers = false; }
      });
      return;
    }

    this._fetchCollaborators();
  }

  private _fetchCollaborators(): void {
    this.userService.getUsersByPractice(this.managerPracticeId!).subscribe({
      next: (users: any[]) => {
        console.log('[_fetchCollaborators] users:', users.length);
        if (this.hasSpecificRecipients(this.selectedSurvey)) {
          const existingIds = new Set(this.getSpecificUsers(this.selectedSurvey).map(u => u._id));
          this.availableUsers = users.filter(u => !existingIds.has(u._id));
        } else {
          this.availableUsers = users;
        }
        this.loadingUsers = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[_fetchCollaborators] error:', err);
        this.loadingUsers = false;
        this.cdr.detectChanges();
      }
    });
  }

  setSendMode(mode: SendMode): void {
    this.sendMode = mode;
    if (mode === 'ALL') this.sendConfig.newSpecificUserIds = [];
    this.cdr.detectChanges();
  }

  isUserSelected(userId: string): boolean {
    return this.sendConfig.newSpecificUserIds.includes(userId);
  }

  toggleUser(userId: string): void {
    if (this.sendMode === 'ALL') this.sendMode = 'SELECTED';
    const idx = this.sendConfig.newSpecificUserIds.indexOf(userId);
    if (idx === -1) this.sendConfig.newSpecificUserIds.push(userId);
    else            this.sendConfig.newSpecificUserIds.splice(idx, 1);
    if (this.sendConfig.newSpecificUserIds.length === 0) this.sendMode = 'ALL';
    this.cdr.detectChanges();
  }

  getSelectedCount(): number   { return this.sendConfig.newSpecificUserIds.length; }
  getTotalCollaborators(): number {
    return this.availableUsers.length + this.getRecipientsCount(this.selectedSurvey);
  }

  canConfirmSend(): boolean {
    if (this.isSending) return false;
    if (this.sendMode === 'ALL') return true;
    return this.sendConfig.newSpecificUserIds.length > 0;
  }

  confirmSend(): void {
    if (!this.selectedSurvey?._id || !this.canConfirmSend()) return;
    this.isSending = true;

    const payload: any = {
      target:       'COLLABORATOR',
      pointsReward: Number(this.sendConfig.pointsReward) || 0,
      status:       'ACTIVE',
      specificUserIds: this.sendMode === 'SELECTED' && this.sendConfig.newSpecificUserIds.length > 0
        ? this.sendConfig.newSpecificUserIds
        : [],
    };

    this.lastSendResult = {
      mode:  this.sendMode,
      count: this.sendConfig.newSpecificUserIds.length,
    };

    this.surveyService.updateSurveyAsManager(this.selectedSurvey._id, payload).subscribe({
      next: (updated: any) => {
        this.isSending     = false;
        this.showSendModal = false;
        const idx = this.managerSurveys.findIndex(s => s._id === updated._id);
        if (idx !== -1) this.managerSurveys[idx] = updated;
        else            this.managerSurveys.unshift(updated);
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
    this.lastSendResult       = null;
    this.sendMode             = 'ALL';
    this.cdr.detectChanges();
  }

  deleteSurvey(s: any, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer "${s.title || s.type}" ?`)) return;
    this.surveyService.deleteSurveyAsManager(s._id).subscribe({
      next: () => {
        this.managerSurveys = this.managerSurveys.filter(x => x._id !== s._id);
        this.cdr.detectChanges();
      },
      error: (err: any) => alert('❌ ' + (err.error?.message || 'Erreur lors de la suppression')),
    });
  }

  typeColor(type: string): string {
    const map: Record<string, string> = {
      ENGAGEMENT:   '#059669',
      SATISFACTION: '#0891b2',
      PULSE:        '#7c3aed',
      MONTHLY:      '#ca8a04',
      QUARTERLY:    '#2563eb',
      ANNUAL:       '#db2777',
    };
    return map[type] || '#059669';
  }

  getInitials(firstName: string, lastName: string): string {
    return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#059669','#0891b2','#7c3aed','#ca8a04','#2563eb','#db2777','#6366f1'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}