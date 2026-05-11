// manager-points.component.ts — VERSION COMPLÈTE CORRIGÉE
import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { PointService, Point, PointRequest, Reclamation } from '../../core/services/point';

type StatusFilter    = 'Tous' | 'En attente' | 'En cours' | 'Terminé' | 'Annulé';
type CritFilter      = 'Tous' | 'Basse' | 'Moyenne' | 'Haute';
type FreqFilter      = 'Tous' | 'Ponctuel' | 'Hebdomadaire' | 'Bimensuel' | 'Chaque mois' | 'Trimestriel';
type SortOrder       = 'asc' | 'desc';
type ActiveTab       = 'points' | 'requests' | 'reclamations';

@Component({
  selector:      'app-manager-points',
  standalone:    true,
  imports:       [CommonModule, FormsModule],
  templateUrl:   './manager-points.html',
  styleUrls:     ['./manager-points.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ManagerPoints implements OnInit {

  points:   Point[]        = [];
  filtered: Point[]        = [];
  requests: PointRequest[] = [];
  reclams:  Reclamation[]  = [];

  pointSatisfactions: Record<string, number> = {};
  activeTab: ActiveTab = 'points';

  loading         = true;
  loadingRequests = true;
  loadingReclams  = true;
  error           = '';

  activeFilter: StatusFilter = 'Tous';
  critFilter:   CritFilter   = 'Tous';
  freqFilter:   FreqFilter   = 'Tous';
  searchQuery   = '';
  dateFrom      = '';
  sortOrder:    SortOrder    = 'desc';

  readonly today = new Date().toISOString().split('T')[0];

  showReqModal = false;
  savingReq    = false;
  reqOk        = false;
  reqForm = { titre: '', commentaire: '', date_souhaitee: '' };

  showRecModal = false;
  savingRec    = false;
  recOk        = false;
  recPoint: Point | null = null;
  recForm = { titre: '', commentaire: '', nouvelle_date_proposee: '' };

  showSatModal = false;
  savingSat    = false;
  satOk        = false;
  satPoint: Point | null = null;
  satForm = { value: 0, comment: '' };

  constructor(private svc: PointService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load();
    this.loadRequests();
    this.loadReclams();
  }

  load(): void {
    this.loading = true;
    this.error   = '';
    this.svc.getManagerPoints().subscribe({
      next: pts => {
        this.points  = pts;
        this.loading = false;
        this.applyFilters();
        this.loadPointSatisfactions(pts);
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'Impossible de charger vos points.'; this.loading = false; this.cdr.detectChanges(); },
    });
  }

  loadRequests(): void {
    this.loadingRequests = true;
    this.svc.getManagerRequests().subscribe({
      next: r => {
        this.requests = this.sortByDate(r);
        this.loadingRequests = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingRequests = false; this.cdr.detectChanges(); },
    });
  }

  loadReclams(): void {
    this.loadingReclams = true;
    this.svc.getManagerReclamations().subscribe({
      next: r => {
        this.reclams = this.sortByDate(r);
        this.loadingReclams = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingReclams = false; this.cdr.detectChanges(); },
    });
  }

  loadPointSatisfactions(pts: Point[]): void {
    const doneIds = pts.filter(p => p.status === 'Terminé').map(p => p._id);
    if (!doneIds.length) return;
    this.svc.getPointSatisfactions(doneIds).subscribe({
      next: (map: Record<string, number>) => { this.pointSatisfactions = map; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  // ✅ Tri : PENDING → PROCESSED → REJECTED, chaque groupe par date desc
  private sortByDate<T extends { status: string; createdAt?: string }>(items: T[]): T[] {
    const byDate = (a: T, b: T) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

    const pending   = items.filter(i => i.status === 'PENDING').sort(byDate);
    const processed = items.filter(i => i.status === 'PROCESSED').sort(byDate);
    const rejected  = items.filter(i => i.status === 'REJECTED').sort(byDate);

    return [...pending, ...processed, ...rejected];
  }

  // ── Getters séparation groupes ────────────────────────────────────

  get pendingRequests():   PointRequest[] { return this.requests.filter(r => r.status === 'PENDING'); }
  get processedRequests(): PointRequest[] { return this.requests.filter(r => r.status === 'PROCESSED'); }
  get rejectedRequests():  PointRequest[] { return this.requests.filter(r => r.status === 'REJECTED'); }

  get pendingReclams():   Reclamation[] { return this.reclams.filter(r => r.status === 'PENDING'); }
  get processedReclams(): Reclamation[] { return this.reclams.filter(r => r.status === 'PROCESSED'); }
  get rejectedReclams():  Reclamation[] { return this.reclams.filter(r => r.status === 'REJECTED'); }

  switchTab(tab: ActiveTab): void { this.activeTab = tab; }

  applyFiltersPublic(): void { this.applyFilters(); this.cdr.detectChanges(); }
  onDateChange(): void { this.applyFilters(); this.cdr.detectChanges(); }

  toggleSort(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.applyFilters();
  }

  resetFilters(): void {
    this.activeFilter = 'Tous'; this.critFilter = 'Tous'; this.freqFilter = 'Tous';
    this.searchQuery = ''; this.dateFrom = ''; this.sortOrder = 'desc';
    this.applyFilters();
  }

  private statusPriority(status?: string): number {
    return ({ 'En attente': 0, 'En cours': 1, 'Terminé': 2, 'Annulé': 3 } as any)[status || ''] ?? 4;
  }

  private applyFilters(): void {
    let result = [...this.points];
    if (this.activeFilter !== 'Tous') result = result.filter(p => p.status === this.activeFilter);
    if (this.critFilter   !== 'Tous') result = result.filter(p => p.criticite === this.critFilter);
    if (this.freqFilter   !== 'Tous') result = result.filter(p => this.getFrequence(p) === this.freqFilter);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(p => p.titre?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (this.dateFrom) result = result.filter(p => p.date && new Date(p.date) >= new Date(this.dateFrom));

    result.sort((a, b) => {
      if (this.activeFilter === 'Tous') {
        const diff = this.statusPriority(a.status) - this.statusPriority(b.status);
        if (diff !== 0) return diff;
      }
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return this.sortOrder === 'desc' ? db - da : da - db;
    });

    this.filtered = result;
  }

  count(f: StatusFilter): number {
    return f === 'Tous' ? this.points.length : this.points.filter(p => p.status === f).length;
  }

  get hasActiveFilters(): boolean {
    return this.activeFilter !== 'Tous' || this.critFilter !== 'Tous'
      || this.freqFilter !== 'Tous' || !!this.searchQuery.trim() || !!this.dateFrom;
  }

  getFrequence(p: Point): string { return (p as any)['frequence'] || ''; }

  fmtDate(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusCls(s?: string): string {
    return ({ 'En attente': 'mp-s-pending', 'En cours': 'mp-s-progress', 'Terminé': 'mp-s-done', 'Annulé': 'mp-s-cancelled' } as any)[s || ''] || 'mp-s-pending';
  }

  msgCls(s?: string): string {
    return ({ PENDING: 'mp-b-pending', PROCESSED: 'mp-b-done', REJECTED: 'mp-b-rejected' } as any)[s || ''] || 'mp-b-pending';
  }

  msgLbl(s?: string): string {
    return ({ PENDING: 'En attente', PROCESSED: 'Traitée', REJECTED: 'Refusée' } as any)[s || ''] || s || '';
  }

  critCls(c?: string): string {
    return ({ Basse: 'mp-crit-low', Moyenne: 'mp-crit-med', Haute: 'mp-crit-high' } as any)[c || ''] || '';
  }

  hrbpName(p: Point): string {
    const u = p.created_by as any;
    if (!u) return 'HRBP';
    return `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'HRBP';
  }

  hasPendingReclam(p: Point): boolean {
    return this.reclams.some(r => {
      const pid = (r.point_id as any)?._id ?? r.point_id;
      return pid?.toString() === p._id && r.status === 'PENDING';
    });
  }

  hasPointSat(p: Point): boolean { return !!this.pointSatisfactions[p._id]; }
  getPointSatValue(p: Point): number { return this.pointSatisfactions[p._id] ?? 0; }
  satLabel(v: number): string {
    return ['', 'Très insatisfait 😞', 'Insatisfait 😕', 'Neutre 😐', 'Satisfait 😊', 'Très satisfait 🌟'][v] || '';
  }

  openReq(): void { this.reqForm = { titre: '', commentaire: '', date_souhaitee: '' }; this.reqOk = false; this.showReqModal = true; }
  closeReq(): void { this.showReqModal = false; }

  submitReq(): void {
    if (!this.reqForm.titre.trim() || !this.reqForm.date_souhaitee) return;
    this.savingReq = true;
    this.svc.createManagerPointRequest(this.reqForm.titre, this.reqForm.commentaire, this.reqForm.date_souhaitee).subscribe({
      next: r => {
        this.requests = this.sortByDate([r, ...this.requests]);
        this.savingReq = false; this.reqOk = true; this.cdr.detectChanges();
        setTimeout(() => this.closeReq(), 1600);
      },
      error: e => { this.savingReq = false; alert('❌ ' + (e.error?.message || 'Erreur')); this.cdr.detectChanges(); },
    });
  }

  openRec(p: Point): void { this.recPoint = p; this.recForm = { titre: '', commentaire: '', nouvelle_date_proposee: '' }; this.recOk = false; this.showRecModal = true; }
  closeRec(): void { this.showRecModal = false; this.recPoint = null; }

  submitRec(): void {
    if (!this.recForm.titre.trim() || !this.recPoint?._id) return;
    this.savingRec = true;
    this.svc.createManagerReclamation(this.recPoint._id, this.recForm.titre, this.recForm.commentaire, this.recForm.nouvelle_date_proposee || null).subscribe({
      next: r => {
        this.reclams = this.sortByDate([r, ...this.reclams]);
        this.savingRec = false; this.recOk = true; this.cdr.detectChanges();
        setTimeout(() => this.closeRec(), 1600);
      },
      error: e => { this.savingRec = false; alert('❌ ' + (e.error?.message || 'Erreur')); this.cdr.detectChanges(); },
    });
  }

  openSat(p: Point): void { this.satPoint = p; this.satForm = { value: 0, comment: '' }; this.satOk = false; this.showSatModal = true; }
  closeSat(): void { this.showSatModal = false; this.satPoint = null; }

  submitSat(): void {
    if (!this.satForm.value || !this.satPoint?._id) return;
    this.savingSat = true;
    this.svc.ratePointSatisfaction({ value: this.satForm.value, comment: this.satForm.comment, point_id: this.satPoint._id }).subscribe({
      next: () => {
        this.pointSatisfactions[this.satPoint!._id] = this.satForm.value;
        this.savingSat = false; this.satOk = true; this.cdr.detectChanges();
        setTimeout(() => this.closeSat(), 1600);
      },
      error: e => { this.savingSat = false; alert('❌ ' + (e.error?.message || 'Erreur')); this.cdr.detectChanges(); },
    });
  }
}