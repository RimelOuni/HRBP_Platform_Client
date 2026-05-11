import {
  Component, OnInit, inject,
  ChangeDetectorRef, ViewEncapsulation,
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SurveyService }   from '../../../core/services/survey.service';
import { PracticeService } from '../../../core/services/practice.service';
import {
  Survey, BadgeDefinition,
  SurveyAnswerResult,
} from '../../../core/models/survey.model';

@Component({
  selector:      'app-my-surveys',
  standalone:    true,
  imports:       [CommonModule, FormsModule],
  templateUrl:   './my-surveys.html',
  styleUrls:     ['./my-surveys.css'],
  encapsulation: ViewEncapsulation.None,
})
export class MySurveys implements OnInit {
  private surveyService   = inject(SurveyService);
  private practiceService = inject(PracticeService);
  private sanitizer       = inject(DomSanitizer);
  private cdr             = inject(ChangeDetectorRef);

  surveys:   Survey[] = [];
  practices: { _id: string; name: string }[] = [];

  loading = true;
  error   = '';

  selectedSurvey: Survey | null = null;
  isSubmitting    = false;

  showSuccessModal = false;
  lastResult:       SurveyAnswerResult | null = null;

  showBadgeModal  = false;
  badgeQueue:      BadgeDefinition[] = [];
  currentBadgeIdx = 0;

  ngOnInit(): void {
    this.practiceService.getAllPractices().subscribe({
      next:  (d) => { this.practices = d; this.loadSurveys(); },
      error: ()  => { this.error = 'Error loading practices.'; this.loading = false; },
    });
  }

  loadSurveys(): void {
    this.loading = true;
    this.surveyService.getSurveysForUser().subscribe({
      next: (res) => {
        this.surveys = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error   = 'Error loading surveys.';
        this.loading = false;
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  getGoogleFormUrl(s: Survey): string {
    return (s as any).googleFormUrl ?? '';
  }

  getPracticeName(s: Survey): string {
    const p = s.practices?.[0];
    if (!p) return 'All';
    if (typeof p === 'object') return (p as any).name ?? 'Unknown';
    return this.practices.find(x => x._id === p)?.name ?? 'Unknown';
  }

  getSurveyLabel(s: Survey): string {
    return (s as any).title || `${s.type} Survey`;
  }

  // ── Navigation ──────────────────────────────────────────────────────

  openSurvey(s: Survey): void  { this.selectedSurvey = s; }
  closeSurvey(): void          { this.selectedSurvey = null; }

  // ── Google Form ──────────────────────────────────────────────────────

  getEmbedUrl(url: string): SafeResourceUrl {
    if (!url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    let embedUrl = url;
    if (url.includes('/viewform')) {
      embedUrl = url.replace('/viewform', '/viewform?embedded=true');
    } else if (!url.includes('embedded=true')) {
      embedUrl = url + (url.includes('?') ? '&' : '?') + 'embedded=true';
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  validateGoogleForm(): void {
    if (!this.selectedSurvey?._id || this.isSubmitting) return;
    this.isSubmitting = true;
    const surveyId    = this.selectedSurvey._id;

    this.surveyService.completeGoogleSurvey(surveyId).subscribe({
      next: (result) => {
        this.surveys        = this.surveys.filter((s) => s._id !== surveyId);
        this.selectedSurvey = null;
        this.isSubmitting   = false;
        this.handleResult(result);
      },
      error: (err) => {
        this.isSubmitting = false;
        alert('❌ ' + (err.error?.message || 'Validation error'));
      },
    });
  }

  // ── Result handling ──────────────────────────────────────────────────

  private handleResult(result: SurveyAnswerResult): void {
    this.lastResult = result;
    this.cdr.detectChanges();
    if (result.newBadges?.length) {
      this.badgeQueue      = [...result.newBadges];
      this.currentBadgeIdx = 0;
      this.showBadgeModal  = true;
    } else {
      this.showSuccessModal = true;
    }
    this.cdr.detectChanges();
  }

  onSuccessOk(): void { this.showSuccessModal = false; }

  // ── Badge modal ──────────────────────────────────────────────────────

  get currentBadge(): BadgeDefinition | null {
    return this.badgeQueue[this.currentBadgeIdx] ?? null;
  }

  get badgeGradient(): string {
    if (!this.currentBadge?.gradient) return 'linear-gradient(135deg,#16a34a,#059669)';
    return `linear-gradient(135deg,${this.currentBadge.gradient[0]},${this.currentBadge.gradient[1]})`;
  }

  get isLastBadge(): boolean {
    return this.currentBadgeIdx >= this.badgeQueue.length - 1;
  }

  nextBadge(): void {
    if (!this.isLastBadge) { this.currentBadgeIdx++; this.cdr.detectChanges(); }
    else this.closeBadgeModal();
  }

  closeBadgeModal(): void {
    this.showBadgeModal  = false;
    this.badgeQueue      = [];
    this.currentBadgeIdx = 0;
    this.cdr.detectChanges();
  }
}