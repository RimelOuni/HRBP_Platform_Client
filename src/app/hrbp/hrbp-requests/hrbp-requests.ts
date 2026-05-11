// src/app/hrbp/requests/hrbp-requests/hrbp-requests.component.ts
import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { PointService, Point, PointRequest, Reclamation, PointUser } from '../../core/services/point';

type Tab = 'requests' | 'reclamations';

@Component({
  selector: 'app-hrbp-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hrbp-requests.html',
  styleUrls:   ['./hrbp-requests.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HrbpRequests implements OnInit {

  requests:     PointRequest[] = [];
  reclamations: Reclamation[]  = [];

  activeTab: Tab = 'requests';
  loadingReq     = true;
  loadingRec     = true;

  // ── Drawer demande ───────────────────────────────────────
  selectedReq:   PointRequest | null = null;
  showReqDrawer  = false;
  showPointForm  = false;
  savingPoint    = false;
  pointOk        = false;
  pointForm = {
    titre:         '',
    date:          '',
    description:   '',
    criticite:     'Basse' as 'Basse' | 'Moyenne' | 'Haute',
    duree_estimee: '',
  };

  // ── Drawer réclamation ───────────────────────────────────
  selectedRec:    Reclamation | null = null;
  showRecDrawer   = false;
  showEditForm    = false;
  savingEdit      = false;
  recOk           = false;
  editForm = {
    titre:         '',
    date:          '',
    description:   '',
    criticite:     'Basse' as 'Basse' | 'Moyenne' | 'Haute',
    duree_estimee: '',
    status:        'En attente' as 'En attente' | 'En cours' | 'Terminé' | 'Annulé',
  };

  readonly today = new Date().toISOString().split('T')[0];

  constructor(private svc: PointService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadRequests();
    this.loadReclamations();
  }

  loadRequests(): void {
    this.loadingReq = true;
    this.svc.getPracticeRequests().subscribe({
      next: r  => {
        this.requests = this.sortItems(r);
        this.loadingReq = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingReq = false; this.cdr.detectChanges(); },
    });
  }

  loadReclamations(): void {
    this.loadingRec = true;
    this.svc.getPracticeReclamations().subscribe({
      next: r  => {
        this.reclamations = this.sortItems(r);
        this.loadingRec = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingRec = false; this.cdr.detectChanges(); },
    });
  }

  // ✅ Tri : PENDING d'abord (par date desc), puis PROCESSED/REJECTED (par date desc)
  private sortItems<T extends { status: string; createdAt?: string }>(items: T[]): T[] {
    const pending   = items
      .filter(i => i.status === 'PENDING')
      .sort((a, b) => this.dateDesc(a.createdAt, b.createdAt));

    const processed = items
      .filter(i => i.status !== 'PENDING')
      .sort((a, b) => this.dateDesc(a.createdAt, b.createdAt));

    return [...pending, ...processed];
  }

  private dateDesc(a?: string, b?: string): number {
    return new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
  }

  // ── Getters pour le template ─────────────────────────────
  get pendingRequests(): PointRequest[] {
    return this.requests.filter(r => r.status === 'PENDING');
  }

get processedRequests(): PointRequest[] {
  return this.requests.filter(r => r.status === 'PROCESSED');
}

get rejectedRequests(): PointRequest[] {
  return this.requests.filter(r => r.status === 'REJECTED');
}

  get pendingReclamations(): Reclamation[] {
    return this.reclamations.filter(r => r.status === 'PENDING');
  }

get processedReclamations(): Reclamation[] {
  return this.reclamations.filter(r => r.status === 'PROCESSED');
}

get rejectedReclamations(): Reclamation[] {
  return this.reclamations.filter(r => r.status === 'REJECTED');
}

  switchTab(t: Tab): void { this.activeTab = t; }

  // ════════════════════════════════════════════════════════
  // HELPERS — Noms et types
  // ════════════════════════════════════════════════════════

  getRequesterName(r: PointRequest): string {
    const person = r.requester || r.collaborateur;
    if (!person) return '—';
    return `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.email || '—';
  }

  getRequesterType(r: PointRequest): 'MANAGER' | 'COLLABORATEUR' {
    return r.requester_type || 'COLLABORATEUR';
  }

  getClaimantName(r: Reclamation): string {
    const person = r.claimant || r.collaborateur;
    if (!person) return '—';
    return `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.email || '—';
  }

  getClaimantType(r: Reclamation): 'MANAGER' | 'COLLABORATEUR' {
    return r.claimant_type || 'COLLABORATEUR';
  }

  getTypeLabel(type: 'MANAGER' | 'COLLABORATEUR'): string {
    return type === 'MANAGER' ? 'Manager' : 'Collaborateur';
  }

  getTypeClass(type: 'MANAGER' | 'COLLABORATEUR'): string {
    return type === 'MANAGER' ? 'hr-type-manager' : 'hr-type-collab';
  }

  // ════════════════════════════════════════════════════════
  // DRAWER DEMANDE
  // ════════════════════════════════════════════════════════

  openReqDrawer(r: PointRequest): void {
    this.selectedReq   = r;
    this.showReqDrawer = true;
    this.showPointForm = false;
    this.pointOk       = false;
    this.pointForm = {
      titre:         r.titre,
      date:          r.date_souhaitee ? r.date_souhaitee.split('T')[0] : '',
      description:   r.commentaire || '',
      criticite:     'Basse',
      duree_estimee: '',
    };
  }

  closeReqDrawer(): void {
    this.showReqDrawer = false;
    this.showPointForm = false;
    this.pointOk       = false;
    this.selectedReq   = null;
  }

  openPointForm(): void { this.showPointForm = true; }

  createPoint(): void {
    if (!this.pointForm.titre.trim() || !this.pointForm.date || !this.selectedReq) return;
    this.savingPoint = true;

    const person      = this.selectedReq.requester || this.selectedReq.collaborateur;
    const requesterId = typeof person === 'object' ? person?._id : person;
    const practiceId  = typeof this.selectedReq.practice_id === 'object'
      ? this.selectedReq.practice_id?._id
      : this.selectedReq.practice_id;

    const isManager = this.getRequesterType(this.selectedReq) === 'MANAGER';

    const payload: any = {
      titre:         this.pointForm.titre.trim(),
      date:          this.pointForm.date,
      description:   this.pointForm.description.trim(),
      criticite:     this.pointForm.criticite,
      duree_estimee: this.pointForm.duree_estimee.trim(),
      practice_id:   practiceId,
      status:        'En attente',
      ...(isManager
        ? { invite: [requesterId] }
        : { collaborateur: requesterId }
      ),
    };

    this.svc.createPoint(payload).subscribe({
      next: () => {
        this.svc.updateRequestStatus(this.selectedReq!._id, 'PROCESSED').subscribe({
          next: updated => {
            const idx = this.requests.findIndex(r => r._id === updated._id);
            if (idx !== -1) this.requests[idx] = updated;
            this.requests = this.sortItems(this.requests);
            this.selectedReq = updated;
            this.savingPoint = false;
            this.pointOk     = true;
            this.cdr.detectChanges();
            setTimeout(() => this.closeReqDrawer(), 1800);
          },
          error: () => {
            this.savingPoint = false;
            this.pointOk     = true;
            this.cdr.detectChanges();
            setTimeout(() => this.closeReqDrawer(), 1800);
          },
        });
      },
      error: e => {
        this.savingPoint = false;
        alert('❌ ' + (e.error?.message || 'Erreur création point'));
        this.cdr.detectChanges();
      },
    });
  }

  rejectRequest(): void {
    if (!this.selectedReq || !confirm(`Refuser la demande "${this.selectedReq.titre}" ?`)) return;
    this.svc.updateRequestStatus(this.selectedReq._id, 'REJECTED').subscribe({
      next: updated => {
        const idx = this.requests.findIndex(r => r._id === updated._id);
        if (idx !== -1) this.requests[idx] = updated;
        this.requests = this.sortItems(this.requests);
        this.selectedReq = updated;
        this.cdr.detectChanges();
        setTimeout(() => this.closeReqDrawer(), 1200);
      },
      error: () => {},
    });
  }

  // ════════════════════════════════════════════════════════
  // DRAWER RÉCLAMATION
  // ════════════════════════════════════════════════════════

  openRecDrawer(r: Reclamation): void {
    this.selectedRec   = r;
    this.showRecDrawer = true;
    this.showEditForm  = false;
    this.recOk         = false;
    this.savingEdit    = false;
  }

  closeRecDrawer(): void {
    this.showRecDrawer = false;
    this.showEditForm  = false;
    this.recOk         = false;
    this.selectedRec   = null;
  }

  openEditForm(): void {
    if (!this.selectedRec?.point_id) return;
    const p       = this.selectedRec.point_id;
    const dateRaw = this.selectedRec.nouvelle_date_proposee || p.date;
    this.editForm = {
      titre:         p.titre        || '',
      date:          dateRaw ? dateRaw.split('T')[0] : '',
      description:   p.description  || '',
      criticite:     (p.criticite   as any) || 'Basse',
      duree_estimee: (p as any).duree_estimee || '',
      status:        (p.status      as any) || 'En attente',
    };
    this.showEditForm = true;
  }

  saveEditAndProcess(): void {
    if (!this.selectedRec?.point_id || !this.editForm.titre.trim() || !this.editForm.date) return;
    this.savingEdit = true;

    const pointId   = this.selectedRec.point_id._id;
    const payload: Partial<Point> = {
      titre:         this.editForm.titre.trim(),
      date:          this.editForm.date,
      description:   this.editForm.description.trim(),
      criticite:     this.editForm.criticite,
      duree_estimee: this.editForm.duree_estimee.trim(),
      status:        this.editForm.status,
    };

    this.svc.updatePoint(pointId, payload).subscribe({
      next: () => {
        this.svc.updateReclamation(this.selectedRec!._id, { status: 'PROCESSED' }).subscribe({
          next: updatedRec => {
            const idx = this.reclamations.findIndex(r => r._id === updatedRec._id);
            if (idx !== -1) this.reclamations[idx] = updatedRec;
            this.reclamations = this.sortItems(this.reclamations);
            this.selectedRec = updatedRec;
            this.savingEdit  = false;
            this.recOk       = true;
            this.cdr.detectChanges();
            setTimeout(() => this.closeRecDrawer(), 1800);
          },
          error: () => {
            this.savingEdit = false;
            this.recOk      = true;
            this.cdr.detectChanges();
            setTimeout(() => this.closeRecDrawer(), 1800);
          },
        });
      },
      error: e => {
        this.savingEdit = false;
        alert('❌ ' + (e.error?.message || 'Erreur lors de la modification du point'));
        this.cdr.detectChanges();
      },
    });
  }

  rejectReclamation(): void {
    if (!this.selectedRec || !confirm(`Refuser la réclamation "${this.selectedRec.titre}" ?`)) return;
    this.svc.updateReclamation(this.selectedRec._id, { status: 'REJECTED' }).subscribe({
      next: updated => {
        const idx = this.reclamations.findIndex(r => r._id === updated._id);
        if (idx !== -1) this.reclamations[idx] = updated;
        this.reclamations = this.sortItems(this.reclamations);
        this.selectedRec  = updated;
        this.cdr.detectChanges();
        setTimeout(() => this.closeRecDrawer(), 1200);
      },
      error: () => {},
    });
  }

  // ════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════

  fmtDate(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  collabName(u: any): string {
    if (!u) return '—';
    return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '—';
  }

  pointStatusCls(s?: string): string {
    return ({
      'En attente': 'hr-ps-pending',
      'En cours':   'hr-ps-progress',
      'Terminé':    'hr-ps-done',
      'Annulé':     'hr-ps-cancelled',
    } as any)[s || ''] || 'hr-ps-pending';
  }

  msgCls(s?: string): string {
    return ({ PENDING: 'hr-b-pending', PROCESSED: 'hr-b-done', REJECTED: 'hr-b-rejected' } as any)[s || ''] || 'hr-b-pending';
  }

  msgLbl(s?: string): string {
    return ({ PENDING: 'En attente', PROCESSED: 'Traitée', REJECTED: 'Refusée' } as any)[s || ''] || s || '';
  }

  pendingReqs(): number { return this.requests.filter(r => r.status === 'PENDING').length; }
  pendingRecs(): number { return this.reclamations.filter(r => r.status === 'PENDING').length; }
}