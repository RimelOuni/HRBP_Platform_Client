import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Point, PointService } from '../../../core/services/point';
import { ActionService } from '../../../core/services/action';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-points-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './points-list.html',
  styleUrls: ['./points-list.css']
})
export class PointsList implements OnInit {
  points: Point[] = [];
  filteredPoints: Point[] = [];
  isLoading = false;
  isExporting = false;

  statusFilter = '';
  criticiteFilter = '';
  searchTitle = '';
  searchDate = '';
  search = '';
frequenceFilter = '';
  selectedPoints: string[] = [];

  constructor(
    private pointService: PointService,
    private actionService: ActionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadPoints();
  }

  loadPoints() {
    this.isLoading = true;
    const hrbp = this.authService.getUser();
    const hrbpId = hrbp?.id || hrbp?._id;

    if (!hrbpId) {
      console.error('❌ No HRBP ID found — user may not be authenticated');
      this.isLoading = false;
      return;
    }

    this.pointService.getPointsByHrbp(hrbpId).subscribe({
      next: (points: Point[]) => {
        this.points = Array.isArray(points) ? points : [];
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading points:', error);
        this.points = [];
        this.filteredPoints = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
applyFilters() {
  let filtered = [...this.points];

  if (this.statusFilter) {
    filtered = filtered.filter(p => p.status === this.statusFilter);
  }

  if (this.criticiteFilter) {
    filtered = filtered.filter(p => p.criticite === this.criticiteFilter);
  }

  if (this.frequenceFilter) {
    filtered = filtered.filter(p => p.frequence === this.frequenceFilter);
  }

  if (this.searchTitle.trim()) {
    const searchLower = this.searchTitle.toLowerCase().trim();
    filtered = filtered.filter(p => p.titre?.toLowerCase().includes(searchLower));
  }

  if (this.searchDate) {
    const searchDateObj = new Date(this.searchDate);
    filtered = filtered.filter(p => {
      const pointDate = new Date(p.date);
      return pointDate.toDateString() === searchDateObj.toDateString();
    });
  }

  this.filteredPoints = filtered;
}

  // ── KEY FIX: single method that handles all invite shapes ──
  /**
   * invite is stored as `type: Object` in Mongoose — it can arrive as:
   *   - null / undefined / empty {}
   *   - a plain object: { first_name, last_name } or { prenom, nom }
   *   - an array of the above objects
   * This method resolves all cases to a display string.
   */
  getInviteLabel(invite: any): string {
    if (!invite) return '—';

    // Helper to extract a full name from a single person object
    const personName = (p: any): string => {
      if (!p || typeof p !== 'object') return '';
      const first = p.first_name || p.prenom || '';
      const last  = p.last_name  || p.nom   || '';
      return `${first} ${last}`.trim();
    };

    // Array of persons
    if (Array.isArray(invite)) {
      if (invite.length === 0) return '—';
      const names = invite.map(personName).filter(Boolean);
      return names.length > 0 ? names.join(', ') : '—';
    }

    // Plain object — but make sure it's not empty {}
    if (typeof invite === 'object') {
      const name = personName(invite);
      return name || '—';
    }

    return '—';
  }

  toggleSelection(pointId: string) {
    const index = this.selectedPoints.indexOf(pointId);
    if (index > -1) {
      this.selectedPoints.splice(index, 1);
    } else {
      this.selectedPoints.push(pointId);
    }
  }

  isSelected(pointId: string): boolean {
    return this.selectedPoints.includes(pointId);
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedPoints = [];
    } else {
      this.selectedPoints = this.filteredPoints.map(p => p._id);
    }
  }

  isAllSelected(): boolean {
    return this.filteredPoints.length > 0 &&
      this.selectedPoints.length === this.filteredPoints.length;
  }

  clearSelection() {
    this.selectedPoints = [];
  }

  trackByPointId(_: number, point: Point): string {
    return point._id;
  }

  // ============================================
  // EXPORT METHODS
  // ============================================

  async exportToExcel(): Promise<void> {
    if (this.selectedPoints.length === 0) {
      alert('Veuillez sélectionner au moins un point à exporter');
      return;
    }

    this.isExporting = true;

    try {
      const selectedPointsData = await this.getSelectedPointsWithActions();

      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Export Points');

      const COLOR_POINT_HEADER_BG  = 'FF2E4057';
      const COLOR_POINT_COL_BG     = 'FF048A81';
      const COLOR_ACTION_HEADER_BG = 'FFE84855';
      const COLOR_ACTION_COL_BG    = 'FFFF6B6B';
      const COLOR_WHITE             = 'FFFFFFFF';
      const COLOR_ROW_ODD           = 'FFF0F7F6';
      const COLOR_ROW_EVEN          = 'FFFFFFFF';

      const pointColumns = [
        { label: 'Titre',          width: 28 },
        { label: 'Date',           width: 16 },
        { label: 'Status',         width: 16 },
        { label: 'Criticité',      width: 14 },
        { label: 'Durée Estimée',  width: 16 },
        { label: 'Fréquence',      width: 14 },
        { label: 'Récurrent',      width: 12 },
        { label: 'Description',    width: 32 },
        { label: 'Créé par',       width: 22 },
        { label: 'Email créateur', width: 26 },
        { label: 'Date création',  width: 18 },
        { label: 'Dernière MAJ',   width: 18 },
      ];

      const actionColumns = [
        { label: 'Titre',          width: 28 },
        { label: 'Description',    width: 32 },
        { label: 'Priorité',       width: 14 },
        { label: 'Créé par',       width: 22 },
        { label: 'Email créateur', width: 26 },
        { label: 'Date création',  width: 18 },
        { label: 'Dernière MAJ',   width: 18 },
      ];

      const totalPointCols  = pointColumns.length;
      const totalActionCols = actionColumns.length;
      const totalCols       = totalPointCols + totalActionCols;

      [...pointColumns, ...actionColumns].forEach((col, i) => {
        sheet.getColumn(i + 1).width = col.width;
      });

      // Row 1 – group headers
      const row1 = sheet.getRow(1);
      row1.height = 28;

      const pointGroupCell = row1.getCell(1);
      pointGroupCell.value = 'POINT';
      pointGroupCell.font  = { name: 'Arial', bold: true, size: 13, color: { argb: COLOR_WHITE } };
      pointGroupCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_POINT_HEADER_BG } };
      pointGroupCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.mergeCells(1, 1, 1, totalPointCols);

      const actionGroupCell = row1.getCell(totalPointCols + 1);
      actionGroupCell.value = 'ACTION';
      actionGroupCell.font  = { name: 'Arial', bold: true, size: 13, color: { argb: COLOR_WHITE } };
      actionGroupCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACTION_HEADER_BG } };
      actionGroupCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.mergeCells(1, totalPointCols + 1, 1, totalCols);

      // Row 2 – column headers
      const row2 = sheet.getRow(2);
      row2.height = 22;

      pointColumns.forEach((col, i) => {
        const cell = row2.getCell(i + 1);
        cell.value = col.label;
        cell.font  = { name: 'Arial', bold: true, size: 10, color: { argb: COLOR_WHITE } };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_POINT_COL_BG } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: COLOR_WHITE } },
          right:  { style: 'thin', color: { argb: COLOR_WHITE } },
        };
      });

      actionColumns.forEach((col, i) => {
        const cell = row2.getCell(totalPointCols + i + 1);
        cell.value = col.label;
        cell.font  = { name: 'Arial', bold: true, size: 10, color: { argb: COLOR_WHITE } };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACTION_COL_BG } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: COLOR_WHITE } },
          right:  { style: 'thin', color: { argb: COLOR_WHITE } },
        };
      });

      sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

      // Data rows
      let rowIndex = 3;

      for (const pointData of selectedPointsData) {
        const p = pointData.point;

        const pointValues = [
          p.titre                  || '-',
          p.date ? this.formatDateForExport(p.date) : '-',
          p.status                 || '-',
          p.criticite              || '-',
          p.duree_estimee          || '-',
          p.frequence              || '-',
          p.is_recurring ? 'Oui' : 'Non',
          p.description            || '-',
          p.created_by ? `${p.created_by.first_name} ${p.created_by.last_name}` : '-',
          p.created_by?.email      || '-',
          p.createdAt ? this.formatDateForExport(p.createdAt) : '-',
          p.updatedAt ? this.formatDateForExport(p.updatedAt) : '-',
        ];

        const actionRows = pointData.actions.length > 0 ? pointData.actions : [null];

        actionRows.forEach((action: any) => {
          const rowBg = (rowIndex % 2 !== 0) ? COLOR_ROW_ODD : COLOR_ROW_EVEN;

          const actionValues = action ? [
            action.action            || '-',
            action.description       || '-',
            this.getActionStatusLabel(action.status),
            action.created_by ? `${action.created_by.first_name} ${action.created_by.last_name}` : '-',
            action.created_by?.email || '-',
            action.createdAt ? this.formatDateForExport(action.createdAt) : '-',
            action.updatedAt ? this.formatDateForExport(action.updatedAt) : '-',
          ] : Array(totalActionCols).fill('-');

          const row = sheet.getRow(rowIndex);
          row.height = 18;

          [...pointValues, ...actionValues].forEach((val, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = val;
            cell.font  = { name: 'Arial', size: 10 };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.alignment = { vertical: 'middle', wrapText: false };
            cell.border = {
              bottom: { style: 'hair', color: { argb: 'FFD0D0D0' } },
              right:  { style: 'hair', color: { argb: 'FFD0D0D0' } },
            };
          });

          row.commit();
          rowIndex++;
        });
      }

      sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: totalCols } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob   = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `points_export_${this.formatDateForFilename(new Date())}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert("Erreur lors de l'export Excel");
    } finally {
      this.isExporting = false;
      this.cdr.detectChanges();
    }
  }

  async exportToPDF(): Promise<void> {
    if (this.selectedPoints.length === 0) {
      alert('Veuillez sélectionner au moins un point à exporter');
      return;
    }

    this.isExporting = true;

    try {
      const selectedPointsData = await this.getSelectedPointsWithActions();

      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const NAVY   = [46,  64,  87]  as [number, number, number];
      const TEAL   = [4,  138, 129]  as [number, number, number];
      const RED    = [232, 72,  85]  as [number, number, number];
      const SALMON = [255, 107, 107] as [number, number, number];
      const WHITE  = [255, 255, 255] as [number, number, number];
      const ROW_ODD  = [240, 247, 246] as [number, number, number];
      const ROW_EVEN = [255, 255, 255] as [number, number, number];

      const MARGIN  = 10;
      const PAGE_W  = doc.internal.pageSize.getWidth();
      const PAGE_H  = doc.internal.pageSize.getHeight();
      const TABLE_W = PAGE_W - MARGIN * 2;

      let y = MARGIN;

      for (const pointData of selectedPointsData) {
        const p = pointData.point;

        if (y + 50 > PAGE_H - MARGIN) {
          doc.addPage();
          y = MARGIN;
        }

        doc.setFillColor(...NAVY);
        doc.roundedRect(MARGIN, y, TABLE_W, 9, 1.5, 1.5, 'F');
        doc.setTextColor(...WHITE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`POINT : ${p.titre}`, MARGIN + 4, y + 6);
        y += 13;

        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          tableWidth: TABLE_W,
          head: [
            [{ content: 'POINT', colSpan: 12, styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 9, halign: 'center' } }],
            ['Titre', 'Date', 'Statut', 'Criticité', 'Durée Est.', 'Fréquence', 'Récurrent', 'Description', 'Créé par', 'Email', 'Créé le', 'MAJ le'].map(label => ({
              content: label,
              styles: { fillColor: TEAL, textColor: WHITE, fontStyle: 'bold' as const, fontSize: 7, halign: 'center' as const },
            })),
          ],
          body: [[
            p.titre                  || '-',
            p.date ? this.formatDateForExport(p.date) : '-',
            p.status                 || '-',
            p.criticite              || '-',
            p.duree_estimee          || '-',
            p.frequence              || '-',
            p.is_recurring ? 'Oui' : 'Non',
            p.description            || '-',
            p.created_by ? `${p.created_by.first_name} ${p.created_by.last_name}` : '-',
            p.created_by?.email      || '-',
            p.createdAt ? this.formatDateForExport(p.createdAt) : '-',
            p.updatedAt ? this.formatDateForExport(p.updatedAt) : '-',
          ]],
          bodyStyles: { fillColor: ROW_ODD, textColor: [30, 41, 59], fontSize: 7 },
          theme: 'grid',
          styles: { cellPadding: 2, overflow: 'linebreak', font: 'helvetica', lineColor: [220, 220, 220], lineWidth: 0.1 },
          columnStyles: {
            0: { cellWidth: 28 }, 1: { cellWidth: 18 }, 2: { cellWidth: 16 },
            3: { cellWidth: 16 }, 4: { cellWidth: 16 }, 5: { cellWidth: 16 },
            6: { cellWidth: 14 }, 7: { cellWidth: 'auto' }, 8: { cellWidth: 22 },
            9: { cellWidth: 26 }, 10: { cellWidth: 18 }, 11: { cellWidth: 18 },
          },
        });

        y = (doc as any).lastAutoTable.finalY + 6;

        if (pointData.actions.length === 0) {
          doc.setFillColor(...RED);
          doc.roundedRect(MARGIN, y, TABLE_W, 7, 1.5, 1.5, 'F');
          doc.setTextColor(...WHITE);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('ACTIONS (0) — Aucune action associée', MARGIN + 4, y + 4.8);
          y += 17;
        } else {
          autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            tableWidth: TABLE_W,
            head: [
              [{ content: `ACTION (${pointData.actions.length})`, colSpan: 7, styles: { fillColor: RED, textColor: WHITE, fontStyle: 'bold', fontSize: 9, halign: 'center' } }],
              ['Titre', 'Description', 'Priorité', 'Créé par', 'Email', 'Créé le', 'MAJ le'].map(label => ({
                content: label,
                styles: { fillColor: SALMON, textColor: WHITE, fontStyle: 'bold' as const, fontSize: 7, halign: 'center' as const },
              })),
            ],
            body: pointData.actions.map((action: any) => [
              action.action            || '-',
              action.description       || '-',
              this.getActionStatusLabel(action.status),
              action.created_by ? `${action.created_by.first_name} ${action.created_by.last_name}` : '-',
              action.created_by?.email || '-',
              action.createdAt ? this.formatDateForExport(action.createdAt) : '-',
              action.updatedAt ? this.formatDateForExport(action.updatedAt) : '-',
            ]),
            didParseCell(data) {
              if (data.section === 'body') {
                data.cell.styles.fillColor = data.row.index % 2 === 0 ? ROW_ODD : ROW_EVEN;
                data.cell.styles.textColor = [30, 41, 59] as [number, number, number];
                data.cell.styles.fontSize  = 7;
              }
            },
            theme: 'grid',
            styles: { cellPadding: 2, overflow: 'linebreak', font: 'helvetica', lineColor: [220, 220, 220], lineWidth: 0.1 },
            columnStyles: {
              0: { cellWidth: 30 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 18 },
              3: { cellWidth: 24 }, 4: { cellWidth: 30 }, 5: { cellWidth: 20 }, 6: { cellWidth: 20 },
            },
          });

          y = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Export Points de Suivi — ${this.formatDateForExport(new Date())}`, MARGIN, PAGE_H - 5);
        doc.text(`Page ${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
      }

      doc.save(`points_export_${this.formatDateForFilename(new Date())}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert("Erreur lors de l'export PDF");
    } finally {
      this.isExporting = false;
      this.cdr.detectChanges();
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getSelectedPointsWithActions(): Promise<any[]> {
    const result: any[] = [];
    for (const pointId of this.selectedPoints) {
      const point = this.points.find(p => p._id === pointId);
      if (point) {
        try {
          const actions = await this.actionService.getActionsByPoint(pointId).toPromise();
          result.push({ point, actions: actions || [] });
        } catch {
          result.push({ point, actions: [] });
        }
      }
    }
    return result;
  }

  getActionStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'NONE':   'Aucune',
      'LOW':    'Basse',
      'MEDIUM': 'Moyenne',
      'HIGH':   'Haute'
    };
    return labels[status] || status;
  }

  goToAddPoint() {
    this.router.navigate(['/hrbp/addPoint']);
  }

  viewDetails(pointId: string) {
    this.router.navigate(['/hrbp/points', pointId]);
  }

  editPoint(pointId: string) {
    this.router.navigate(['/hrbp/updatePoint', pointId]);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateForExport(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateForFilename(date: Date): string {
    const y   = date.getFullYear();
    const m   = String(date.getMonth() + 1).padStart(2, '0');
    const d   = String(date.getDate()).padStart(2, '0');
    const h   = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}`;
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  getStatusClass(status: string): string {
    const map: { [key: string]: string } = {
      'En attente': 'status-attente',
      'En cours':   'status-cours',
      'Terminé':    'status-termine',
      'Annulé':     'status-annule'
    };
    return map[status] || '';
  }

  getCriticiteClass(criticite: string): string {
    const map: { [key: string]: string } = {
      'Basse':   'criticite-basse',
      'Moyenne': 'criticite-moyenne',
      'Haute':   'criticite-haute'
    };
    return map[criticite] || '';
  }


clearAllFilters(): void {
  this.searchTitle = '';
  this.searchDate = '';
  this.statusFilter = '';
  this.criticiteFilter = '';
  this.frequenceFilter = '';
  this.applyFilters();
}
hasActiveFilters(): boolean {
  return !!this.searchTitle 
      || !!this.searchDate 
      || !!this.statusFilter 
      || !!this.criticiteFilter
      || !!this.frequenceFilter;
}

}
