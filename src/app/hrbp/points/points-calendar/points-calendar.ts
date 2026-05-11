// hrbp/points/points-calendar/points-calendar.ts
import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import { PointService } from '../../../core/services/point';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-points-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, RouterModule],
  templateUrl: './points-calendar.html',
  styleUrls: ['./points-calendar.css']
})
export class PointsCalendar implements OnInit, AfterViewInit {

  @ViewChild('calComp') calendarComponent!: FullCalendarComponent;

  isLoading = false;

  // Mini-calendar state
  miniCalendarYear  = new Date().getFullYear();
  miniCalendarMonth = new Date().getMonth();
  miniCalendarDays: { date: Date; inMonth: boolean; isToday: boolean; hasEvent: boolean }[] = [];
  eventDateSet = new Set<string>();

  readonly monthNames = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ];
  readonly dayNames = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

  statusColors: Record<string, { bg: string; border: string; text: string }> = {
    'En attente': { bg: '#FFF8E1', border: '#F59E0B', text: '#92400E' },
    'En cours':   { bg: '#E3F2FD', border: '#2563EB', text: '#1E3A8A' },
    'Terminé':    { bg: '#E8F5E9', border: '#10B981', text: '#064E3B' },
    'Reporté':    { bg: '#EDE9FE', border: '#7C3AED', text: '#4C1D95' },
    'Annulé':     { bg: '#FFEBEE', border: '#EF4444', text: '#7F1D1D' },
  };

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
    locale: frLocale,
    headerToolbar: false,
    events: [],
    eventClick: this.onEventClick.bind(this),
    eventDisplay: 'block',
    dayMaxEvents: 3,
    height: 'auto',
    slotMinTime: '07:00:00',
    slotMaxTime: '21:00:00',
    slotDuration: '00:30:00',
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    displayEventTime: true,
    displayEventEnd: false,
    // datesSet fires whenever the view or date range changes → keeps toolbar title in sync
    datesSet: () => {
      this.updateTitle();
    },
    eventDidMount: (info) => {
      info.el.style.borderRadius = '4px';
      info.el.style.fontSize = '0.75rem';
      info.el.style.fontWeight = '500';
      info.el.style.padding = '2px 6px';
      info.el.style.borderLeft = `3px solid ${info.event.borderColor || '#2563EB'}`;
    }
  };

  currentTitle = '';
  currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek' = 'dayGridMonth';

  constructor(
    private pointService: PointService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.buildMiniCalendar();
    this.loadPoints();
  }

  ngAfterViewInit() {
    // One tick delay lets FullCalendar finish rendering before we read the title
    setTimeout(() => this.updateTitle(), 0);
  }

  // ── Typed shortcut to the FullCalendar API ──
  private get api() {
    return this.calendarComponent?.getApi();
  }

  // ── Mini-calendar ──

  buildMiniCalendar() {
    const year  = this.miniCalendarYear;
    const month = this.miniCalendarMonth;
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const days: typeof this.miniCalendarDays = [];

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, inMonth: false, isToday: false, hasEvent: false });
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key  = this.toKey(date);
      days.push({
        date,
        inMonth: true,
        isToday: this.sameDay(date, today),
        hasEvent: this.eventDateSet.has(key)
      });
    }

    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      days.push({ date: next, inMonth: false, isToday: false, hasEvent: false });
    }

    this.miniCalendarDays = days;
  }

  prevMiniMonth() {
    if (this.miniCalendarMonth === 0) {
      this.miniCalendarMonth = 11;
      this.miniCalendarYear--;
    } else {
      this.miniCalendarMonth--;
    }
    this.buildMiniCalendar();
  }

  nextMiniMonth() {
    if (this.miniCalendarMonth === 11) {
      this.miniCalendarMonth = 0;
      this.miniCalendarYear++;
    } else {
      this.miniCalendarMonth++;
    }
    this.buildMiniCalendar();
  }

  miniDayClick(day: { date: Date; inMonth: boolean }) {
    // Navigate main calendar to that date and switch to day view
    this.api?.gotoDate(day.date);
    this.switchView('timeGridDay');
  }

  // ── Toolbar actions ──

  updateTitle() {
    const title = this.api?.view?.title;
    if (title) {
      this.currentTitle = title;
      this.cdr.detectChanges();
    }
  }

  goToToday() {
    this.api?.today();
    // datesSet callback handles the title update
  }

  goPrev() {
    this.api?.prev();
  }

  goNext() {
    this.api?.next();
  }

  switchView(view: typeof this.currentView) {
    this.currentView = view;
    this.api?.changeView(view);
    // datesSet callback handles the title update
  }

  // ── Load points ──

  loadPoints() {
    this.isLoading = true;
    const hrbp   = this.authService.getUser();
    const hrbpId = hrbp?.id || hrbp?._id;

    if (!hrbpId) { this.isLoading = false; return; }

    this.pointService.getPointsByHrbp(hrbpId).subscribe({
      next: (points) => {
        this.eventDateSet.clear();

        const events = points.map(p => {
          const colors = this.statusColors[p.status || ''] || {
            bg: '#F3F4F6', border: '#6B7280', text: '#374151'
          };

          const startDateTime = p.date; // full ISO string e.g. "2025-04-10T14:30:00.000Z"
          const dateKey = p.date.substring(0, 10);
          this.eventDateSet.add(dateKey);

          const endDateTime = this.computeEndTime(startDateTime, p.duree_estimee);

          return {
            id: p._id,
            title: p.titre,
            start: startDateTime,
            ...(endDateTime ? { end: endDateTime } : {}),
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
            extendedProps: { status: p.status, criticite: p.criticite, duree: p.duree_estimee }
          };
        });

        this.calendarOptions = { ...this.calendarOptions, events };
        this.buildMiniCalendar();
        this.isLoading = false;
        this.cdr.detectChanges();

        // Re-read the title after events render (calendar may have been hidden during load)
        setTimeout(() => this.updateTitle(), 50);
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private computeEndTime(start: string, duree: string | undefined): string | null {
    if (!duree || !start) return null;

    const minutesMap: Record<string, number> = {
      '15 min':       15,
      '30 min':       30,
      '1h':           60,
      '2h':           120,
      'Demi-journée': 240,
      'Journée':      480,
    };

    const minutes = minutesMap[duree];
    if (!minutes) return null;

    const date = new Date(start);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  }

  onEventClick(info: EventClickArg) {
    this.router.navigate(['/hrbp/points', info.event.id]);
  }

  // ── Helpers ──

  private toKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  get statusList() {
    return Object.entries(this.statusColors).map(([label, colors]) => ({ label, color: colors.border }));
  }
}
