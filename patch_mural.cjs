const fs = require('fs');
let code = fs.readFileSync('src/components/MuralPanel.tsx', 'utf8');

const replace1 = `    let isMounted = true;
    let pollInterval: any;

    const loadData = async () => {
      try {
        const { getPlayers, getSystemConfig } = await import('../dbService');
        const [playersData, configData] = await Promise.all([
          getPlayers(),
          getSystemConfig()
        ]);
        
        if (!isMounted) return;
        
        const sortedPlayers = [...playersData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlayers(sortedPlayers);
        setTotalVotes(playersData.reduce((sum, p) => sum + p.votesCount, 0));
        setConfig(prev => ({ ...prev, ...configData }));
      } catch (err: any) {
        console.error("Mural load data error:", err);
      }
    };

    loadData();
    pollInterval = setInterval(loadData, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };`;

const target1 = `    // Real-time listener for players
    import('../firebase').then(({ db }) => {
      import('firebase/firestore').then(({ collection, onSnapshot, query, orderBy, doc }) => {
        const playersRef = collection(db, 'players');
        const q = query(playersRef, orderBy('votesCount', 'desc'), orderBy('name', 'asc'));
        
        const unsubscribePlayers = onSnapshot(q, (snapshot) => {
          const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Player));
          
          const sortedPlayers = [...playersData].sort((a, b) => (a.order || 0) - (b.order || 0));
          setPlayers(sortedPlayers);
          setTotalVotes(playersData.reduce((sum, p) => sum + p.votesCount, 0));
        }, (error) => {
          console.error("Mural players listener error:", error);
        });

        // Real-time listener for config
        const configRef = doc(db, 'settings', 'voting');
        const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setConfig(prev => ({ ...prev, ...data }));
          }
        }, (error) => {
          console.error("Mural config listener error:", error);
        });

        // Store cleanup (hacky since we are in promise chain, but works for simple unmount if needed)
        // Usually better to return cleanup from useEffect, but this is a quick patch.
        (window as any)._muralCleanup = () => {
          unsubscribePlayers();
          unsubscribeConfig();
        };
      });
    });

    return () => {
      if ((window as any)._muralCleanup) {
        (window as any)._muralCleanup();
      }
    };`;

code = code.replace(replace1, target1);
fs.writeFileSync('src/components/MuralPanel.tsx', code);
