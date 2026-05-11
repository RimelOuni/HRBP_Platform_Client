import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { User, CriticiteCount } from '../../core/models/user.model';

@Component({
  standalone: true,
  selector: 'app-equipe-manager',
  imports: [CommonModule],
  templateUrl: './equipe-manager.html',
  styleUrls: ['./equipe-manager.css']
})
export class EquipeManager implements OnInit {

  users: User[] = [];
  allUsers: User[] = [];
  totalTeam: number = 0;
  averageMood: number = 0;
  averageSatisfaction: number = 0;
  selectedPracticeId: string | null = null;
  criticiteMap: Record<string, CriticiteCount> = {};
  moodSatMap: Record<string, { mood: string | null, satisfaction: number | null }> = {};
  currentManager: User | null = null;

  practices = [
    { _id: '6967943f33da7b5976d1a4e5', name: 'Miles' },
    { _id: '696794ef33da7b5976d1a4e7', name: 'Ekip' },
    { _id: '699c0fbf09e5a4d65b397238', name: 'Cassiopea' },
    { _id: '69a162b46401d4f658a07b51', name: 'Eflo' }
  ];

  constructor(private userService: UserService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadCurrentManager();
  }

  private normalizePracticeIds(practiceId: any): string[] {
    if (!practiceId) return [];
    const arr = Array.isArray(practiceId) ? practiceId : [practiceId];
    return arr.map((p: any) => (typeof p === 'object' && p !== null ? p._id : String(p)));
  }

  loadCurrentManager() {
    this.userService.getCurrentUser().subscribe({
      next: (manager) => {
        this.currentManager = manager;
        this.loadUsers();
      },
      error: (err) => console.error(err)
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (data: User[]) => {
        const managerPracticeIds = this.normalizePracticeIds(this.currentManager?.practice_id);

        const allCollaborators = data.filter(user => user.role?.toUpperCase() === 'COLLABORATOR');

        this.allUsers = allCollaborators.filter(user => {
          const userPracticeIds = this.normalizePracticeIds(user.practice_id);
          return userPracticeIds.some(id => managerPracticeIds.includes(id));
        });

        this.users = [...this.allUsers];
        this.loadCriticite();
        this.loadMoodSat();
        this.cd.detectChanges();
      },
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  loadCriticite() {
    const ids = this.users.map(u => u._id);
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
    const ids = this.users.map(u => u._id);
    if (!ids.length) return;

    this.userService.getMoodSatForCollabs(ids).subscribe({
      next: (data) => {
        this.moodSatMap = data;
        this.calculateStats();
        this.cd.detectChanges();
      },
      error: (err) => console.error('Erreur moodSat:', err)
    });
  }

  filterByPractice(practiceId: string | null) {
    this.selectedPracticeId = practiceId;
    this.users = practiceId
      ? this.allUsers.filter(u => {
          const userPracticeIds = this.normalizePracticeIds(u.practice_id);
          return userPracticeIds.includes(practiceId);
        })
      : [...this.allUsers];

    this.calculateStats();
    this.cd.detectChanges();
  }

  calculateStats() {
    this.totalTeam = this.users.length;

    const moodSum = this.users.reduce((sum, user) => {
      return sum + this.getMoodScore(this.getLastMood(user));
    }, 0);
    this.averageMood = this.users.length ? +(moodSum / this.users.length).toFixed(1) : 0;

    const satSum = this.users.reduce((sum, user) => {
      return sum + this.getLastSatisfaction(user);
    }, 0);
    this.averageSatisfaction = this.users.length ? +(satSum / this.users.length).toFixed(1) : 0;
  }

  getLastMood(user: User): string | null {
    return this.moodSatMap[user._id]?.mood ?? null;
  }

  getLastSatisfaction(user: User): number {
    return this.moodSatMap[user._id]?.satisfaction ?? 0;
  }

  getMoodScore(mood: string | null | undefined): number {
    switch (mood) {
      case 'Content':  return 5;
      case 'Moyen':    return 3;
      case 'Démotivé': return 1;
      default:         return 0;
    }
  }

  getMoodEmoji(mood?: string | null): string {
    switch (mood) {
      case 'Content':  return '😊';
      case 'Moyen':    return '😐';
      case 'Démotivé': return '😔';
      default:         return '❔';
    }
  }

  getMoodLabel(user: User): string {
    const mood = this.getLastMood(user);
    switch (mood) {
      case 'Content':  return 'Content';
      case 'Moyen':    return 'Moyen';
      case 'Démotivé': return 'Démotivé';
      default:         return '';
    }
  }

  

  calculateLastMoodScore(user: User): number {
    return this.getMoodScore(this.getLastMood(user));
  }
}