import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AlertService, Alerte } from '../../../core/services/alert.service';
import { catchError, finalize, timeout, map } from 'rxjs/operators';
import { of } from 'rxjs';

type StatutAlerte = 'En attente' | 'Envoyée' | 'Lue' | 'Traitée';

// Backend wraps LIST responses: { success: true, data: [...] }
// But single item responses (update/create) return the object directly
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-manager-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './manager-alerts-component.html',
  styleUrls: ['./manager-alerts-component.css']
})
export class ManagerAlertsComponent implements OnInit {

  managerId: string = '';
  managerName: string = '';

  alertes: Alerte[] = [];
  filteredAlertes: Alerte[] = [];
  isLoading = false;
  error: string | null = null;

  filterType: string = 'all';
  filterStatus: string = 'all';
  searchQuery = '';

  stats = {
    total: 0,
    enAttente: 0,
    envoyee: 0,
    lue: 0,
    traitee: 0
  };

  showViewModal = false;
  selectedAlerte: Alerte | null = null;

  readonly alerteTypes = [
    { key: 'formation',    label: 'Formation',   icon: '🎓' },
    { key: 'workshop',     label: 'Workshop',    icon: '🛠️' },
    { key: 'performance',  label: 'Performance', icon: '📈' },
    { key: 'rh',           label: 'RH',          icon: '📋' },
    { key: 'risque',       label: 'Risque',      icon: '⚠️' },
    { key: 'conge',        label: 'Congé',       icon: '🏖️' },
    { key: 'evolution',    label: 'Évolution',   icon: '🚀' },
    { key: 'conflit',      label: 'Conflit',     icon: '⚡' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.managerId = this.route.snapshot.paramMap.get('managerId') || '';
    this.managerName = this.route.snapshot.queryParamMap.get('name') || '';

    if (!this.managerId) {
      this.error = "Aucun identifiant manager trouvé dans l'URL";
      this.isLoading = false;
      return;
    }

    this.loadManagerAlertes();
  }

  loadManagerAlertes() {
    this.isLoading = true;
    this.error = null;

    this.alertService.getAlertsByManager(this.managerId)
      .pipe(
        timeout(10000),
        // ✅ LIST responses might be wrapped: { success: true, data: [...] }
        map((response: ApiResponse<Alerte[]> | Alerte[]) => {
          console.log('[ManagerAlerts] Raw response:', response);
          // Check if already an array (direct) or wrapped object
          if (Array.isArray(response)) {
            return response;
          }
          return (response as ApiResponse<Alerte[]>)?.data || [];
        }),
        catchError((err) => {
          console.error('[ManagerAlerts] API Error:', err);
          if (err.name === 'TimeoutError') {
            this.error = 'Le serveur met trop de temps à répondre.';
          } else {
            this.error = `Erreur: ${err.message || 'Erreur inconnue'}`;
          }
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: Alerte[]) => {
          this.alertes = (data || []).sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          this.applyFilters();
          this.computeStats();
        }
      });
  }

  applyFilters() {
    this.filteredAlertes = this.alertes.filter(a => {
      const matchType = this.filterType === 'all' || a.type === this.filterType;
      const matchStatus = this.filterStatus === 'all' || a.statut === this.filterStatus;
      const matchSearch = !this.searchQuery ||
        a.titre.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (a.description?.toLowerCase().includes(this.searchQuery.toLowerCase()) ?? false);
      return matchType && matchStatus && matchSearch;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.filterType = 'all';
    this.filterStatus = 'all';
    this.searchQuery = '';
    this.applyFilters();
  }

  computeStats() {
    this.stats = {
      total: this.alertes.length,
      enAttente: this.alertes.filter(a => a.statut === 'En attente').length,
      envoyee: this.alertes.filter(a => a.statut === 'Envoyée').length,
      lue: this.alertes.filter(a => a.statut === 'Lue').length,
      traitee: this.alertes.filter(a => a.statut === 'Traitée').length
    };
  }

  canAdvanceStatus(statut: string): boolean {
    return statut === 'En attente' || statut === 'Envoyée' || statut === 'Lue';
  }

  advanceStatus(alerte: Alerte, event: Event) {
    event.stopPropagation();

    let next: StatutAlerte | '' = '';
    if (alerte.statut === 'En attente') next = 'Envoyée';
    else if (alerte.statut === 'Envoyée') next = 'Lue';
    else if (alerte.statut === 'Lue') next = 'Traitée';

    if (!next) return;

    this.alertService.updateAlert(alerte._id!, { statut: next }).subscribe({
      next: (updatedAlert: Alerte) => {
        // ✅ FIXED: updateAlert returns Alerte directly, NOT { data: Alerte }
        const index = this.alertes.findIndex(a => a._id === alerte._id);
        if (index !== -1) {
          this.alertes[index] = { ...this.alertes[index], ...updatedAlert, statut: next };
        } else {
          alerte.statut = next;
        }
        this.computeStats();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ManagerAlerts] Update error:', err);
      }
    });
  }

  markAsRead(alerte: Alerte, event: Event) {
    event.stopPropagation();

    this.alertService.updateAlert(alerte._id!, { statut: 'Lue' }).subscribe({
      next: (updatedAlert: Alerte) => {
        // ✅ FIXED: updateAlert returns Alerte directly
        const index = this.alertes.findIndex(a => a._id === alerte._id);
        if (index !== -1) {
          this.alertes[index] = { ...this.alertes[index], ...updatedAlert, statut: 'Lue' };
        } else {
          alerte.statut = 'Lue';
        }
        this.computeStats();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[ManagerAlerts] Mark as read error:', err);
      }
    });
  }

  openViewModal(alerte: Alerte) {
    this.selectedAlerte = alerte;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedAlerte = null;
  }

  goBack() {
    this.router.navigate(['/manager']);
  }

  getAlerteTypeClass(typeKey: string): string {
    return `alerte-type--${typeKey}`;
  }

  getAlerteTypeIcon(typeKey: string): string {
    return this.alerteTypes.find(t => t.key === typeKey)?.icon ?? '🔔';
  }

  getAlerteTypeLabel(typeKey: string): string {
    return this.alerteTypes.find(t => t.key === typeKey)?.label ?? typeKey;
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      'En attente': 'statut-attente',
      'Envoyée': 'statut-envoyee',
      'Lue': 'statut-lue',
      'Traitée': 'statut-traitee'
    };
    return map[statut] ?? '';
  }

  getStatutIcon(statut: string): string {
    const map: Record<string, string> = {
      'En attente': '⏳',
      'Envoyée': '📨',
      'Lue': '👁️',
      'Traitée': '✅'
    };
    return map[statut] ?? '';
  }

  getNextStatusLabel(statut: string): string {
    if (statut === 'En attente') return 'Marquer envoyée';
    if (statut === 'Envoyée') return 'Marquer lue';
    if (statut === 'Lue') return 'Marquer traitée';
    return '';
  }

  getCreatorLabel(alerte: Alerte): string {
    if (!alerte.created_by) return '—';
    if (typeof alerte.created_by === 'object') {
      return `${alerte.created_by.first_name ?? ''} ${alerte.created_by.last_name ?? ''}`.trim();
    }
    return '—';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
