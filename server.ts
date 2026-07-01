import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

const PORT = 3000;
const app = reportErrorEnabledExpressApp();

function reportErrorEnabledExpressApp() {
  const expressApp = express();
  expressApp.use(cors());
  // Aumentar o limite do payload para permitir uploads de imagens em base64 grandes (logos e fotos de jogadores)
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ limit: '50mb', extended: true }));
  return expressApp;
}

// Default layout configurations
const DEFAULT_CONFIG: any = {
  votingQuestion: 'Quem é o melhor "Prata da Casa"?',
  logoAzuup: '',
  logoCampinense: '',
  logoPrincipal: '',
  startDate: '',
  endDate: '',
  votingEnabled: true,
  bannerUrl: '',
  primaryColor: '#2563eb',
  sponsorName: 'Lourival Junior',
  sponsorPrize: 'R$ 500',
  sponsorLogoUrl: '',
  lastResetAt: null as number | null,
};

// Local storage configuration file to bypass Firestore free-tier limits permanently when exhausted
const LOCAL_DB_PATH = path.resolve(process.cwd(), 'local_database.json');
let useLocalFallback = false;

function readLocalDb() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      if (content.trim()) {
        const dbData = JSON.parse(content);
        
        // Migration: If players exist and they are in the old non-alternating order pattern
        // (e.g. if p1-p5 have sequential orders and p6-p10 have sequential orders),
        // we automatically adjust them to alternate by team (AZUUP and Campinense)
        if (dbData.players && Array.isArray(dbData.players)) {
          const p1 = dbData.players.find((p: any) => p.id === 'p1');
          const p2 = dbData.players.find((p: any) => p.id === 'p2');
          const p5 = dbData.players.find((p: any) => p.id === 'p5');
          const p6 = dbData.players.find((p: any) => p.id === 'p6');
          const p10 = dbData.players.find((p: any) => p.id === 'p10');
          
          // If p2's order is 2, it's the old sequential order. Let's align all to alternating:
          if (p1 && p2 && (p2.order === 2 || p5?.order === 5)) {
            console.log("Migrating default player orders in local database to alternating pattern...");
            const orderMap: Record<string, number> = {
              'p1': 1,  // AZUUP
              'p6': 2,  // Campinense
              'p2': 3,  // AZUUP
              'p7': 4,  // Campinense
              'p3': 5,  // AZUUP
              'p8': 6,  // Campinense
              'p4': 7,  // AZUUP
              'p9': 8,  // Campinense
              'p5': 9,  // AZUUP
              'p10': 10 // Campinense
            };
            dbData.players.forEach((p: any) => {
              if (orderMap[p.id] !== undefined) {
                p.order = orderMap[p.id];
              }
            });
            fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
          }
        }
        return dbData;
      }
    }
  } catch (err) {
    console.error("Error reading local database file, resetting to defaults:", err);
  }
  
  // Return default structured database with alternating team order
  const defaultDb = {
    players: [
      { id: 'p1', name: 'Jefinho', team: 'AZUUP', position: 'MEI (Meia)', votesCount: 0, order: 1, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p6', name: 'Marcel', team: 'Campinense', position: 'LAT (Lateral)', votesCount: 0, order: 2, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p2', name: 'Didio', team: 'AZUUP', position: 'MEI-ATAC (Meia-Atacante)', votesCount: 0, order: 3, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p7', name: 'Sujeirinha', team: 'Campinense', position: 'MEI-ATAC (Meia-Atacante)', votesCount: 0, order: 4, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p3', name: 'Gabriel', team: 'AZUUP', position: 'LAT (Lateral)', votesCount: 0, order: 5, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p8', name: 'Peep', team: 'Campinense', position: 'VOL (Volante)', votesCount: 0, order: 6, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p4', name: 'Valdevando', team: 'AZUUP', position: 'LAT (Lateral)', votesCount: 0, order: 7, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p9', name: 'Rafael', team: 'Campinense', position: 'LAT (Lateral)', votesCount: 0, order: 8, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p5', name: 'Kauê', team: 'AZUUP', position: 'GOLEIRO', votesCount: 0, order: 9, imageUrl: '', imageFit: 'cover', imagePosition: 'top' },
      { id: 'p10', name: 'Leuzinho', team: 'Campinense', position: 'VOL (Volante)', votesCount: 0, order: 10, imageUrl: '', imageFit: 'cover', imagePosition: 'top' }
    ],
    settings: DEFAULT_CONFIG,
    votes: {} as Record<string, any>
  };
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
  return defaultDb;
}

function writeLocalDb(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing local database file:", err);
  }
}

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const errMsg = String(err.message || err.code || err).toLowerCase();
  return (
    errMsg.includes('quota') || 
    errMsg.includes('limit exceeded') || 
    errMsg.includes('resource-exhausted') || 
    errMsg.includes('exceeded') || 
    errMsg.includes('unauthorized') || 
    errMsg.includes('permission') ||
    errMsg.includes('billing')
  );
}

// Firestore is disabled to prevent idle stream timeout errors and avoid Firestore quota limits.
// The primary storage for votes is Supabase, and the local JSON database acts as the fallback.
let db: any = null;
useLocalFallback = true;

// In-Memory Cache configuration to optimize Firestore reads (Spark Free Tier)
let cachedPlayers: any[] | null = null;
let lastPlayersFetchTime = 0;

let cachedSettings: any | null = null;
let lastSettingsFetchTime = 0;

const CACHE_TTL_MS = 3000; // Cache for 3 seconds

// Seed predefined players to Firestore if empty
async function seedPredefinedPlayers() {
  if (!db || useLocalFallback) return;
  try {
    const playersCol = collection(db, 'players');
    const snapshot = await getDocs(playersCol);
    if (snapshot.empty) {
      console.log("Seeding predefined players to Firestore...");
      const predefined = readLocalDb().players;
      const batch = writeBatch(db);
      for (const p of predefined) {
        const docRef = doc(db, 'players', p.id);
        batch.set(docRef, {
          name: p.name,
          team: p.team,
          position: p.position,
          votesCount: p.votesCount,
          createdAt: Date.now(),
          order: p.order,
          imageUrl: p.imageUrl || '',
          imageFit: p.imageFit || 'cover',
          imagePosition: p.imagePosition || 'top'
        });
      }
      await batch.commit();
      console.log("Predefined players seeded successfully to Firestore!");
    }
  } catch (err) {
    console.error("Failed to seed predefined players:", err);
  }
}

// Fetch players with cache support
async function getPlayersWithCache() {
  const now = Date.now();
  if (cachedPlayers && (now - lastPlayersFetchTime < CACHE_TTL_MS)) {
    return cachedPlayers;
  }
  
  if (!db) throw new Error("Firebase DB not initialized");
  
  const playersCol = collection(db, 'players');
  const snapshot = await getDocs(playersCol);
  const playersList = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
  
  // Sort in-memory to prevent needing custom Firestore indexes
  playersList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  
  cachedPlayers = playersList;
  lastPlayersFetchTime = now;
  return playersList;
}

// Fetch settings with cache support
async function getSettingsWithCache() {
  const now = Date.now();
  if (cachedSettings && (now - lastSettingsFetchTime < CACHE_TTL_MS)) {
    return cachedSettings;
  }
  
  if (!db) throw new Error("Firebase DB not initialized");
  
  const configDocRef = doc(db, 'settings', 'voting');
  const docSnap = await getDoc(configDocRef);
  
  if (docSnap.exists()) {
    cachedSettings = {
      ...DEFAULT_CONFIG,
      ...docSnap.data()
    };
  } else {
    cachedSettings = DEFAULT_CONFIG;
  }
  
  lastSettingsFetchTime = now;
  return cachedSettings;
}

// Synchronize Firestore to Local Database on Startup to prevent any service interruptions
async function syncFirestoreToLocal() {
  if (!db) {
    console.warn("No Firestore DB initialized. Using local storage mode directly.");
    useLocalFallback = true;
    readLocalDb();
    return;
  }
  
  try {
    console.log("Syncing Firestore data to local database fallback...");
    const playersCol = collection(db, 'players');
    const snapshot = await getDocs(playersCol);
    
    if (!snapshot.empty) {
      const playersList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      playersList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      
      const configDocRef = doc(db, 'settings', 'voting');
      const docSnap = await getDoc(configDocRef);
      let settings = DEFAULT_CONFIG;
      if (docSnap.exists()) {
        settings = { ...DEFAULT_CONFIG, ...docSnap.data() };
      }
      
      let votesObj: any = {};
      try {
        const votesCol = collection(db, 'votes');
        const votesSnapshot = await getDocs(votesCol);
        votesSnapshot.docs.forEach(vDoc => {
          votesObj[vDoc.id] = vDoc.data();
        });
      } catch (err) {
        console.warn("Could not sync Firestore votes list:", err);
      }
      
      const localData = {
        players: playersList,
        settings,
        votes: votesObj
      };
      writeLocalDb(localData);
      console.log("Local database successfully hydrated from Firestore.");
    } else {
      await seedPredefinedPlayers();
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore quota/permissions already exceeded! Moving immediately to local database fallback mode.");
      useLocalFallback = true;
    } else {
      console.error("General error syncing Firestore on startup, using local backup:", err);
    }
    // Ensure local DB exists
    readLocalDb();
  }
}

// Initialize startup synchronization
syncFirestoreToLocal();

// API Route Handlers wrapping with Quota Failure Tolerance:

async function safeGetPlayers() {
  if (useLocalFallback) {
    return readLocalDb().players;
  }
  try {
    return await getPlayersWithCache();
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore read quota exceeded! Switching server to local storage fallback mode permanently.");
      useLocalFallback = true;
      return readLocalDb().players;
    }
    throw err;
  }
}

async function safeGetSettings() {
  if (useLocalFallback) {
    return readLocalDb().settings;
  }
  try {
    return await getSettingsWithCache();
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore configuration read quota exceeded! Switching to local database mode.");
      useLocalFallback = true;
      return readLocalDb().settings;
    }
    throw err;
  }
}

async function safeCheckVote(voterId: string, dateStr: string) {
  const voteId = `${voterId}_${dateStr}`;
  if (useLocalFallback) {
    const localDb = readLocalDb();
    const vote = localDb.votes[voteId];
    return vote ? { voted: true, playerVotedId: vote.playerId } : { voted: false };
  }
  try {
    const voteDocRef = doc(db, 'votes', voteId);
    const voteSnap = await getDoc(voteDocRef);
    if (voteSnap.exists()) {
      return { voted: true, playerVotedId: voteSnap.data().playerId };
    }
    return { voted: false };
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore vote-check quota exceeded! Switching to local database mode.");
      useLocalFallback = true;
      const localDb = readLocalDb();
      const vote = localDb.votes[voteId];
      return vote ? { voted: true, playerVotedId: vote.playerId } : { voted: false };
    }
    throw err;
  }
}

async function safeCastVote(playerId: string, voterId: string, dateStr: string, voterInfo: any, userAgent: string) {
  const voteId = `${voterId}_${dateStr}`;
  
  if (useLocalFallback) {
    const localDb = readLocalDb();
    if (localDb.votes[voteId]) {
      throw new Error('Você já votou hoje!');
    }
    const playerIndex = localDb.players.findIndex((p: any) => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Jogador não encontrado');
    }
    localDb.players[playerIndex].votesCount = (localDb.players[playerIndex].votesCount || 0) + 1;
    localDb.votes[voteId] = {
      id: voteId,
      playerId,
      voterId,
      dateStr,
      timestamp: Date.now(),
      voterName: voterInfo?.name || 'Anônimo',
      voterEmail: voterInfo?.email || '',
      voterPhone: voterInfo?.phone || '',
      ipAddress: voterInfo?.ipAddress || 'N/A',
      locationInfo: voterInfo?.locationInfo || 'N/A',
      userAgent: userAgent || 'N/A'
    };
    writeLocalDb(localDb);
    return { success: true };
  }
  
  try {
    const voteDocRef = doc(db, 'votes', voteId);
    const voteSnap = await getDoc(voteDocRef);
    if (voteSnap.exists()) {
      throw new Error('Você já votou hoje!');
    }
    const playerDocRef = doc(db, 'players', playerId);
    const playerSnap = await getDoc(playerDocRef);
    if (!playerSnap.exists()) {
      throw new Error('Jogador não encontrado');
    }
    
    const currentVotes = playerSnap.data().votesCount || 0;
    const batch = writeBatch(db);
    batch.set(voteDocRef, {
      id: voteId,
      playerId,
      voterId,
      dateStr,
      timestamp: Date.now(),
      voterName: voterInfo?.name || 'Anônimo',
      voterEmail: voterInfo?.email || '',
      voterPhone: voterInfo?.phone || '',
      ipAddress: voterInfo?.ipAddress || 'N/A',
      locationInfo: voterInfo?.locationInfo || 'N/A',
      userAgent: userAgent || 'N/A'
    });
    batch.update(playerDocRef, {
      votesCount: currentVotes + 1
    });
    await batch.commit();
    cachedPlayers = null;
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      console.warn("Firestore vote writing quota exceeded! Committing the vote into local database fallback mode.");
      useLocalFallback = true;
      const localDb = readLocalDb();
      if (localDb.votes[voteId]) {
        throw new Error('Você já votou hoje!');
      }
      const playerIndex = localDb.players.findIndex((p: any) => p.id === playerId);
      if (playerIndex === -1) {
        throw new Error('Jogador não encontrado');
      }
      localDb.players[playerIndex].votesCount = (localDb.players[playerIndex].votesCount || 0) + 1;
      localDb.votes[voteId] = {
        id: voteId,
        playerId,
        voterId,
        dateStr,
        timestamp: Date.now(),
        voterName: voterInfo?.name || 'Anônimo',
        voterEmail: voterInfo?.email || '',
        voterPhone: voterInfo?.phone || '',
        ipAddress: voterInfo?.ipAddress || 'N/A',
        locationInfo: voterInfo?.locationInfo || 'N/A',
        userAgent: userAgent || 'N/A'
      };
      writeLocalDb(localDb);
      return { success: true };
    }
    throw err;
  }
}

async function safeGetVotesHistory(limitCount: number) {
  if (useLocalFallback) {
    const localDb = readLocalDb();
    const list = Object.values(localDb.votes);
    list.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    return list.slice(0, limitCount);
  }
  try {
    const votesCol = collection(db, 'votes');
    const snapshot = await getDocs(votesCol);
    const votesList = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    votesList.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    return votesList.slice(0, limitCount);
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      const list = Object.values(localDb.votes);
      list.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      return list.slice(0, limitCount);
    }
    throw err;
  }
}

async function safeGetAllVotes() {
  if (useLocalFallback) {
    const localDb = readLocalDb();
    const list = Object.values(localDb.votes);
    list.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    return list;
  }
  try {
    const votesCol = collection(db, 'votes');
    const snapshot = await getDocs(votesCol);
    const votesList = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    votesList.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    return votesList;
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      const list = Object.values(localDb.votes);
      list.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      return list;
    }
    throw err;
  }
}

async function safeResetAllVotes() {
  if (useLocalFallback) {
    const localDb = readLocalDb();
    localDb.players.forEach((p: any) => { p.votesCount = 0; });
    localDb.votes = {};
    localDb.settings.lastResetAt = Date.now();
    localDb.settings.votingEnabled = true;
    writeLocalDb(localDb);
    return { success: true };
  }
  try {
    const playersCol = collection(db, 'players');
    const playersSnap = await getDocs(playersCol);
    const batch = writeBatch(db);
    playersSnap.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { votesCount: 0 });
    });
    const votesCol = collection(db, 'votes');
    const votesSnap = await getDocs(votesCol);
    votesSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    const settingsRef = doc(db, 'settings', 'voting');
    batch.set(settingsRef, { 
      lastResetAt: Date.now(),
      votingEnabled: true
    }, { merge: true });
    await batch.commit();
    cachedPlayers = null;
    cachedSettings = null;
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      localDb.players.forEach((p: any) => { p.votesCount = 0; });
      localDb.votes = {};
      localDb.settings.lastResetAt = Date.now();
      localDb.settings.votingEnabled = true;
      writeLocalDb(localDb);
      return { success: true };
    }
    throw err;
  }
}

async function safeUpdateSettings(config: any) {
  // Get current settings first to preserve fields like lastResetAt
  let existingSettings = DEFAULT_CONFIG;
  if (useLocalFallback) {
    try {
      existingSettings = readLocalDb().settings || DEFAULT_CONFIG;
    } catch (e) {}
  } else {
    try {
      existingSettings = await getSettingsWithCache();
    } catch (e) {
      try {
        existingSettings = readLocalDb().settings || DEFAULT_CONFIG;
      } catch (err2) {}
    }
  }

  const payload = {
    ...existingSettings,
    votingQuestion: config.votingQuestion !== undefined ? config.votingQuestion : (existingSettings.votingQuestion || ''),
    logoAzuup: config.logoAzuup !== undefined ? config.logoAzuup : (existingSettings.logoAzuup || ''),
    logoCampinense: config.logoCampinense !== undefined ? config.logoCampinense : (existingSettings.logoCampinense || ''),
    logoPrincipal: config.logoPrincipal !== undefined ? config.logoPrincipal : (existingSettings.logoPrincipal || ''),
    startDate: config.startDate !== undefined ? config.startDate : (existingSettings.startDate || ''),
    endDate: config.endDate !== undefined ? config.endDate : (existingSettings.endDate || ''),
    votingEnabled: config.votingEnabled !== undefined ? !!config.votingEnabled : !!existingSettings.votingEnabled,
    bannerUrl: config.bannerUrl !== undefined ? config.bannerUrl : (existingSettings.bannerUrl || ''),
    primaryColor: config.primaryColor !== undefined ? config.primaryColor : (existingSettings.primaryColor || '#2563eb'),
    sponsorName: config.sponsorName !== undefined ? config.sponsorName : (existingSettings.sponsorName || ''),
    sponsorPrize: config.sponsorPrize !== undefined ? config.sponsorPrize : (existingSettings.sponsorPrize || ''),
    sponsorLogoUrl: config.sponsorLogoUrl !== undefined ? config.sponsorLogoUrl : (existingSettings.sponsorLogoUrl || ''),
    lastResetAt: config.lastResetAt !== undefined ? config.lastResetAt : (existingSettings.lastResetAt || null),
  };

  if (useLocalFallback) {
    const localDb = readLocalDb();
    localDb.settings = payload;
    writeLocalDb(localDb);
    cachedSettings = payload;
    return { success: true };
  }
  try {
    const settingsRef = doc(db, 'settings', 'voting');
    await setDoc(settingsRef, payload, { merge: true });
    cachedSettings = payload;
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      localDb.settings = payload;
      writeLocalDb(localDb);
      cachedSettings = payload;
      return { success: true };
    }
    throw err;
  }
}

async function safeCreatePlayer(playerData: any) {
  const { name, team, position, imageUrl, imageFit, imagePosition, order } = playerData;
  const id = Math.random().toString(36).substring(2, 15);
  const payload = {
    id,
    name: name || '',
    team: team || '',
    position: position || '',
    imageUrl: imageUrl || '',
    imageFit: imageFit || 'cover',
    imagePosition: imagePosition || 'top',
    votesCount: 0,
    createdAt: Date.now(),
    order: order ? Number(order) : 0
  };

  if (useLocalFallback) {
    const localDb = readLocalDb();
    localDb.players.push(payload);
    writeLocalDb(localDb);
    return { id };
  }
  try {
    const playerDocRef = doc(db, 'players', id);
    await setDoc(playerDocRef, {
      name: payload.name,
      team: payload.team,
      position: payload.position,
      imageUrl: payload.imageUrl,
      imageFit: payload.imageFit,
      imagePosition: payload.imagePosition,
      votesCount: payload.votesCount,
      createdAt: payload.createdAt,
      order: payload.order
    });
    cachedPlayers = null;
    return { id };
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      localDb.players.push(payload);
      writeLocalDb(localDb);
      return { id };
    }
    throw err;
  }
}

async function safeUpdatePlayer(id: string, updates: any) {
  if (useLocalFallback) {
    const localDb = readLocalDb();
    const idx = localDb.players.findIndex((p: any) => p.id === id);
    if (idx !== -1) {
      localDb.players[idx] = { ...localDb.players[idx], ...updates };
      if ('order' in updates) {
        localDb.players[idx].order = Number(updates.order);
      }
      writeLocalDb(localDb);
    }
    return { success: true };
  }
  try {
    const playerDocRef = doc(db, 'players', id);
    const firestoreUpdates: any = { ...updates };
    if ('order' in updates) {
      firestoreUpdates.order = Number(updates.order);
    }
    await updateDoc(playerDocRef, firestoreUpdates);
    cachedPlayers = null;
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      const idx = localDb.players.findIndex((p: any) => p.id === id);
      if (idx !== -1) {
        localDb.players[idx] = { ...localDb.players[idx], ...updates };
        if ('order' in updates) {
          localDb.players[idx].order = Number(updates.order);
        }
        writeLocalDb(localDb);
      }
      return { success: true };
    }
    throw err;
  }
}

async function safeDeletePlayer(id: string) {
  if (useLocalFallback) {
    const localDb = readLocalDb();
    localDb.players = localDb.players.filter((p: any) => p.id !== id);
    writeLocalDb(localDb);
    return { success: true };
  }
  try {
    const playerDocRef = doc(db, 'players', id);
    await deleteDoc(playerDocRef);
    cachedPlayers = null;
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      localDb.players = localDb.players.filter((p: any) => p.id !== id);
      writeLocalDb(localDb);
      return { success: true };
    }
    throw err;
  }
}

async function safeDeleteVote(id: string) {
  if (useLocalFallback) {
    const localDb = readLocalDb();
    const vote = localDb.votes[id];
    if (vote) {
      const playerId = vote.playerId;
      const playerIndex = localDb.players.findIndex((p: any) => p.id === playerId);
      if (playerIndex !== -1) {
        localDb.players[playerIndex].votesCount = Math.max(0, (localDb.players[playerIndex].votesCount || 0) - 1);
      }
      delete localDb.votes[id];
      writeLocalDb(localDb);
    }
    return { success: true };
  }
  try {
    const voteDocRef = doc(db, 'votes', id);
    const voteSnap = await getDoc(voteDocRef);
    if (voteSnap.exists()) {
      const playerId = voteSnap.data().playerId;
      const playerDocRef = doc(db, 'players', playerId);
      const playerSnap = await getDoc(playerDocRef);
      const batch = writeBatch(db);
      batch.delete(voteDocRef);
      if (playerSnap.exists()) {
        batch.update(playerDocRef, {
          votesCount: Math.max(0, (playerSnap.data().votesCount || 0) - 1)
        });
      }
      await batch.commit();
      cachedPlayers = null;
    }
    return { success: true };
  } catch (err: any) {
    if (isQuotaError(err)) {
      useLocalFallback = true;
      const localDb = readLocalDb();
      const vote = localDb.votes[id];
      if (vote) {
        const playerId = vote.playerId;
        const playerIndex = localDb.players.findIndex((p: any) => p.id === playerId);
        if (playerIndex !== -1) {
          localDb.players[playerIndex].votesCount = Math.max(0, (localDb.players[playerIndex].votesCount || 0) - 1);
        }
        delete localDb.votes[id];
        writeLocalDb(localDb);
      }
      return { success: true };
    }
    throw err;
  }
}

// REST API Endpoints

app.get('/api/players', async (req, res) => {
  try {
    const players = await safeGetPlayers();
    res.json(players);
  } catch (err: any) {
    console.error("Error listing players:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/players', async (req, res) => {
  try {
    const result = await safeCreatePlayer(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error creating player:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/players/:id', async (req, res) => {
  try {
    const result = await safeUpdatePlayer(req.params.id, req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error updating player:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/players/:id', async (req, res) => {
  try {
    const result = await safeDeletePlayer(req.params.id);
    res.json(result);
  } catch (err: any) {
    console.error("Error deleting player:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/votes/:id', async (req, res) => {
  try {
    const result = await safeDeleteVote(req.params.id);
    res.json(result);
  } catch (err: any) {
    console.error("Error deleting vote:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/votes/check', async (req, res) => {
  try {
    const { voterId, dateStr } = req.query;
    if (!voterId || !dateStr) {
      return res.status(400).json({ error: 'voterId and dateStr are required' });
    }
    const result = await safeCheckVote(voterId as string, dateStr as string);
    res.json(result);
  } catch (err: any) {
    console.error("Error checking vote:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/votes', async (req, res) => {
  try {
    const { playerId, voterId, dateStr, voterInfo, userAgent } = req.body;
    if (!playerId || !voterId || !dateStr) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const result = await safeCastVote(playerId, voterId, dateStr, voterInfo, userAgent);
    res.json(result);
  } catch (err: any) {
    console.error("Error casting vote:", err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/votes/history', async (req, res) => {
  try {
    const limitCount = parseInt(req.query.limit as string) || 10;
    const result = await safeGetVotesHistory(limitCount);
    res.json(result);
  } catch (err: any) {
    console.error("Error getting vote history:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/votes/all', async (req, res) => {
  try {
    const result = await safeGetAllVotes();
    res.json(result);
  } catch (err: any) {
    console.error("Error getting all votes:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/votes/reset', async (req, res) => {
  try {
    const result = await safeResetAllVotes();
    res.json(result);
  } catch (err: any) {
    console.error("Error resetting all votes:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await safeGetSettings();
    res.json(settings);
  } catch (err: any) {
    console.error("Error reading settings:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const result = await safeUpdateSettings(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
