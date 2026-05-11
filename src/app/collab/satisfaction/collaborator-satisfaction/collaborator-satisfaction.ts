// collaborator-satisfaction.component.ts
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import { UserService } from '../../../core/services/user.service';
import { PointService, Point } from '../../../core/services/point';
import { Collaborator } from '../../../core/models/user.model';
import { NgZone } from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-collaborator-satisfaction',
  imports: [CommonModule, FormsModule, HttpClientModule, FullCalendarModule],
  templateUrl: './collaborator-satisfaction.html',
  styleUrls: ['./collaborator-satisfaction.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaboratorSatisfaction implements OnInit {

  user: Collaborator | null = null;
  lastMood: string | null = null;
  lastSatisfaction: number | null = null;

  readonly today: Date = new Date();

  showMood = false;
  showSatisfaction = false;
  selectedMood = '';
  comment = '';
  satisfaction = 0;
  satisfactionComment = '';

  // ── Points list ─────────────────────────────────────────────────
  myPoints: Point[] = [];
  selectedPointId: string | null = null;

  // ── Calendrier ──────────────────────────────────────────────────
  showEventModal = false;
  selectedPoint: Point | null = null;

  pendingPoints: Point[] = []; // points Terminés sans satisfaction

  // 🔧 NOUVEAU : Flag pour tracker si le mood a déjà été vérifié
  private moodChecked = false;

  readonly STATUS_COLORS: Record<string, string> = {
    'En attente': '#f59e0b',
    'En cours':   '#3b82f6',
    'Terminé':    '#16a34a',
    'Annulé':     '#ef4444',
    'Reporté':    '#7c3aed',
  };

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
    locale: frLocale,
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,listMonth',
    },
    buttonText: {
      today: "Aujourd'hui",
      month: 'Mois',
      list:  'Liste',
    },
    height: 'auto',
    events: [],
    eventClick: this.onEventClick.bind(this),
    eventDisplay: 'block',
    dayMaxEvents: 3,
    moreLinkText: (n) => `+${n} autres`,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false },
    allDayText: 'Journée',
    noEventsText: 'Aucun point ce mois-ci',
    dayCellClassNames: (arg) => {
      const classes: string[] = [];
      const today = new Date();
      if (arg.date.toDateString() === today.toDateString()) {
        classes.push('fc-day-today-custom');
      }
      return classes;
    },
  };

  constructor(
    private userService: UserService,
    private pointService: PointService,
    private cd: ChangeDetectorRef,
      private ngZone: NgZone, // ✅ ajoute ça

  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();


   setTimeout(() => {
    this.openMood();
  }, 300);
  }

  loadCurrentUser(): void {
    this.userService.getCurrentUser().subscribe({
      next: (data) => {
        this.user = data;
        // 🔧 CORRECTION : Charger d'abord le mood/sat, puis les points
        // et vérifier si on doit afficher le popup automatiquement
        this.loadLastMoodAndSat();
        this.loadPoints();
        this.cd.markForCheck();
      },
      error: (err) => console.error('Error:', err),
    });
  }

loadLastMoodAndSat(): void {
  this.userService.getLastMoodAndSatisfaction().subscribe({
    next: (data) => {
      this.lastMood         = data.mood?.mood ?? null;
      this.lastSatisfaction = data.satisfaction?.value ?? null;
      this.cd.markForCheck();
    },
    error: (err) => console.error('Erreur mood/sat:', err),
  });
}

  loadPoints(): void {
    this.pointService.getMyPoints().subscribe({
      next: (points) => {
        // Trier par date décroissante
        this.myPoints = [...points].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const events = points.map(p => ({
          id:              p._id,
          title:           p.titre,
          date:            p.date,
          backgroundColor: this.STATUS_COLORS[p.status ?? ''] ?? '#9ca3af',
          borderColor:     this.STATUS_COLORS[p.status ?? ''] ?? '#9ca3af',
          textColor:       '#ffffff',
          extendedProps:   { point: p },
        }));

        this.calendarOptions = { ...this.calendarOptions, events };
              this.checkPendingSatisfactions(points);

        this.cd.markForCheck();
      },
      error: (err) => console.error('Erreur points:', err),
    });
  }

  onEventClick(info: EventClickArg): void {
    this.selectedPoint = info.event.extendedProps['point'] as Point;
    this.showEventModal = true;
    this.cd.markForCheck();
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.selectedPoint  = null;
    this.cd.markForCheck();
  }

  getStatusColor(status?: string): string {
    return this.STATUS_COLORS[status ?? ''] ?? '#9ca3af';
  }

  getCriticiteColor(criticite?: string): string {
    switch (criticite) {
      case 'Haute':   return '#ef4444';
      case 'Moyenne': return '#f59e0b';
      case 'Basse':   return '#16a34a';
      default:        return '#9ca3af';
    }
  }

  // ── Mood ────────────────────────────────────────────────────────
  openMood(): void  { 
    this.showMood = true; 
     this.cd.detectChanges();
  }
  
  closeMood(): void { 
    this.showMood = false; 
  }
  
  selectMood(mood: string): void { 
    this.selectedMood = mood; 
    this.cd.markForCheck(); 
  }

  validateMood(): void {
    if (!this.selectedMood) return;
    this.userService.updateMood({ mood: this.selectedMood, comment: this.comment }).subscribe({
      next: (res) => {
        this.lastMood     = res.mood.mood;
        this.showMood     = false;
        this.selectedMood = '';
        this.comment      = '';
        this.cd.markForCheck();
    
    
      },
      
      error: (err) => console.error('Erreur mood:', err),
    });
  }

  // ── Satisfaction ────────────────────────────────────────────────
  openSatisfaction(): void {
    this.selectedPointId  = null;
    this.showSatisfaction = true;
  this.cd.detectChanges(); // ✅ était markForCheck(), ne déclenchait pas le rendu
  }

  closeSatisfaction(): void {
    this.showSatisfaction = false;
    this.cd.markForCheck();
  }

  selectSatisfaction(value: number): void {
    this.satisfaction = value;
    this.cd.markForCheck();
  }

validateSatisfaction(): void {
  if (!this.satisfaction) return;
  this.userService.updateSatisfaction({
    value:    this.satisfaction,
    comment:  this.satisfactionComment,
    point_id: this.selectedPointId,
  }).subscribe({
    next: (res) => {
      this.lastSatisfaction    = res.satisfaction.value;
      this.showSatisfaction    = false;
      this.satisfaction        = 0;
      this.satisfactionComment = '';

      // ✅ Retirer le point venant d'être évalué de la liste pending
      if (this.selectedPointId) {
        this.pendingPoints = this.pendingPoints.filter(
          p => p._id !== this.selectedPointId
        );
      }

      this.selectedPointId = null;

      // ✅ S'il reste des points sans satisfaction → ouvrir pour le suivant
      if (this.pendingPoints.length > 0) {
        setTimeout(() => {
          this.ngZone.run(() => {
            this.selectedPointId  = this.pendingPoints[0]._id;
            this.showSatisfaction = true;
            this.cd.detectChanges();
          });
        }, 400);
      }

      this.cd.markForCheck();
    },
    error: (err) => console.error('Erreur satisfaction:', err),
  });
}

  // ── Helpers ─────────────────────────────────────────────────────
  getLastMood(): string | null { return this.lastMood; }
  getLastSatisfaction(): number { return this.lastSatisfaction ?? 0; }

  getMoodLabel(mood?: string | null): string {
    switch (mood) {
      case 'Neutre':   return 'Neutre';
      case 'Motivé':   return 'Motivé';
      case 'Démotivé': return 'Démotivé';
      case 'Épanoui':  return 'Épanoui';
      default:         return 'Non défini';
    }
  }

  getMoodEmoji(mood?: string | null): string {
    switch (mood) {
      case 'Neutre':   return '😐';
      case 'Motivé':   return '💪';
      case 'Démotivé': return '😔';
      case 'Épanoui':  return '😊';
      default:         return '❔';
    }
  }

  // ── Comptage par statut ──────────────────────────────────────────
  countByStatus(status: string): number {
    return this.myPoints.filter(p => p.status === status).length;
  }

  // ── Helpers pour le template ─────────────────────────────────────
  getStarArray(): number[] { return [1, 2, 3, 4, 5]; }
  getMoodOptions(): { key: string; emoji: string; label: string }[] {
    return [
      { key: 'Épanoui',  emoji: '😊', label: 'Épanoui'  },
      { key: 'Motivé',   emoji: '💪', label: 'Motivé'   },
      { key: 'Neutre',   emoji: '😐', label: 'Neutre'   },
      { key: 'Démotivé', emoji: '😔', label: 'Démotivé' },
    ];
  }
  getSatisfactionOptions(): { value: number; emoji: string; label: string }[] {
  return [
    { value: 5, emoji: '😄', label: 'Très satisfait' },
    { value: 4, emoji: '🙂', label: 'Satisfait'      },
    { value: 3, emoji: '😐', label: 'Neutre'         },
    { value: 2, emoji: '😕', label: 'Insatisfait'    },
  ];
}
checkPendingSatisfactions(points: Point[]): void {
  const donePoints = points.filter(p => p.status === 'Terminé');
  if (!donePoints.length) return;

  const doneIds = donePoints.map(p => p._id);

  this.pointService.getPointSatisfactions(doneIds).subscribe({
    next: (map: Record<string, number>) => {
      // Points Terminés qui n'ont PAS encore de satisfaction
      this.pendingPoints = donePoints.filter(p => !map[p._id]);

      if (this.pendingPoints.length > 0) {
        // Pré-sélectionner le premier point sans satisfaction
        this.selectedPointId = this.pendingPoints[0]._id;
        this.ngZone.run(() => {
          this.showSatisfaction = true;
          this.cd.detectChanges();
        });
      }
    },
    error: () => {} // silencieux
  });
}
}