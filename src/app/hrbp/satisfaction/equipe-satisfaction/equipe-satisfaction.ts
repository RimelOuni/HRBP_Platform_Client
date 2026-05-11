import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { User, CriticiteCount, Rhbp } from '../../../core/models/user.model';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-equipe-satisfaction',
  imports: [CommonModule, HttpClientModule],
  templateUrl: './equipe-satisfaction.html',
  styleUrls: ['./equipe-satisfaction.css']
})
export class EquipeSatisfaction implements OnInit {

  collaborateurs: User[] = [];
  allCollaborateurs: User[] = [];
  selectedPracticeId: string | null = null;
  practices: { _id: string; name: string }[] = [];
  currentRhbp: Rhbp | null = null;

  moodSatMap: Record<string, { mood: string | null, satisfaction: number | null }> = {};
  criticiteMap: Record<string, CriticiteCount> = {};

  constructor(private userService: UserService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadCurrentRhbp();
  }

  loadCurrentRhbp() {
    this.userService.getCurrentUser().subscribe({
      next: (rhbp) => {
        this.currentRhbp = rhbp;
        this.loadPractices();
        this.loadUsers();
      },
      error: (err) => console.error(err)
    });
  }

  private normalizePracticeIds(practiceId: any): string[] {
    if (!practiceId) return [];
    const arr = Array.isArray(practiceId) ? practiceId : [practiceId];
    return arr.map((p: any) => (typeof p === 'object' && p !== null ? p._id : String(p)));
  }

  loadPractices() {
    this.userService.getPractices().subscribe({
      next: (data) => {
        const ids = this.normalizePracticeIds(this.currentRhbp?.practice_id);
        this.practices = data.filter(p => ids.includes(p._id));
        this.cd.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (data: User[]) => {
        const ids = this.normalizePracticeIds(this.currentRhbp?.practice_id);

        this.allCollaborateurs = data.filter(user => {
          if (user.role?.toUpperCase() !== 'COLLABORATOR') return false;
          const userPracticeIds = this.normalizePracticeIds(user.practice_id);
          return userPracticeIds.some(id => ids.includes(id));
        });

        this.collaborateurs = [...this.allCollaborateurs];
        this.loadCriticite();
        this.loadMoodSat();
        this.cd.detectChanges();
      },
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  loadCriticite() {
    const ids = this.collaborateurs.map(u => u._id);
    if (!ids.length) return;

    this.userService.getCriticiteForCollabs(ids).subscribe({
      next: (data) => {
        this.criticiteMap = data;
        this.cd.detectChanges();
      },
      error: (err) => console.error('Erreur criticité:', err)
    });
  }

  loadMoodSat() {
    const ids = this.collaborateurs.map(u => u._id);
    if (!ids.length) return;

    this.userService.getMoodSatForCollabs(ids).subscribe({
      next: (data) => {
        this.moodSatMap = data;
        this.cd.detectChanges();
      },
      error: (err) => console.error('Erreur moodSat:', err)
    });
  }

  filterByPractice(practiceId: string | null) {
    this.selectedPracticeId = practiceId;
    this.collaborateurs = practiceId
      ? this.allCollaborateurs.filter(u => {
          const userPracticeIds = this.normalizePracticeIds(u.practice_id);
          return userPracticeIds.includes(practiceId);
        })
      : [...this.allCollaborateurs];
    this.cd.detectChanges();
  }

  getLastMood(user: User): string | null {
    return this.moodSatMap[user._id]?.mood ?? null;
  }

  getLastSatisfaction(user: User): number {
    return this.moodSatMap[user._id]?.satisfaction ?? 0;
  }

getMoodScore(mood: string | null | undefined): number {
  const map: Record<string, number> = {
    'Démotivé': 1,
    'Neutre': 2,
    'Content': 3,
    'Motivé': 4,
    'Épanoui': 5
  };

  return mood ? map[mood] ?? 0 : 0;
}

getMoodEmoji(mood?: string | null): string {
  const map: Record<string, string> = {
    'Démotivé': '😔',
    'Neutre': '😐',
    'Content': '😊',
    'Motivé': '💪',
    'Épanoui': '🌟'
  };

  return mood ? map[mood] ?? '❓' : '❓';
}

getMoodLabel(user: User): string {
  const mood = this.getLastMood(user);

  const map: Record<string, string> = {
    'Démotivé': 'Démotivé',
    'Neutre': 'Neutre',
    'Content': 'Content',
    'Motivé': 'Motivé',
    'Épanoui': 'Épanoui'
  };

  return mood ? map[mood] ?? '' : '';
}

  get collaborateursEnAlerte(): User[] {
    return this.collaborateurs.filter(
      collab => this.getLastMood(collab) === 'Démotivé'
    );
  }
}