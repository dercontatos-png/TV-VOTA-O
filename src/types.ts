export interface Player {
  id: string;
  name: string;
  team: string;
  position?: string;
  imageUrl?: string;
  votesCount: number;
  createdAt: number;
}

export interface VoterInfo {
  name: string;
  phone: string;
}

export interface Vote {
  id: string;
  playerId: string;
  voterId: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
  voterName?: string;
  voterPhone?: string;
}

export interface SystemConfig {
  votingQuestion: string;
  logoAzuup: string; // Base64 image
  logoCampinense: string; // Base64 image
  startDate: string; // YYYY-MM-DDTHH:MM
  endDate: string; // YYYY-MM-DDTHH:MM
  votingEnabled: boolean;
}
