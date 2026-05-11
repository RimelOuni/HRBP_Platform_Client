
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import ApexCharts from 'apexcharts';
import { DashboardService, DashboardFilters } from '../../core/services/dashboard.service';

// Interfaces pour les données
interface KPIs {
  totalCollaborateurs: number;
  totalPoints: number;
  tauxRealisation: number;
  tauxCriticite: number;
}

interface FilterItem {
  id: string;
  name: string;
}

@Component({
  selector: 'app-dashboard-direction',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './dashboard-direction.html',
  styleUrls: ['./dashboard-direction.css']
})
export class DashboardDirection implements OnInit, OnDestroy {
  private readonly satisfactionMapping: Record<string, string> = {
    '1': 'Très insatisfait',
    '2': 'Insatisfait',
    '3': 'Neutre',
    '4': 'Satisfait',
    '5': 'Très satisfait'
  };
  // ==================== KPIs ====================
  kpis: KPIs = {
    totalCollaborateurs: 0,
    totalPoints: 0,
    tauxRealisation: 0,
    tauxCriticite: 0
  };

  // ==================== FILTRES ====================
  selectedPractice = '';
  selectedHRBP = '';
  selectedMonth = '';
  selectedCollaborateur = '';

  practiceList: FilterItem[] = [];
  hrbpList: FilterItem[] = [];
  monthsList: string[] = [];
  collaborateursList: FilterItem[] = [];

  // ==================== CHART DATA (même structure que Admin) ====================
  
  // Donuts existants
  practiceLabels: string[] = [];
  collabsPracticeSeries: number[] = [];
  
  statusLabels: string[] = [];
  collabsStatusSeries: number[] = [];
  
  // Satisfaction globale
  satisfactionLabels: string[] = [];
  satisfactionSeries: number[] = [];
  
  // Évolutions
  monthsXAxis: string[] = [];
  evolutionPointsSeries: any[] = [];
  
  // Mood
  moodByDate: any = {};
  moodLabels: string[] = [];
  moodSeries: any[] = [];

  // 🆕 NOUVEAUTÉS - Mêmes métriques que Admin
  // 1️⃣ Évolution Satisfaction par collaborateur
  satisfactionEvolutionLabels: string[] = [];
  satisfactionEvolutionSeries: any[] = [];

  // 2️⃣ Heatmap Titres
  heatmapTitlesSeries: any[] = [];

  // 3️⃣ Donut Criticité (nombre de collaborateurs)
  criticiteDonutLabels: string[] = [];
  criticiteDonutSeries: number[] = [];

  // Couleurs du thème (mêmes que Admin)
  colors = {
    olive: '#8fa840',
    rose: '#e85d8a',
    orange: '#ff9a56',
    gray: '#9ca3af',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    teal: '#14b8a6'
  };

  // Stockage des instances de charts pour destruction
  private charts: ApexCharts[] = [];

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.fetchFilters();
    this.fetchDashboard();
  }

  ngOnDestroy(): void {
    // Nettoyer les charts pour éviter les fuites mémoire
    this.charts.forEach(chart => chart.destroy());
  }

  // ==================== FETCH DASHBOARD ====================
  fetchDashboard(): void {
    const satisfactionMapping: Record<string, string> = {
  '1': 'Très insatisfait',
  '2': 'Insatisfait', 
  '3': 'Neutre',
  '4': 'Satisfait',
  '5': 'Très satisfait'
};
    const filters: DashboardFilters = {
      practiceId: this.selectedPractice,
      hrbp: this.selectedHRBP,
      month: this.selectedMonth,
      collaborateurId: this.selectedCollaborateur
    };

    this.dashboardService.getDashboardDirection(filters).subscribe({
      next: (res) => {
        console.log('Dashboard Direction response:', res);
        
        // ===== KPIs (même structure que Admin) =====
        const k = res?.kpis || {};
        this.kpis.totalCollaborateurs = k.totalCollaborateurs || 0;
        this.kpis.totalPoints = k.totalPoints || 0;
        this.kpis.tauxRealisation = k.tauxRealisation || 0;
        this.kpis.tauxCriticite = k.tauxCriticite || 0;

        // ===== Donuts (même structure que Admin) =====
        this.practiceLabels = res?.practiceLabels || [];
        this.collabsPracticeSeries = res?.collabsPracticeSeries || [];
        
        this.statusLabels = res?.statusLabels || [];
        this.collabsStatusSeries = res?.collabsStatusSeries || [];

        // ===== Satisfaction globale (même structure que Admin) =====
        this.satisfactionLabels = (res?.satisfactionLabels || []).map((label: string) => 
         satisfactionMapping[label] || label
          );
        this.satisfactionSeries = res?.satisfactionSeries || [];

        // ===== Évolution Points (même structure que Admin) =====
        this.monthsXAxis = res?.monthsXAxis || [];
        this.evolutionPointsSeries = [{ name: 'Points', data: res?.evolutionPointsSeries || [] }];

        // ===== Mood (même structure que Admin) =====
        const moodData: Record<string, Record<string, number>> = res?.moodByDate || {};
        this.moodLabels = Object.keys(moodData).sort();
        const allMoods = [...new Set(Object.values(moodData).flatMap(d => Object.keys(d)))];
        this.moodSeries = allMoods.map(mood => ({
          name: mood,
          data: this.moodLabels.map(date => moodData[date]?.[mood] || 0)
        }));

        // 🆕 NOUVEAUTÉS - Mêmes métriques que Admin
        // 1️⃣ Évolution Satisfaction par collaborateur
        this.satisfactionEvolutionLabels = res?.satisfactionEvolution?.labels || [];
        this.satisfactionEvolutionSeries = res?.satisfactionEvolution?.series || [];

        // 2️⃣ Heatmap Titres
        this.heatmapTitlesSeries = res?.heatmapTitles?.series || [];

        // 3️⃣ Donut Criticité (collaborateurs)
        this.criticiteDonutLabels = res?.criticiteDonut?.labels || [];
        this.criticiteDonutSeries = res?.criticiteDonut?.series || [];

        // Rendu des charts après mise à jour des données
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => console.error('Erreur dashboard direction :', err)
    });
  }

  // ==================== FETCH FILTERS ====================
  fetchFilters(): void {
    this.dashboardService.getDirectionFilters().subscribe({
      next: (res) => {
        console.log('Filters Direction response:', res);
        this.practiceList = res.practices || [];
        this.hrbpList = res.hrbps || [];
        this.monthsList = res.months || [];
        this.collaborateursList = res.collaborateurs || [];
      },
      error: (err) => console.error('Erreur filters direction :', err)
    });
  }

  // ==================== RENDER CHARTS ====================
  renderCharts(): void {
    // Nettoyer les anciens charts
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];

    const createChart = (id: string, options: any) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Détection données vides
      const isEmpty = !options.series ||
        (Array.isArray(options.series) && options.series.length === 0) ||
        (Array.isArray(options.series) && options.series.every((s: any) =>
          Array.isArray(s) ? s.length === 0 :
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
        chart: { fontFamily: "'Plus Jakarta Sans', sans-serif", toolbar: { show: false } },
        legend: { position: 'bottom', fontSize: '13px' },
        tooltip: { theme: 'light' },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      };
      const chart = new ApexCharts(el, { ...base, ...options });
      chart.render();
      this.charts.push(chart);
    };

    // 1. Donut — Collaborateurs par Practice (même que Admin)
    createChart('practiceChart', {
      chart: { type: 'donut', height: 320 },
      series: this.collabsPracticeSeries,
      labels: this.practiceLabels,
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.gray],
      plotOptions: { pie: { donut: { size: '68%',
        labels: { show: true,
          value: { fontSize: '22px', fontWeight: 700 },
          total: { show: true, label: 'Total', fontSize: '13px',
            formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
          }
        }
      }}},
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
      title: { text: 'Collaborateurs par Practice', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 2. Donut — Points par Statut (même que Admin)
    createChart('statusChart', {
      chart: { type: 'donut', height: 320 },
      series: this.collabsStatusSeries,
      labels: this.statusLabels,
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.gray],
      plotOptions: { pie: { donut: { size: '68%',
        labels: { show: true,
          value: { fontSize: '22px', fontWeight: 700 },
          total: { show: true, label: 'Total Points', fontSize: '13px',
            formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
          }
        }
      }}},
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
      title: { text: 'Points par Statut', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 3. Bar — Distribution Satisfaction (globale, même que Admin)
    createChart('satisfactionChart', {
      chart: { type: 'bar', height: 320 },
      series: [{ name: 'Réponses', data: this.satisfactionSeries }],
      xaxis: { categories: this.satisfactionLabels,
                title: { text: 'Note', style: { color: '#6b7280' } } },
      yaxis: { title: { text: 'Nombre', style: { color: '#6b7280' } } },
      colors: [this.colors.olive],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '50%',
        dataLabels: { position: 'top' } } },
      dataLabels: { enabled: true, offsetY: -20,
                    style: { fontSize: '12px', colors: ['#374151'] } },
      title: { text: 'Distribution de la Satisfaction', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 🆕 4. Line — Évolution Satisfaction par Collaborateur (NOUVEAU)
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

    // 🆕 5. Heatmap — Titres des Points (NOUVEAU)
    createChart('heatmapTitlesChart', {
      chart: { type: 'heatmap', height: 400 },
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

    // 🆕 6. Donut — Répartition Criticité (NOUVEAU - collaborateurs)
    createChart('criticiteDonutChart', {
      chart: { type: 'donut', height: 320 },
      series: this.criticiteDonutSeries,
      labels: this.criticiteDonutLabels,
      colors: [this.colors.rose, this.colors.orange, this.colors.olive, this.colors.gray],
      plotOptions: { pie: { donut: { size: '68%',
        labels: { show: true,
          value: { fontSize: '22px', fontWeight: 700 },
          total: { show: true, label: 'Collaborateurs', fontSize: '13px',
            formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
          }
        }
      }}},
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
      title: { text: 'Collaborateurs par Criticité', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 7. Line — Évolution des Moods (même que Admin)
    createChart('moodChart', {
      chart: { type: 'line', height: 320 },
      series: this.moodSeries,
      xaxis: { categories: this.moodLabels,
                labels: { rotate: -45, style: { fontSize: '10px' } } },
      stroke: { curve: 'smooth', width: 2 },
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.gray],
      markers: { size: 4 },
      title: { text: 'Évolution des Moods', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });

    // 8. Area — Évolution des Points (même que Admin)
    createChart('evolutionPointsChart', {
      chart: { type: 'area', height: 320 },
      series: this.evolutionPointsSeries,
      xaxis: { categories: this.monthsXAxis,
                title: { text: 'Mois', style: { color: '#6b7280' } } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient',
              gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      colors: [this.colors.orange],
      markers: { size: 4 },
      title: { text: 'Évolution des Points', align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });
  }

  // ==================== FILTRE CHANGE ====================
  onFilterChange(): void {
    this.fetchDashboard();
  }

  // ==================== RESET FILTERS ====================
  resetFilters(): void {
    this.selectedPractice = '';
    this.selectedHRBP = '';
    this.selectedMonth = '';
    this.selectedCollaborateur = '';
    this.fetchDashboard();
  }
}
