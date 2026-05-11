import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Action, ActionService } from '../../../core/services/action';
import { Point, PointService } from '../../../core/services/point';
import { AlertService, Alerte } from '../../../core/services/alert.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-point-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './point-detail.html',
  styleUrls: ['./point-detail.css']
})
export class PointDetail implements OnInit {
  point: Point | null = null;
  isLoading = false;

  // ── Actions ──────────────────────────────────────────────────
  actions: Action[] = [];
  loadingActions = false;

  showActionModal = false;
  showViewModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedAction: Action | null = null;
  editingActionId: string | null = null;
  selectedCategory: string = '';
  actionForm = {
    action: '',
    description: '',
    status: 'NONE' as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  };

  // ── Alertes (dynamic / backend) ───────────────────────────────
  alertes: Alerte[] = [];
  loadingAlertes = false;
  showAlerteModal = false;
  showViewAlerteModal = false;
  alerteModalMode: 'create' | 'edit' = 'create';
  selectedAlerte: Alerte | null = null;
  editingAlerteId: string | null = null;

  /** Managers (RO / CC) resolved from the collaborateur on this point */
  availableManagers: { user: any; label: string }[] = [];

  alerteForm: {
    type: string;
    titre: string;
    destination_user_id: string;
    destination_label: string;
    date: string;
    statut: 'En attente' | 'Envoyée' | 'Lue' | 'Traitée';
    description: string;
    managerNote: string;
    keyPointsRaw: string;
  } = {
    type: '',
    titre: '',
    destination_user_id: '',
    destination_label: '',
    date: new Date().toISOString().split('T')[0],
    statut: 'En attente',
    description: '',
    managerNote: '',
    keyPointsRaw: ''
  };

  // ── Alert type definitions ────────────────────────────────────
  readonly alerteTypes: { key: string; label: string; icon: string }[] = [
    { key: 'formation',   label: 'Formation',         icon: '🎓' },
    { key: 'workshop',    label: 'Workshop / Atelier', icon: '🛠️' },
    { key: 'performance', label: 'Performance',        icon: '📈' },
    { key: 'rh',          label: 'RH / Administratif', icon: '📋' },
    { key: 'risque',      label: 'Risque / Critique',  icon: '⚠️' },
    { key: 'conge',       label: 'Congé / Absence',    icon: '🏖️' },
    { key: 'evolution',   label: 'Évolution Carrière', icon: '🚀' },
    { key: 'conflit',     label: 'Conflit',            icon: '⚡' },
  ];

  // ── Predefined titles per alert type ─────────────────────────
  private readonly alerteTitresMap: Record<string, string[]> = {
    formation: [
      'Inscription formation validée',
      'Rappel de formation à venir',
      'Formation obligatoire non réalisée',
      'Bilan de formation disponible',
      'Besoin de formation identifié',
      'Plan de développement mis à jour',
    ],
    workshop: [
      'Invitation workshop équipe',
      'Participation atelier RH requis',
      'Workshop de cohésion planifié',
      'Atelier gestion du stress',
      'Session de feedback collectif',
      'Workshop leadership planifié',
    ],
    performance: [
      'Alerte baisse de performance',
      'Objectifs non atteints',
      "Plan d'amélioration à initier",
      'Évaluation intermédiaire requise',
      'Retour positif à formaliser',
      'Indicateurs KPI en dessous du seuil',
    ],
    rh: [
      'Mise à jour contrat requise',
      'Document RH manquant',
      'Signature avenant en attente',
      'Entretien annuel à planifier',
      'Visite médicale à programmer',
      "Période d'essai se termine",
    ],
    risque: [
      'Situation critique détectée',
      'Risque de départ imminent',
      'Alerte bien-être collaborateur',
      'Signalement comportement inapproprié',
      'Arrêt maladie répété',
      'Intervention urgente requise',
    ],
    conge: [
      'Solde de congés critique',
      'Absence prolongée non justifiée',
      'Congé longue durée planifié',
      'Retour de congé maternité',
      'Congé exceptionnel validé',
      "Planification congés d'été",
    ],
    evolution: [
      'Demande de promotion à traiter',
      'Mobilité interne candidate',
      'Passage au comité carrière',
      'Augmentation salariale à valider',
      'Nouveau poste proposé',
      'Bilan de compétences à initier',
    ],
    conflit: [
      'Conflit avec le manager signalé',
      "Tension au sein de l'équipe",
      'Médiation requise',
      'Plainte formelle déposée',
      'Suivi post-conflit à effectuer',
      'Changement de mission suggéré',
    ],
  };

  // ── Default key points per type ───────────────────────────────
  private readonly defaultKeyPoints: Record<string, string[]> = {
    formation: [
      "Valider la disponibilité du collaborateur avant l'inscription",
      "S'assurer que la formation est alignée avec les objectifs de la mission",
      'Prévoir un compte rendu post-formation avec le collaborateur',
      'Mettre à jour le plan de développement individuel',
      "Informer le client si la formation impacte la présence sur site",
    ],
    workshop: [
      "Confirmer la participation à l'atelier au moins 5 jours à l'avance",
      'Libérer le collaborateur de ses responsabilités opérationnelles le jour J',
      'Partager les objectifs du workshop en amont avec le collaborateur',
      "Assurer un suivi des engagements pris lors de l'atelier",
      'Transmettre le compte rendu au manager dans les 48h',
    ],
    performance: [
      "Analyser les causes de la baisse de performance avant d'agir",
      'Définir des objectifs SMART et un calendrier de suivi',
      "Maintenir la confidentialité du plan d'amélioration",
    ],
    risque: [
      'Traiter la situation avec la plus grande confidentialité',
      'Contacter la médecine du travail si nécessaire',
      'Escalader à la direction RH si la situation persiste',
    ],
    evolution: [
      'Valider le budget auprès de la direction avant toute promesse',
      'Définir un calendrier réaliste avec le collaborateur',
      'Préparer la présentation en comité carrière',
    ],
    conflit: [
      'Recueillir les deux versions des faits séparément',
      "Ne pas prendre parti avant d'avoir tous les éléments",
      'Proposer une médiation tripartite si nécessaire',
    ],
  };

  // ── Action categories ─────────────────────────────────────────
  readonly actionCategories: { key: string; label: string; actions: string[] }[] = [
    {
      key: 'charge',
      label: 'Actions liées à la Charge de Travail',
      actions: [
        'Analyse de la charge projet',
        'Rééquilibrage des missions',
        'Priorisation des tâches avec le manager',
        'Réduction temporaire du staffing',
        "Ajout d'un consultant en renfort",
        'Révision des deadlines',
        'Suivi hebdomadaire de la charge',
        'Escalade auprès de la direction',
        'Audit du planning',
        "Mise en place d'un plan anti-burnout",
      ],
    },
    {
      key: 'conflit',
      label: "Actions liées à un Conflit Manager / Équipe",
      actions: [
        'Recueil des versions individuelles',
        'Entretien confidentiel avec le collaborateur',
        'Entretien avec le manager',
        "Organisation d'une médiation tripartite",
        "Mise en place d'un plan d'amélioration relationnelle",
        'Suivi à 15 jours',
        'Suivi à 30 jours',
        'Changement de mission',
        'Changement de manager',
        'Escalade Direction RH',
        'Ouverture enquête interne',
        'Clôture dossier conflit',
      ],
    },
    {
      key: 'evolution',
      label: "Actions liées à une Demande d'Évolution",
      actions: [
        'Analyse des compétences actuelles',
        'Benchmark salaire',
        'Proposition de promotion',
        'Validation budgétaire',
        "Création d'un plan de développement",
        'Inscription à une formation',
        'Attribution mentor',
        "Fixation d'objectifs d'évolution",
        'Évaluation intermédiaire',
        'Présentation en comité carrière',
        'Refus argumenté avec plan alternatif',
      ],
    },
    {
      key: 'mission',
      label: "Actions liées à une Insatisfaction Mission",
      actions: [
        'Analyse du contexte projet',
        'Discussion avec le client',
        'Recherche nouvelle mission',
        'Réaffectation interne',
        'Coaching adaptabilité',
        'Ajustement périmètre mission',
        'Clarification des attentes',
        'Mise en place feedback régulier',
        'Escalade commerciale',
        'Suivi satisfaction post-changement',
      ],
    },
    {
      key: 'critique',
      label: 'Actions liées à une Situation Critique',
      actions: [
        'Déclaration situation critique',
        'Activation protocole RH',
        'Mise en sécurité collaborateur',
        'Contact médecine du travail',
        'Mise en arrêt temporaire',
        'Accompagnement psychologique',
        "Entretien d'urgence",
        'Audit organisationnel',
        'Rapport confidentiel RH',
        'Clôture dossier critique',
      ],
    },
    {
      key: 'motivation',
      label: 'Actions liées à la Motivation & Engagement',
      actions: [
        'Attribution badge reconnaissance',
        'Mise en avant performance',
        'Proposition participation projet stratégique',
        'Inscription événement interne',
        'Feedback positif officiel',
        'Bonus exceptionnel',
        'Participation programme talent',
        'Entretien développement carrière',
        'Proposition mobilité interne',
        'Coaching leadership',
      ],
    },
    {
      key: 'admin',
      label: 'Actions Administratives',
      actions: [
        'Mise à jour contrat',
        'Validation congé exceptionnel',
        'Correction erreur paie',
        'Mise à jour classification',
        'Ajout prime exceptionnelle',
        'Modification temps de travail',
        'Mise à jour dossier RH',
        'Validation télétravail',
        'Signature avenant',
        'Archivage dossier',
      ],
    },
    {
      key: 'performance',
      label: 'Actions liées à la Performance',
      actions: [
        "Définition plan d'amélioration performance",
        'Fixation objectifs SMART',
        'Mise en place suivi mensuel',
        'Formation technique ciblée',
        'Coaching performance',
        'Évaluation intermédiaire',
        'Feedback formalisé',
        'Avertissement formel',
        'Prolongation période probatoire',
        'Clôture plan performance',
      ],
    },
    {
      key: 'depart',
      label: 'Actions liées au Risque de Départ',
      actions: [
        'Entretien rétention',
        'Proposition ajustement salarial',
        'Proposition mobilité interne',
        "Plan accéléré d'évolution",
        'Entretien direction RH',
        'Analyse causes départ',
        'Contre-offre',
        'Préparation plan succession',
        'Organisation passation',
        'Exit interview',
      ],
    },
    {
      key: 'restitution',
      label: 'Actions de Restitution',
      actions: [
        'Restitution au manager',
        'Restitution direction RH',
        'Compte rendu écrit',
        'Mise à jour dashboard',
        'Notification manager',
        'Validation clôture',
        'Suivi post-action',
        "Évaluation impact action",
        'Clôture point',
        'Archivage final',
      ],
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pointService: PointService,
    private actionService: ActionService,
    private alertService: AlertService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const pointId = this.route.snapshot.paramMap.get('id');
    if (pointId) {
      this.loadPoint(pointId);
      this.loadActions(pointId);
      this.loadAlertes(pointId);
    }
  }

  // ── Point ────────────────────────────────────────────────────

  loadPoint(pointId: string) {
    this.isLoading = true;
    this.pointService.getPointById(pointId).subscribe({
      next: (response) => {
        this.point = response;
        this.isLoading = false;
        this.resolveManagers();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading point:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Actions ──────────────────────────────────────────────────

  loadActions(pointId: string) {
    this.loadingActions = true;
    this.actionService.getActionsByPoint(pointId).subscribe({
      next: (actions) => {
        this.actions = actions;
        this.loadingActions = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading actions:', error);
        this.loadingActions = false;
        this.cdr.detectChanges();
      }
    });
  }

  getActionsForCategory(categoryKey: string): string[] {
    return this.actionCategories.find(c => c.key === categoryKey)?.actions ?? [];
  }

  onCategoryChange() { this.actionForm.action = ''; }

  getCategoryLabel(actionTitle: string): string {
    const cat = this.actionCategories.find(c => c.actions.includes(actionTitle));
    return cat ? cat.label : '—';
  }

  openCreateActionModal() {
    this.modalMode = 'create';
    this.editingActionId = null;
    this.selectedCategory = '';
    this.resetActionForm();
    this.showActionModal = true;
  }

  openEditActionModal(action: Action) {
    this.modalMode = 'edit';
    this.editingActionId = action._id!;
    this.actionForm = {
      action: action.action,
      description: action.description || '',
      status: action.status
    };
    const matchingCat = this.actionCategories.find(cat => cat.actions.includes(action.action));
    this.selectedCategory = matchingCat?.key ?? '';
    this.showViewModal = false;
    this.showActionModal = true;
  }

  isArray(value: any): boolean { return Array.isArray(value); }

  openViewActionModal(action: Action) { this.selectedAction = action; this.showViewModal = true; }
  closeActionModal() { this.showActionModal = false; this.editingActionId = null; this.selectedCategory = ''; this.resetActionForm(); }
  closeViewModal() { this.showViewModal = false; this.selectedAction = null; }
  resetActionForm() { this.actionForm = { action: '', description: '', status: 'NONE' }; }

  saveAction() {
    if (!this.point?._id) return;
    if (this.modalMode === 'edit' && this.editingActionId) {
      this.actionService.updateAction(this.editingActionId, this.actionForm).subscribe({
        next: () => { this.loadActions(this.point!._id); this.closeActionModal(); },
        error: (error) => { console.error('Error updating action:', error); alert("Erreur lors de la mise à jour de l'action"); }
      });
    } else {
      const newAction: Action = { ...this.actionForm, point_id: this.point._id };
      this.actionService.createAction(newAction).subscribe({
        next: () => { this.loadActions(this.point!._id); this.closeActionModal(); },
        error: (error) => { console.error('Error creating action:', error); alert("Erreur lors de la création de l'action"); }
      });
    }
  }

  deleteActionConfirm(action: Action) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'action "${action.action}" ?`)) {
      this.actionService.deleteAction(action._id!).subscribe({
        next: () => { this.loadActions(this.point!._id); },
        error: (error) => { console.error('Error deleting action:', error); alert("Erreur lors de la suppression de l'action"); }
      });
    }
  }

  getActionStatusClass(status: string): string { return `status-${status.toLowerCase()}`; }
  getActionStatusLabel(status: string): string {
    const labels: Record<string, string> = { 'NONE': 'Aucune', 'LOW': 'Basse', 'MEDIUM': 'Moyenne', 'HIGH': 'Haute' };
    return labels[status] || status;
  }

  // ── Alertes (dynamic) ────────────────────────────────────────

  loadAlertes(pointId: string) {
    this.loadingAlertes = true;
    this.alertService.getAlertsByPoint(pointId).subscribe({
      next: (data) => {
        this.alertes = data;
        this.loadingAlertes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingAlertes = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * After the point loads, fetch the collaborateur's full user record
   * to extract ro_id and cc_id as destination options.
   */
  resolveManagers() {
    this.availableManagers = [];
    if (!this.point?.collaborateur) return;

    const collabId =
      typeof this.point.collaborateur === 'object'
        ? (this.point.collaborateur as any)._id
        : this.point.collaborateur;

    if (!collabId) return;

    this.userService.getUserById(collabId).subscribe({
      next: (user) => {
        if (user.ro_id) {
          const ro = user.ro_id as any;
          this.availableManagers.push({
            user: ro,
            label: `RO — ${ro.first_name} ${ro.last_name}`
          });
        }
        if (user.cc_id) {
          const cc = user.cc_id as any;
          this.availableManagers.push({
            user: cc,
            label: `CC — ${cc.first_name} ${cc.last_name}`
          });
        }
        this.cdr.detectChanges();
      }
    });
  }

  getAlerteTitresForType(typeKey: string): string[] {
    return this.alerteTitresMap[typeKey] ?? [];
  }

  onAlerteTitreChange() {
    const defaults = this.defaultKeyPoints[this.alerteForm.type];
    if (defaults && defaults.length > 0 && !this.alerteForm.keyPointsRaw) {
      this.alerteForm.keyPointsRaw = defaults.map(kp => `- ${kp}`).join('\n');
    }
  }

  selectAlerteType(typeKey: string) {
    this.alerteForm.type = typeKey;
    this.alerteForm.titre = '';
    const defaults = this.defaultKeyPoints[typeKey];
    this.alerteForm.keyPointsRaw = defaults?.length
      ? defaults.map(kp => `- ${kp}`).join('\n')
      : '';
  }

  openCreateAlerteModal() {
    this.alerteModalMode = 'create';
    this.editingAlerteId = null;
    this.resetAlerteForm();
    this.showAlerteModal = true;
  }

  openEditAlerteModal(alerte: Alerte) {
    this.alerteModalMode = 'edit';
    this.editingAlerteId = alerte._id!;

    const destId =
      typeof alerte.destination_user_id === 'object'
        ? (alerte.destination_user_id as any)._id
        : alerte.destination_user_id;

    this.alerteForm = {
      type: alerte.type,
      titre: alerte.titre,
      destination_user_id: destId ?? '',
      destination_label: alerte.destination_label ?? '',
      date: alerte.date ? alerte.date.split('T')[0] : new Date().toISOString().split('T')[0],
      statut: alerte.statut,
      description: alerte.description || '',
      managerNote: alerte.managerNote || '',
      keyPointsRaw: alerte.keyPoints ? alerte.keyPoints.map(kp => `- ${kp}`).join('\n') : ''
    };
    this.showViewAlerteModal = false;
    this.showAlerteModal = true;
  }

  openViewAlerteModal(alerte: Alerte) {
    this.selectedAlerte = alerte;
    this.showViewAlerteModal = true;
  }

  closeAlerteModal() {
    this.showAlerteModal = false;
    this.editingAlerteId = null;
    this.resetAlerteForm();
  }

  closeViewAlerteModal() {
    this.showViewAlerteModal = false;
    this.selectedAlerte = null;
  }

  resetAlerteForm() {
    this.alerteForm = {
      type: '',
      titre: '',
      destination_user_id: '',
      destination_label: '',
      date: new Date().toISOString().split('T')[0],
      statut: 'En attente',
      description: '',
      managerNote: '',
      keyPointsRaw: ''
    };
  }

  saveAlerte() {
    const keyPoints = this.alerteForm.keyPointsRaw
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);

    const selectedManager = this.availableManagers.find(
      m => m.user._id === this.alerteForm.destination_user_id
    );

    const payload: Partial<Alerte> = {
      point_id: this.point?._id,
      type: this.alerteForm.type,
      titre: this.alerteForm.titre,
      description: this.alerteForm.description || undefined,
      managerNote: this.alerteForm.managerNote || undefined,
      keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
      date: this.alerteForm.date,
      statut: this.alerteForm.statut,
      destination_user_id: this.alerteForm.destination_user_id,
      destination_label: selectedManager?.label ?? this.alerteForm.destination_label,
    };

    if (this.alerteModalMode === 'edit' && this.editingAlerteId) {
      this.alertService.updateAlert(this.editingAlerteId, payload).subscribe({
        next: () => {
          this.loadAlertes(this.point!._id);
          this.closeAlerteModal();
        },
        error: () => alert("Erreur lors de la mise à jour de l'alerte")
      });
    } else {
      this.alertService.createAlert(payload).subscribe({
        next: () => {
          this.loadAlertes(this.point!._id);
          this.closeAlerteModal();
        },
        error: () => alert("Erreur lors de la création de l'alerte")
      });
    }
  }

  deleteAlerteConfirm(alerte: Alerte) {
    if (confirm(`Supprimer l'alerte "${alerte.titre}" ?`)) {
      this.alertService.deleteAlert(alerte._id!).subscribe({
        next: () => {
          this.loadAlertes(this.point!._id);
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ── Alerte display helpers ────────────────────────────────────

  getAlerteDestinationLabel(alerte: Alerte): string {
    if (alerte.destination_label) return alerte.destination_label;
    if (typeof alerte.destination_user_id === 'object' && alerte.destination_user_id) {
      const u = alerte.destination_user_id as any;
      return `${u.first_name} ${u.last_name}`;
    }
    return '—';
  }

  getAlerteTypeLabel(typeKey: string): string {
    return this.alerteTypes.find(t => t.key === typeKey)?.label ?? typeKey;
  }

  getAlerteTypeIcon(typeKey: string): string {
    return this.alerteTypes.find(t => t.key === typeKey)?.icon ?? '🔔';
  }

  getAlerteTypeClass(typeKey: string): string {
    return `alerte-type--${typeKey}`;
  }

  getAlerteStatutClass(statut: string): string {
    const map: Record<string, string> = {
      'En attente': 'statut-attente',
      'Envoyée':    'statut-envoyee',
      'Lue':        'statut-lue',
      'Traitée':    'statut-traitee',
    };
    return map[statut] ?? '';
  }

  // ── Routing & formatting ──────────────────────────────────────

  goBack() { this.router.navigate(['/hrbp/points']); }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatDateShort(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  }

  hasContent(obj: any): boolean { return obj && Object.keys(obj).length > 0; }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'En attente': 'status-attente',
      'En cours':   'status-cours',
      'Terminé':    'status-termine',
      'Annulé':     'status-annule'
    };
    return statusMap[status] || '';
  }

  getCriticiteClass(criticite: string): string {
    const map: Record<string, string> = {
      'Basse':   'criticite-basse',
      'Moyenne': 'criticite-moyenne',
      'Haute':   'criticite-haute'
    };
    return map[criticite] || '';
  }
}
