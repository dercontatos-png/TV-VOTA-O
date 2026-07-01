const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replace1 = `// Real-time synchronization for Players and System Config (Replaced with API polling)
  useEffect(() => {
    let isMounted = true;
    let pollInterval: any;

    const loadData = async () => {
      try {
        const { getPlayers, getSystemConfig } = await import('./dbService');
        const [playersData, configData] = await Promise.all([
          getPlayers(),
          getSystemConfig()
        ]);
        
        if (!isMounted) return;
        
        setPlayers(playersData);
        setConfig(configData);
        setLoading(false);
        setErrorMsg(null);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error fetching data:", err);
        setErrorMsg("Erro ao carregar dados. Verifique sua conexão.");
        setLoading(false);
      }
    };

    loadData();
    
    // Poll every 10 seconds for updates
    pollInterval = setInterval(loadData, 10000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);`;

const target1 = `  // Real-time synchronization for Players and System Config
  useEffect(() => {
    let unsubscribePlayers: () => void;
    let unsubscribeConfig: () => void;

    const setupRealtimeSubscriptions = async () => {
      // Fallback timeout to ensure we don't get stuck on the loading screen forever
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 5000);

      try {
        const { collection, query, orderBy, onSnapshot, doc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        // Subscribe to system config
        const configRef = doc(db, 'settings', 'voting');
        unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            import('./dbService').then(({ DEFAULT_CONFIG }) => {
              setConfig({ ...DEFAULT_CONFIG, ...data } as SystemConfig);
            });
          } else {
            import('./dbService').then(({ DEFAULT_CONFIG }) => setConfig(DEFAULT_CONFIG));
          }
        }, (error) => {
          console.error("Config snapshot error:", error);
          if (error.code === 'resource-exhausted' || error.message.includes('Quota')) {
            setErrorMsg("O limite de acessos diários ao banco de dados foi atingido (Cota Gratuita Excedida). Os dados estarão disponíveis novamente amanhã.");
          }
        });

        // Subscribe to players
        const playersRef = collection(db, 'players');
        unsubscribePlayers = onSnapshot(playersRef, (snapshot) => {
          clearTimeout(loadingTimeout);
          const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Player));
          
          const sortedPlayers = [...playersData].sort((a, b) => (a.order || 0) - (b.order || 0));
          setPlayers(sortedPlayers);
          setLoading(false);
          setErrorMsg(null);
        }, (error) => {
          clearTimeout(loadingTimeout);
          console.error("Snapshot error:", error);
          if (error.code === 'resource-exhausted' || error.message.includes('Quota')) {
            setErrorMsg("O limite de acessos diários ao banco de dados foi atingido (Cota Gratuita Excedida). Os dados estarão disponíveis novamente amanhã.");
          } else {
            setErrorMsg("Erro ao carregar dados. Verifique sua conexão.");
          }
          setLoading(false);
        });

      } catch (err: any) {
        clearTimeout(loadingTimeout);
        console.error("Error setting up real-time sync:", err);
        if (err.code === 'resource-exhausted' || (err.message && err.message.includes('Quota'))) {
          setErrorMsg("O limite de acessos diários ao banco de dados foi atingido (Cota Gratuita Excedida). Os dados estarão disponíveis novamente amanhã.");
        }
        setLoading(false);
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      if (unsubscribePlayers) unsubscribePlayers();
      if (unsubscribeConfig) unsubscribeConfig();
    };
  }, []);`;

code = code.replace(replace1, target1);
fs.writeFileSync('src/App.tsx', code);
