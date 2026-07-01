export interface Player {
  id: string;
  name: string;
  team: string;
  position?: string;
  imageUrl?: string;
  votesCount: number;
  createdAt: number;
}

export interface Vote {
  id: string;
  playerId: string;
  voterId: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
}

export interface SystemConfig {
  votingQuestion: string;
  logoAzuup: string; // Base64 image
  logoCampinense: string; // Base64 image
  startDate: string; // YYYY-MM-DDTHH:MM
  endDate: string; // YYYY-MM-DDTHH:MM
  votingEnabled: boolean;
}
