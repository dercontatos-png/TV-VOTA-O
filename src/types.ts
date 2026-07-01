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
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface Vote {
  id: string;
  playerId: string;
  voterId: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
  voterName?: string;
  voterPhone?: string;
  voterEmail?: string;
}

export interface SystemConfig {
  votingQuestion: string;
  logoAzuup: string; // Base64 image
  logoCampinense: string; // Base64 image
  logoPrincipal?: string; // Base64 main logo
  startDate: string; // YYYY-MM-DDTHH:MM
  endDate: string; // YYYY-MM-DDTHH:MM
  votingEnabled: boolean;
}
