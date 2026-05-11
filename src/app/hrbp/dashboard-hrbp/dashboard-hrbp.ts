import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import ApexCharts from 'apexcharts';
import { DashboardService, DashboardFilters } from '../../core/services/dashboard.service';

interface CollaborateurFilter {
  id: string;
  name: string;
}

interface PracticeFilter {
  id: string;
  name: string;
}

@Component({
  selector: 'app-dashboard-hrbp',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule], // ✅ CORRECTION : était imports: []
  templateUrl: './dashboard-hrbp.html',
  styleUrl: './dashboard-hrbp.css',
})
export class DashboardHRBP implements OnInit, OnDestroy { // ✅ implements ajoutés
// Mapping des notes vers labels textuels
  private readonly satisfactionMapping: Record<string, string> = {
    '1': 'Très insatisfait',
    '2': 'Insatisfait',
    '3': 'Neutre',
    '4': 'Satisfait',
    '5': 'Très satisfait'
  };
  // ==================== KPIs ====================
  kpis = {
    totalCollaborateurs: 0,
    totalPoints: 0,
    tauxRealisation: '0%',
    tauxCriticite: '0%'
  };

  // ==================== FILTRES ====================
  selectedMonth         = '';
  selectedCollaborateur = '';
  selectedPractice      = '';
  selectedGrade         = '';

  monthsList:          string[]               = [];
  collaborateursList:  CollaborateurFilter[]  = [];
  practiceList:        PracticeFilter[]       = [];
  gradeList:           string[]               = ['Junior', 'Confirmé', 'Senior', 'Expert', 'Manager'];

  // ==================== CHART DATA ====================
  collabsPracticeLabels:  string[] = [];
  collabsPracticeSeries:  number[] = [];
  collabsGradeLabels:     string[] = [];
  collabsGradeSeries:     number[] = [];
  pointsStatusLabels:     string[] = [];
  pointsStatusSeries:     number[] = [];
  collabsKeypointLabels:  string[] = [];
  collabsKeypointSeries:  number[] = [];

  evolutionPointsLabels:  string[] = [];
  evolutionPointsSeries:  any[]    = [];
  criticiteLabels:        string[] = [];
  criticiteSeries:        any[]    = [];
  pointsParCollabLabels:  string[] = [];
  pointsParCollabSeries:  any[]    = [];
  moodLabels:             string[] = [];
  moodSeries:             any[]    = [];
  satisfactionLabels:     string[] = [];
  satisfactionSeries:     any[]    = [];

  private chartInstances: ApexCharts[] = [];

  readonly colors = {
    olive:  '#8fa840',
    rose:   '#e85d8a',
    orange: '#ff9a56',
    gray:   '#9ca3af',
    blue:   '#3b82f6',
    purple: '#8b5cf6'
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.fetchFilters();
    this.fetchDashboard();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // ==================== FETCH DATA ====================
  fetchFilters(): void {
    this.dashboardService.getHRBPFilters().subscribe({
      next: res => {
        this.monthsList         = res?.months         || [];
        this.collaborateursList = res?.collaborateurs || [];
        this.practiceList       = res?.practices      || [];
      },
      error: err => console.error('Erreur filtres HRBP :', err)
    });
  }

  fetchDashboard(): void {
    const satisfactionMapping: Record<string, string> = {
  '1': 'Très insatisfait',
  '2': 'Insatisfait', 
  '3': 'Neutre',
  '4': 'Satisfait',
  '5': 'Très satisfait'
};
    const filters: DashboardFilters = {};
    if (this.selectedMonth)         filters.month           = this.selectedMonth;
    if (this.selectedCollaborateur) filters.collaborateurId = this.selectedCollaborateur;
    if (this.selectedPractice)      filters.practiceId      = this.selectedPractice;
    if (this.selectedGrade)         filters.grade           = this.selectedGrade;

    this.dashboardService.getDashboardHRBP(filters).subscribe({
      next: res => {
        this.updateKPIs(res);
        this.updateChartData(res);
        setTimeout(() => this.renderCharts(), 100);
      },
      error: err => console.error('Erreur dashboard HRBP :', err)
    });
  }

  private updateKPIs(res: any): void {
    const k = res?.kpis || {};
    this.kpis.totalCollaborateurs = k.totalCollaborateurs || 0;
    this.kpis.totalPoints         = k.totalPoints         || 0;
    this.kpis.tauxRealisation     = (k.tauxRealisation    || 0) + '%';
    this.kpis.tauxCriticite       = (k.tauxCriticite      || 0) + '%';
  }

  private updateChartData(res: any): void {
    this.collabsPracticeLabels = res?.collabsPractice?.labels   || [];
    this.collabsPracticeSeries = res?.collabsPractice?.series   || [];
    this.collabsGradeLabels    = res?.collabsGrade?.labels      || [];
    this.collabsGradeSeries    = res?.collabsGrade?.series      || [];
    this.pointsStatusLabels    = res?.pointsStatus?.labels      || [];
    this.pointsStatusSeries    = res?.pointsStatus?.series      || [];
    this.collabsKeypointLabels = res?.collabsKeypoint?.labels   || [];
    this.collabsKeypointSeries = res?.collabsKeypoint?.series   || [];

    this.evolutionPointsLabels = res?.pointsEvolution?.labels   || [];
    this.evolutionPointsSeries = res?.pointsEvolution?.series   || [];
    this.criticiteLabels       = res?.criticiteEvolution?.labels || [];
    this.criticiteSeries       = res?.criticiteEvolution?.series || [];
    this.moodLabels            = res?.moodEvolution?.labels     || [];
    this.moodSeries            = res?.moodEvolution?.series     || [];
    this.satisfactionLabels = (res?.satisfactionEvolution?.labels || []).map((label: string) =>
    this.satisfactionMapping[label] || label
);

    this.satisfactionSeries = (res?.satisfactionEvolution?.series || []).map((s: any) => ({
  ...s,
  name: this.satisfactionMapping[s.name?.replace('Note ', '')] || s.name
}));
    this.pointsParCollabLabels = res?.pointsParCollab?.labels   || [];
    this.pointsParCollabSeries = res?.pointsParCollab?.series   || [];

    if (res?.filters) {
      if (res.filters.months?.length)        this.monthsList         = res.filters.months;
      if (res.filters.collaborateurs?.length) this.collaborateursList = res.filters.collaborateurs;
    }
  }

  // ==================== RENDER CHARTS ====================
  private destroyCharts(): void {
    this.chartInstances.forEach(c => { try { c.destroy(); } catch (e) {} });
    this.chartInstances = [];
  }

  renderCharts(): void {
    this.destroyCharts();

    this.createDonutChart('collabsPracticeChart', {
      series: this.collabsPracticeSeries, labels: this.collabsPracticeLabels,
      title: 'Collaborateurs par Practice',
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.blue]
    });
    this.createDonutChart('collabsGradeChart', {
      series: this.collabsGradeSeries, labels: this.collabsGradeLabels,
      title: 'Collaborateurs par Grade',
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.gray, this.colors.blue]
    });
    this.createDonutChart('pointsStatusChart', {
      series: this.pointsStatusSeries, labels: this.pointsStatusLabels,
      title: 'Points par Status',
      colors: [this.colors.olive, this.colors.orange, this.colors.rose, this.colors.gray]
    });
    this.createDonutChart('collabsKeypointChart', {
      series: this.collabsKeypointSeries, labels: this.collabsKeypointLabels,
      title: 'Points par Criticité',
      colors: [this.colors.rose, this.colors.orange, this.colors.olive, this.colors.gray]
    });
    this.createLineChart('evolutionPointsChart', {
      series: this.evolutionPointsSeries, labels: this.evolutionPointsLabels,
      title: 'Évolution des Points',
      colors: [this.colors.olive, this.colors.orange]
    });
    this.createLineChart('criticiteChart', {
      series: this.criticiteSeries, labels: this.criticiteLabels,
      title: 'Évolution par Criticité',
      colors: [this.colors.rose, this.colors.orange, this.colors.olive]
    });
    this.createBarChart('pointsParCollabChart', {
  series: this.pointsParCollabSeries,
  labels: this.pointsParCollabLabels,
  title: 'Points par Collaborateur',
  color: this.colors.orange,
  dataLabels: {
    enabled: true,           // ✅ activer les étiquettes
    formatter: (val: number) => val.toString(), // afficher la valeur brute
    style: {
      fontSize: '12px',
      fontWeight: '600',
      colors: ['#374151']   // couleur du texte
    }
  }
});
    this.createLineChart('moodChart', {
      series: this.moodSeries, labels: this.moodLabels,
      title: 'Évolution des Moods',
      colors: [this.colors.olive, this.colors.rose, this.colors.orange, this.colors.blue, this.colors.purple]
    });
    this.createLineChart('satisfactionChart', {
  series: this.satisfactionSeries,
  labels: this.satisfactionLabels,
  title: 'Évolution de la Satisfaction',
  colors: [
    this.colors.rose,
    this.colors.orange,
    this.colors.olive,
    this.colors.blue,
    this.colors.purple
  ],
  legend: { 
  position: 'top',
  fontSize: '12px'
},
});
  }

  private createDonutChart(id: string, config: any): void {
    const el = document.getElementById(id);
    if (!el) return;
    if (!config.series?.length) {
      el.innerHTML = '<div class="no-data"><span>📭</span><p>Aucune donnée</p></div>';
      return;
    }
    const chart = new ApexCharts(el, {
      chart: { type: 'donut', height: 320, fontFamily: "'Plus Jakarta Sans', sans-serif" },
      series: config.series, labels: config.labels,
      colors: config.colors || Object.values(this.colors),
      title: { text: config.title, align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } },
      plotOptions: { pie: { donut: { size: '65%',
        labels: { show: true, value: { fontSize: '20px', fontWeight: 700 },
          total: { show: true, label: 'Total',
            formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
          }
        }
      }}},
      legend: { position: 'bottom', fontSize: '12px' },
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
  theme: 'light',
  y: {
    formatter: (val: number, opts: any) => {
      const total = opts.w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
      const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
      return `${val} (${percentage}%)`;
    }
  }
},
    });
    chart.render();
    this.chartInstances.push(chart);
  }

  private createLineChart(id: string, config: any): void {
    const el = document.getElementById(id);
    if (!el) return;
    if (!config.series?.length || !config.labels?.length) {
      el.innerHTML = '<div class="no-data"><span>📭</span><p>Aucune donnée</p></div>';
      return;
    }
    const chart = new ApexCharts(el, {
      chart: { type: 'line', height: 320, fontFamily: "'Plus Jakarta Sans', sans-serif",
               toolbar: { show: false } },
      series: config.series,
      xaxis: { categories: config.labels, labels: { style: { fontSize: '11px' } } },
      colors: config.colors || [this.colors.olive],
      stroke: { curve: 'smooth', width: 2 },
      markers: { size: 4 },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      legend: { position: 'bottom', fontSize: '12px' },
      tooltip: { theme: 'light' },
      title: { text: config.title, align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });
    chart.render();
    this.chartInstances.push(chart);
  }

  private createBarChart(id: string, config: any): void {
    const el = document.getElementById(id);
    if (!el) return;
    if (!config.series?.length || !config.labels?.length) {
      el.innerHTML = '<div class="no-data"><span>📭</span><p>Aucune donnée</p></div>';
      return;
    }
    const chart = new ApexCharts(el, {
      chart: { type: 'bar', height: 320, fontFamily: "'Plus Jakarta Sans', sans-serif",
               toolbar: { show: false } },
      series: config.series,
      xaxis: { categories: config.labels, labels: { style: { fontSize: '10px' }, rotate: -45 } },
      colors: [config.color || this.colors.orange],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      legend: { position: 'bottom', fontSize: '12px' },
      tooltip: { theme: 'light' },
      title: { text: config.title, align: 'left',
               style: { fontSize: '14px', fontWeight: '600', color: '#374151' } }
    });
    chart.render();
    this.chartInstances.push(chart);
  }

  // ==================== EVENTS ====================
  onFilterChange(): void { this.fetchDashboard(); }

  resetFilters(): void {
    this.selectedMonth         = '';
    this.selectedCollaborateur = '';
    this.selectedPractice      = '';
    this.selectedGrade         = '';
    this.fetchDashboard();
  }
}