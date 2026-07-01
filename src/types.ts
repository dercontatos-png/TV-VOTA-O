export interface Player {
  id: string;
  name: string;
  team: string;
  position?: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  imagePosition?: 'top' | 'center' | 'bottom';
  order?: number;
  votesCount: number;
  createdAt: number;
}

export interface VoterInfo {
  id: string;
  email: string;
  name: string;
  phone?: string;
  photoURL?: string;
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
  ipAddress?: string;
  locationInfo?: string;
}

export interface SystemConfig {
  votingQuestion: string;
  logoAzuup: string; // Base64 image
  logoCampinense: string; // Base64 image
  logoPrincipal?: string; // Base64 main logo
  startDate: string; // YYYY-MM-DDTHH:MM
  endDate: string; // YYYY-MM-DDTHH:MM
  votingEnabled: boolean;
  bannerUrl?: string; // Base64 or url banner
  primaryColor?: string; // Hex color or pre-defined tailwind class base
  lastResetAt?: number; // Epoch of last reset
  sponsorLogoUrl?: string; // Base64 or url for sponsor logo
  sponsorName?: string;
  sponsorPrize?: string;
}
