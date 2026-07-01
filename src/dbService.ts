import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment, 
  runTransaction, 
  Timestamp, 
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Player, Vote, SystemConfig } from './types';

// Operation Types for error classification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Firestore Error Info Interface for strict diagnostics
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Global robust error parser/reporter conforming to the Firebase Skill
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to get today's date string in Morro do Chapéu / Bahia time (UTC-3)
export function getBahiaDateStr(): string {
  const d = new Date();
  // Adjust to UTC-3
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const bahiaDate = new Date(utc + (3600000 * -3));
  
  const year = bahiaDate.getFullYear();
  const month = String(bahiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(bahiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 1. Get all players ordered by votes desc, then by name
export async function getPlayers(): Promise<Player[]> {
  try {
    const playersCol = collection(db, 'players');
    const q = query(playersCol, orderBy('votesCount', 'desc'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Player));
  } catch (error) {
    console.warn("Sorting index query failed, falling back to client-side sorting:", error);
    try {
      const playersCol = collection(db, 'players');
      const snapshot = await getDocs(playersCol);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Player));
      return list.sort((a, b) => {
        if (b.votesCount !== a.votesCount) {
          return b.votesCount - a.votesCount;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.LIST, 'players');
    }
  }
}

// 2. Add a new player
export async function addPlayer(name: string, team: string, position?: string, imageUrl?: string): Promise<string> {
  try {
    const playersCol = collection(db, 'players');
    const newPlayerRef = doc(playersCol); // Auto ID
    
    const newPlayer: Omit<Player, 'id'> = {
      name,
      team,
      position: position || '',
      imageUrl: imageUrl || '',
      votesCount: 0,
      createdAt: Date.now()
    };
    
    await setDoc(newPlayerRef, newPlayer);
    return newPlayerRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'players');
  }
}

// 3. Update an existing player
export async function updatePlayer(id: string, name: string, team: string, position?: string, imageUrl?: string): Promise<void> {
  try {
    const playerRef = doc(db, 'players', id);
    await updateDoc(playerRef, {
      name,
      team,
      position: position || '',
      imageUrl: imageUrl || ''
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `players/${id}`);
  }
}

// 4. Delete player and their related votes count (or just delete the player)
export async function deletePlayer(id: string): Promise<void> {
  try {
    const playerRef = doc(db, 'players', id);
    await deleteDoc(playerRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `players/${id}`);
  }
}

// 5. Check if voter has already voted today
export async function hasVotedToday(voterId: string): Promise<{ voted: boolean; playerVotedId?: string }> {
  try {
    const dateStr = getBahiaDateStr();
    const votesCol = collection(db, 'votes');
    const q = query(
      votesCol, 
      where('voterId', '==', voterId), 
      where('dateStr', '==', dateStr),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const voteDoc = snapshot.docs[0].data() as Vote;
      return { voted: true, playerVotedId: voteDoc.playerId };
    }
    return { voted: false };
  } catch (error) {
    console.error("Error checking vote state: ", error);
    // Since check voting status should fail gracefully if no votes exist or first query
    return { voted: false };
  }
}

// 6. Cast a vote using a firestore transaction for reliability and concurrency
export async function castVote(playerId: string, voterId: string, voterInfo?: import('./types').VoterInfo): Promise<void> {
  try {
    const dateStr = getBahiaDateStr();
    const playerRef = doc(db, 'players', playerId);
    const voteRef = doc(collection(db, 'votes')); // Auto generated vote ID
    
    await runTransaction(db, async (transaction) => {
      const playerDoc = await transaction.get(playerRef);
      if (!playerDoc.exists()) {
        throw new Error("Player does not exist!");
      }
      
      const currentVotes = playerDoc.data().votesCount || 0;
      
      // Set the vote document
      transaction.set(voteRef, {
        id: voteRef.id,
        playerId,
        voterId,
        dateStr,
        timestamp: Date.now(),
        voterName: voterInfo?.name || 'Anônimo',
        voterPhone: voterInfo?.phone || 'Não informado'
      });
      
      // Increment player's vote
      transaction.update(playerRef, {
        votesCount: currentVotes + 1
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'votes_transaction');
  }
}

// 7. Get recent votes history for admin panel
export async function getVotesHistory(limitCount = 10): Promise<Vote[]> {
  try {
    const votesCol = collection(db, 'votes');
    const q = query(votesCol, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Vote);
  } catch (error) {
    console.warn("Votes history sorting index failed, falling back to client-side sorting:", error);
    try {
      const votesCol = collection(db, 'votes');
      const snapshot = await getDocs(votesCol);
      const votes = snapshot.docs.map(doc => doc.data() as Vote);
      return votes.sort((a, b) => b.timestamp - a.timestamp).slice(0, limitCount);
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.LIST, 'votes');
    }
  }
}

// 8. Reset all votes
export async function resetAllVotes(): Promise<void> {
  try {
    // 1. Get all players
    const playersCol = collection(db, 'players');
    const playersSnapshot = await getDocs(playersCol);
    
    const batch = writeBatch(db);
    
    // Reset players votesCount to 0
    playersSnapshot.docs.forEach((playerDoc) => {
      batch.update(playerDoc.ref, { votesCount: 0 });
    });
    
    // Delete all votes (fetch all and delete)
    const votesCol = collection(db, 'votes');
    const votesSnapshot = await getDocs(votesCol);
    
    votesSnapshot.docs.forEach((voteDoc) => {
      batch.delete(voteDoc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_reset_all');
  }
}

// 9. Get and Update system voting configuration
export const DEFAULT_CONFIG: SystemConfig = {
  votingQuestion: 'Quem é o seu favorito para conquistar o título de melhor "Prata da Casa" do Campeonato Municipal de Morro do Chapéu 2026 - Azuup x Campinense',
  logoAzuup: '',
  logoCampinense: '',
  startDate: '',
  endDate: '',
  votingEnabled: true
};

export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    const configRef = doc(db, 'settings', 'voting');
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) {
      const data = docSnap.data() || {};
      let question = data.votingQuestion || '';
      if (!question || question.includes('Craque do Campeonato') || question.includes('craque do campeonato')) {
        question = DEFAULT_CONFIG.votingQuestion;
      }
      return {
        ...DEFAULT_CONFIG,
        ...data,
        votingQuestion: question
      } as SystemConfig;
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.warn("Failed to get system config, returning default:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateSystemConfig(config: SystemConfig): Promise<void> {
  try {
    const configRef = doc(db, 'settings', 'voting');
    await setDoc(configRef, config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/voting');
  }
}
