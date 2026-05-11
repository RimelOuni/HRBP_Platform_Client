
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import ApexCharts from 'apexcharts';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.css',
})
export class DashboardAdmin implements OnInit, OnDestroy {
  // Mapping des notes vers labels textuels
  private readonly satisfactionMapping: Record<string, string> = {
    '1': 'Très insatisfait',
    '2': 'Insatisfait',
    '3': 'Neutre',
    '4': 'Satisfait',
    '5': 'Très satisfait'
  };

  // ── KPIs ────────────────────────────────────────────────────────
  kpis = {
    totalCollaborateurs: 0,
    tauxRealisation: '0%',
    tauxCriticite: '0%',
    totalPoints: 0
  };

  // ── Listes filtres ──────────────────────────────────────────────
  collaborateursList: string[] = [];
  hrbpList:           string[] = [];
  practiceList:       string[] = [];
  monthsList:         string[] = [];

  // ── Valeurs sélectionnées ───────────────────────────────────────
  selectedPractice      = '';
  selectedMonth         = '';
  selectedCollaborateur = '';
  selectedHRBP          = '';

  // ── Données graphiques existants ─────────────────────────────────
  collabsPracticeLabels: string[] = [];
  collabsPracticeSeries: number[] = [];
  satisfactionLabels:    string[] = [];
  satisfactionSeries:    number[] = [];
  moodLabels:            string[] = [];
  moodSeries:            any[]    = [];
  monthsLabels:          string[] = [];
  evolutionPointsSeries: any[]    = [];
  statusLabels:          string[] = [];
  statusSeries:          number[] = [];

  // 🆕 NOUVEAUTÉS - Nouvelles métriques admin
  // 1️⃣ Évolution Satisfaction par collaborateur
  satisfactionEvolutionLabels: string[] = [];
  satisfactionEvolutionSeries: any[]    = [];

  // 2️⃣ Heatmap Titres
  heatmapTitlesSeries: any[] = [];

  // 3️⃣ Donut Criticité (nombre de collaborateurs)
  criticiteDonutLabels: string[] = [];
  criticiteDonutSeries: number[] = [];

  isLoading = false;
  charts: ApexCharts[] = [];

  readonly colors = {
    olive:  '#8fa840',
    rose:   '#e85d8a',
    orange: '#ff9a56',
    gray:   '#9ca3af',
    blue:   '#3b82f6',
    purple: '#8b5cf6',
    teal:   '#14b8a6'
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void  { this.fetchDashboard(); }
  ngOnDestroy(): void { this.charts.forEach(c => c.destroy()); }

  // ── Chargement données ──────────────────────────────────────────
  fetchDashboard(): void {
    this.isLoading = true;
    const satisfactionMapping: Record<string, string> = {
  '1': 'Très insatisfait',
  '2': 'Insatisfait', 
  '3': 'Neutre',
  '4': 'Satisfait',
  '5': 'Très satisfait'
};

    const filters = {
      ...(this.selectedMonth         && { month:           this.selectedMonth }),
      ...(this.selectedPractice      && { practiceId:      this.selectedPractice }),
      ...(this.selectedCollaborateur && { collaborateurId: this.selectedCollaborateur }),
    };

    this.dashboardService.getDashboard(filters).subscribe({
      next: (res) => {
        this.isLoading = false;

        // KPIs
        const k = res?.kpis || {};
        this.kpis = {
          totalCollaborateurs: k.totalCollaborateurs || 0,
          totalPoints:         k.totalPoints         || 0,
          tauxRealisation:     (k.tauxRealisation    || 0) + '%',
          tauxCriticite:       (k.tauxCriticite      || 0) + '%',
        };

        // Graphiques existants
        this.collabsPracticeLabels = res?.practiceLabels        || [];
        this.collabsPracticeSeries = res?.collabsPracticeSeries || [];
        this.statusLabels          = res?.statusLabels          || [];
        this.statusSeries          = res?.collabsStatusSeries   || [];
        this.monthsLabels          = res?.monthsXAxis           || [];
        this.evolutionPointsSeries = [{ name: 'Points', data: res?.evolutionPointsSeries || [] }];
        this.satisfactionLabels = (res?.satisfactionLabels || []).map((label: string) => 
         satisfactionMapping[label] || label
          );
        this.satisfactionSeries = res?.satisfactionSeries || [];

        // 🆕 NOUVEAUTÉS - Récupération des nouvelles métriques
        // 1️⃣ Évolution Satisfaction
         this.satisfactionEvolutionLabels = res?.satisfactionEvolution?.labels || [];
        this.satisfactionEvolutionSeries = res?.satisfactionEvolution?.series || [];

        // 2️⃣ Heatmap Titres
        this.heatmapTitlesSeries = res?.heatmapTitles?.series || [];

        // 3️⃣ Donut Criticité (collaborateurs)
        this.criticiteDonutLabels = res?.criticiteDonut?.labels || [];
        this.criticiteDonutSeries = res?.criticiteDonut?.series || [];

        // Mood multi-séries
        const moodData: Record<string, Record<string, number>> = res?.moodByDate || {};
        this.moodLabels = Object.keys(moodData).sort();
        const allMoods  = [...new Set(Object.values(moodData).flatMap(d => Object.keys(d)))];
        this.moodSeries = allMoods.map(mood => ({
          name: mood,
          data: this.moodLabels.map(date => moodData[date]?.[mood] || 0)
        }));

        // Alimentation des dropdowns de filtre
        this.practiceList = [...this.collabsPracticeLabels];
        this.monthsList   = [...this.monthsLabels];

        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erreur dashboard admin :', err);
      }
    });
  }

  // ── Rendu ApexCharts ────────────────────────────────────────────
  renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const createChart = (id: string, options: any) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Détection données vides
      const isEmpty = !options.series ||
        (Array.isArray(options.series) && options.series.length === 0) ||
        (Array.isArray(options.series) && options.series.every((s: any) =>
          Array.isArray(s)       ? s.length === 0 :
          Array.isArray(s?.data) ? s.data.every((v: number) => v === 0) :
          s === 0
        ));

      if (isEmpty) {
        el.innerHTML = `
          <div class="no-data">
            <span class="no-data-icon">📭</span>
            <p>Aucune donnée disponible</p>
          </div>`;
        return;
      }

      const base = {
        chart:   { fontFamily: "'Plus Jakarta Sans', sans-serif", toolbar: { show: false } },
        legend:  { position: 'bottom', fontSize: '13px' },
        tooltip: { theme: 'light' },
        grid:    { borderColor: '#f1f5f9', strokeDashArray: 4 },
      };
      const chart = new ApexCharts(el, { ...base, ...options });
      chart.render();
      this.charts.push(chart);
    };

    // 1. Donut — Collaborateurs par Practice (avec nombre + pourcentage)
    createChart('practiceChart', {
      chart:  { type: 'donut', height: 320 },
      series: this.collabsPracticeSeries,
      labels: this.collabsPracticeLabels,
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.gray],
      plotOptions: { 
        pie: { 
          donut: { 
            size: '68%',
            labels: { 
              show: true,
              value: { 
                fontSize: '22px', 
                fontWeight: 700,
                formatter: (val: number) => val.toString()
              },
              total: { 
                show: true, 
                label: 'Total', 
                fontSize: '13px',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return total.toString();
                }
              }
            }
          }
        }
      },
      dataLabels: { 
        enabled: true,
        formatter: (val: number, opts: any) => {
          const value = opts.w.globals.series[opts.seriesIndex];
          const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
          return `${value} (${percentage}%)`;
        },
        style: {
          fontSize: '12px',
          fontWeight: '600',
          colors: ['#374151']
        },
        dropShadow: { enabled: false }
      },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return `${val} collaborateurs (${percentage}%)`;
          }
        }
      },
      title: { 
        text: 'Collaborateurs par Practice', 
        align: 'left',
        style: { fontSize: '14px', fontWeight: '600', color: '#374151' } 
      }
    });

    
    // 2. Bar — Distribution Satisfaction (avec labels textuels)
createChart('satisfactionChart', {
  chart:  { type: 'bar', height: 320 },
  series: [{ name: 'Réponses', data: this.satisfactionSeries }],
  xaxis:  { 
    categories: this.satisfactionLabels,  // ← Maintenant: ['Très insatisfait', 'Insatisfait', ...]
    title: { text: 'Niveau de satisfaction', style: { color: '#6b7280' } },
    labels: { 
      style: { fontSize: '11px' },
      rotate: -15  // ← Rotation pour meilleure lisibilité
    } 
  },
  yaxis:  { title: { text: 'Nombre de réponses', style: { color: '#6b7280' } } },
  colors: [this.colors.olive],
  plotOptions: { 
    bar: { 
      borderRadius: 6, 
      columnWidth: '60%',
      dataLabels: { position: 'top' } 
    } 
  },
  dataLabels: { 
    enabled: true, 
    offsetY: -20,
    style: { fontSize: '12px', colors: ['#374151'], fontWeight: '600' } 
  },
  title: { 
    text: 'Distribution de la Satisfaction', 
    align: 'left',
    style: { fontSize: '14px', fontWeight: '600', color: '#374151' } 
  }
});

    // 🆕 3. Line — Évolution Satisfaction par Collaborateur
createChart('satisfactionEvolutionChart', {
  chart:  { type: 'line', height: 320, stacked: false },
  series: this.satisfactionEvolutionSeries.map((s: any) => ({
    ...s,
    name: this.satisfactionMapping[s.name.replace('Note ', '')] || s.name  // ← "Note 1" → "Très insatisfait"
  })),
  xaxis:  { 
    categories: this.satisfactionEvolutionLabels,
    title: { text: 'Mois', style: { color: '#6b7280' } },
    labels: { rotate: -45, style: { fontSize: '10px' } } 
  },
  yaxis:  { title: { text: 'Nombre de collaborateurs', style: { color: '#6b7280' } } },
  stroke: { curve: 'smooth', width: 2 },
  colors: [this.colors.rose, this.colors.orange, this.colors.olive, this.colors.teal, this.colors.blue],
  markers: { size: 4 },
  legend: { 
    position: 'top',
  },
  title: { 
    text: 'Évolution Satisfaction par Collaborateur', 
    align: 'left',
    style: { fontSize: '14px', fontWeight: '600', color: '#374151' } 
  }
});

    // 🆕 4. Heatmap — Titres des Points (NOUVEAU)
    createChart('heatmapTitlesChart', {
      chart:  { type: 'heatmap', height: 400 },
      series: [{ name: 'Collaborateurs', data: this.heatmapTitlesSeries }],
      plotOptions: { heatmap: {
        shadeIntensity: 0.5,
        radius: 4,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: '#f3f4f6', name: 'Aucun' },
            { from: 1, to: 5, color: this.colors.olive, name: 'Faible' },
            { from: 6, to: 15, color: this.colors.orange, name: 'Moyen' },
            { from: 16, to: 999, color: this.colors.rose, name: 'Élevé' }
          ]
        }
      }},
      dataLabels: { enabled: true, style: { colors: ['#374151'] } },
      xaxis: { title: { text: 'Titres des points', style: { color: '#6b7280' } } },
      yaxis: { show: false },
      title: { text: 'Répartition par Titre de Point', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 🆕 5. Donut — Répartition Criticité (NOUVEAU - collaborateurs avec nombre + pourcentage)
    createChart('criticiteDonutChart', {
      chart:  { type: 'donut', height: 320 },
      series: this.criticiteDonutSeries,
      labels: this.criticiteDonutLabels,
      colors: [this.colors.rose, this.colors.orange, this.colors.olive, this.colors.gray],
      plotOptions: { 
        pie: { 
          donut: { 
            size: '68%',
            labels: { 
              show: true,
              value: { 
                fontSize: '22px', 
                fontWeight: 700,
                formatter: (val: number) => val.toString()
              },
              total: { 
                show: true, 
                label: 'Collaborateurs', 
                fontSize: '13px',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return total.toString();
                }
              }
            }
          }
        }
      },
      dataLabels: { 
        enabled: true,
        formatter: (val: number, opts: any) => {
          const value = opts.w.globals.series[opts.seriesIndex];
          const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
          return `${value} (${percentage}%)`;
        },
        style: {
          fontSize: '12px',
          fontWeight: '600',
          colors: ['#374151']
        },
        dropShadow: { enabled: false }
      },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return `${val} collaborateurs (${percentage}%)`;
          }
        }
      },
      title: { 
        text: 'Collaborateurs par Criticité', 
        align: 'left',
        style: { fontSize: '14px', fontWeight: '600', color: '#374151' } 
      }
    });

    // 6. Line — Évolution des Moods
    createChart('moodChart', {
      chart:  { type: 'line', height: 320 },
      series: this.moodSeries,
      xaxis:  { categories: this.moodLabels,
                labels: { rotate: -45, style: { fontSize: '10px' } } },
      stroke: { curve: 'smooth', width: 2 },
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.gray],
      markers: { size: 4 },
      title: { text: 'Évolution des Moods', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 7. Area — Évolution des Points
    createChart('evolutionPointsChart', {
      chart:  { type: 'area', height: 320 },
      series: this.evolutionPointsSeries,
      xaxis:  { categories: this.monthsLabels,
                title: { text: 'Mois', style: { color: '#6b7280' } } },
      stroke: { curve: 'smooth', width: 2 },
      fill:   { type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      colors: [this.colors.orange],
      markers: { size: 4 },
      title: { text: 'Évolution des Points', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 8. Donut — Points par Statut (avec nombre + pourcentage)
    createChart('statusChart', {
      chart:  { type: 'donut', height: 320 },
      series: this.statusSeries,
      labels: this.statusLabels,
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.gray],
      plotOptions: { 
        pie: { 
          donut: { 
            size: '68%',
            labels: { 
              show: true,
              value: { 
                fontSize: '22px', 
                fontWeight: 700,
                formatter: (val: number) => val.toString()
              },
              total: { 
                show: true, 
                label: 'Total Points', 
                fontSize: '13px',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return total.toString();
                }
              }
            }
          }
        }
      },
      dataLabels: { 
        enabled: true,
        formatter: (val: number, opts: any) => {
          const value = opts.w.globals.series[opts.seriesIndex];
          const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
          return `${value} (${percentage}%)`;
        },
        style: {
          fontSize: '12px',
          fontWeight: '600',
          colors: ['#374151']
        },
        dropShadow: { enabled: false }
      },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return `${val} points (${percentage}%)`;
          }
        }
      },
      title: { 
        text: 'Points par Statut', 
        align: 'left',
        style: { fontSize: '14px', fontWeight: '600', color: '#374151' } 
      }
    });
  }

  onFilterChange(): void { this.fetchDashboard(); }

  resetFilters(): void {
    this.selectedPractice      = '';
    this.selectedMonth         = '';
    this.selectedCollaborateur = '';
    this.selectedHRBP          = '';
    this.fetchDashboard();
  }
}
