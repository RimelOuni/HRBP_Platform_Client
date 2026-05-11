// ─── Survey ──────────────────────────────────────────────────────

export type SurveyTarget = 'COLLABORATOR' | 'MANAGER' | 'HRBP' | 'ALL';
export type SurveyType   = 'ENGAGEMENT' | 'SATISFACTION' | 'PULSE' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SurveyStatus = 'ACTIVE' | 'INACTIVE';

export interface PracticeRef {
  _id:  string;
  name: string;
}

export interface UserRef {
  _id:       string;
  firstName: string;
  lastName:  string;
  email:     string;
}

export interface Survey {
  _id?:           string;
  title?:         string | null;
  googleFormUrl?: string | null;

  // Toujours COLLABORATOR
  target: SurveyTarget;
  type:   SurveyType;

  // Historique cumulatif des practices ciblées (objets populés ou IDs)
  practices?: Array<string | PracticeRef>;

  // Historique cumulatif des utilisateurs spécifiquement ciblés (objets populés ou IDs)
  specificUserIds?: Array<string | UserRef>;

  pointsReward: number;
  status?:      SurveyStatus;

  startDate?: string | Date | null;
  endDate?:   string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ─── Gamification ────────────────────────────────────────────────

export interface BadgeDefinition {
  id:               string;
  name:             string;
  description:      string;
  icon:             string;
  color:            string;
  gradient:         string[];
  surveysRequired:  number;
  unlocked?:        boolean;
  earnedAt?:        string | Date | null;
}

export interface NextBadgeInfo {
  id:               string;
  name:             string;
  icon:             string;
  color:            string;
  gradient:         string[];
  surveysRequired:  number;
  surveysRemaining: number;
}

export interface SurveyAnswerResult {
  message:         string;
  pointsEarned:    number;
  totalPoints:     number;
  surveysAnswered: number;
  newBadges:       BadgeDefinition[];
  nextBadge:       NextBadgeInfo | null;
}

export interface GamificationProfile {
  points:          number;
  surveysAnswered: number;
  earnedBadges:    BadgeDefinition[];
  nextBadge:       NextBadgeInfo | null;
  allBadges:       BadgeDefinition[];
}