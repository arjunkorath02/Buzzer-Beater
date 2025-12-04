import React, { useState, useEffect, useRef, useMemo } from 'https://esm.sh/react@18.2.0';
    import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
    import { 
      getAuth, 
      signInAnonymously, 
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      signInWithCustomToken
    } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
    import { 
      getFirestore, 
      collection, 
      doc, 
      setDoc, 
      updateDoc, 
      onSnapshot, 
      arrayUnion, 
      query, 
      where,
      getDocs,
      serverTimestamp
    } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
    
    // Lucide Icons
    import { 
      Smartphone, Monitor, Timer, Users, Trophy, Zap, Plus, Minus, 
      RefreshCw, Search, Lock, LogOut, ChevronRight, UserPlus, 
      PlayCircle, List, Edit2, Check, X, Mail, Key
    } from 'https://esm.sh/lucide-react@0.294.0';

    // --- Firebase Configuration ---
    // REPLACE THIS WITH YOUR OWN CONFIG IF NEEDED
    const firebaseConfig = {
      apiKey: "AIzaSyCKsrgWh96l19ZwpWbK_QIjIO3lATNaAIQ",
      authDomain: "buzzer-beater-ae6f8.firebaseapp.com",
      projectId: "buzzer-beater-ae6f8",
      storageBucket: "buzzer-beater-ae6f8.firebasestorage.app",
      messagingSenderId: "837054021400",
      appId: "1:837054021400:web:1cf3959c05f2c2e43a286d"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const appId = "buzzer-game-v1";
    const GAMES_COLLECTION = 'gameRooms';

    // --- Error Boundary ---
    class ErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = { hasError: false, error: null }; }
      static getDerivedStateFromError(error) { return { hasError: true, error }; }
      componentDidCatch(error, errorInfo) { console.error("Error:", error, errorInfo); }
      render() {
        if (this.state.hasError) {
          return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
              <div className="bg-red-900/50 p-6 rounded-lg border border-red-500 max-w-lg">
                <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
                <button onClick={() => window.location.reload()} className="bg-red-600 px-4 py-2 rounded font-bold">Reload</button>
              </div>
            </div>
          );
        }
        return this.props.children;
      }
    }

    // --- Helper Functions ---
    const generateCode = (length = 4) => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = '';
      for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return result;
    };

    const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- Components ---

    const Loading = ({ msg }) => (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin w-8 h-8 text-blue-500" />
          <p>{msg || 'Connecting...'}</p>
        </div>
      </div>
    );

    // --- AUTH COMPONENT ---
    const LoginView = ({ onBack, onSuccess }) => {
      const [isSignUp, setIsSignUp] = useState(false);
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);

      const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
          if (isSignUp) {
            await createUserWithEmailAndPassword(auth, email, password);
          } else {
            await signInWithEmailAndPassword(auth, email, password);
          }
          onSuccess();
        } catch (err) {
          console.error(err);
          let msg = "Authentication failed.";
          if(err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
          if(err.code === 'auth/email-already-in-use') msg = "Email already registered.";
          if(err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
          setError(msg);
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-center">{isSignUp ? 'Create Host Account' : 'Host Login'}</h2>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 ring-blue-500 outline-none"
                    placeholder="host@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 ring-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && <div className="text-red-400 text-sm text-center bg-red-900/30 p-2 rounded">{error}</div>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 hover:underline ml-1 font-bold">
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700 text-center">
              <button onClick={onBack} className="text-slate-500 hover:text-slate-300 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    };

    // --- PLAYER VIEW ---
    const PlayerView = ({ game, player, playerId, gameId }) => {
      const [buzzed, setBuzzed] = useState(false);
      const [feedback, setFeedback] = useState('');
      const [showLeaderboard, setShowLeaderboard] = useState(false);

      useEffect(() => {
        if (game.buzzes) {
          const myBuzz = game.buzzes.find(b => b.playerId === playerId);
          setBuzzed(!!myBuzz);
          if (myBuzz) {
            const rank = game.buzzes.findIndex(b => b.playerId === playerId) + 1;
            setFeedback(`Buzzed! Rank: ${rank}`);
          } else {
            setFeedback('');
            setBuzzed(false);
          }
        }
      }, [game.buzzes, playerId]);

      const handleBuzz = async () => {
        if (!game.buzzerOpen || buzzed || game.timer <= 0) return;
        setBuzzed(true); setFeedback('Buzzing...');
        try {
          const gameRef = doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, gameId);
          await updateDoc(gameRef, {
            buzzes: arrayUnion({ playerId, playerName: player.name, team: player.team, timestamp: Date.now() })
          });
        } catch (e) { setBuzzed(false); setFeedback('Failed to buzz'); }
      };

      const sortedPlayers = useMemo(() => Object.values(game.players || {}).sort((a, b) => b.score - a.score), [game.players]);
      const isBuzzerEnabled = game.buzzerOpen && game.timer > 0 && !buzzed;

      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col relative">
          <div className="bg-slate-800 p-4 shadow-lg flex justify-between items-center z-10">
            <div><h2 className="font-bold text-lg">{player.name}</h2><span className="text-sm text-slate-400">{player.team}</span></div>
            <div className="text-right"><div className="text-2xl font-mono font-bold text-blue-400">{game.timer}s</div><div className="text-xs text-slate-400">Round {game.round}</div></div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <button onClick={handleBuzz} disabled={!isBuzzerEnabled}
              className={`w-64 h-64 rounded-full border-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center transition-all transform active:scale-95 ${isBuzzerEnabled ? 'bg-red-600 border-red-800 hover:bg-red-500 hover:shadow-[0_0_80px_rgba(220,38,38,0.6)] cursor-pointer' : buzzed ? 'bg-green-600 border-green-800 opacity-100' : 'bg-slate-700 border-slate-800 opacity-50 cursor-not-allowed'}`}
            >
              {buzzed ? <Zap className="w-20 h-20 text-white animate-pulse" /> : <Smartphone className="w-20 h-20 text-white" />}
              <span className="mt-2 font-bold text-xl uppercase tracking-widest">{buzzed ? 'LOCKED IN' : 'PUSH'}</span>
            </button>
            <div className="h-12 mt-8 font-bold text-xl text-center text-yellow-400 animate-bounce">{feedback}</div>
          </div>

          <div className="bg-slate-800 p-4 flex justify-between items-center shadow-lg z-10">
            <div className="text-sm text-slate-400">My Score: <span className="text-white font-bold text-lg ml-1">{player.score}</span></div>
            <button onClick={() => setShowLeaderboard(true)} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"><Trophy size={14} /> Leaderboard</button>
          </div>

          {showLeaderboard && (
            <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col animate-in fade-in duration-200">
              <div className="bg-slate-800 p-4 flex justify-between items-center shadow-md">
                <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-400"><Trophy size={24} /> Leaderboard</h2>
                <button onClick={() => setShowLeaderboard(false)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <table className="w-full text-left border-collapse">
                  <thead className="text-xs text-slate-500 uppercase border-b border-slate-700"><tr><th className="pb-3 pl-2">Rank</th><th className="pb-3">Player</th><th className="pb-3 text-right pr-2">Score</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedPlayers.map((p, index) => (
                      <tr key={p.id} className={`${p.id === playerId ? 'bg-indigo-900/30' : ''}`}>
                        <td className="py-3 pl-2 font-mono text-slate-400 w-12">#{index + 1}</td>
                        <td className="py-3"><div className={`font-bold ${p.id === playerId ? 'text-indigo-400' : 'text-white'}`}>{p.name} {p.id === playerId && '(You)'}</div><div className="text-xs text-slate-500">{p.team}</div></td>
                        <td className="py-3 text-right pr-2 font-mono text-xl text-yellow-500 font-bold">{p.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    };

    // --- HOST VIEW ---
    const HostView = ({ user, onLogout }) => {
      const [viewState, setViewState] = useState('list');
      const [games, setGames] = useState([]);
      const [activeGameId, setActiveGameId] = useState(null);
      const [gameData, setGameData] = useState(null);
      
      const [newTeamName, setNewTeamName] = useState('');
      const [newPlayerName, setNewPlayerName] = useState('');
      const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState('');
      
      const [newRoundTime, setNewRoundTime] = useState(30);
      const [newRoundQualifiers, setNewRoundQualifiers] = useState(10);
      const [editingRoundId, setEditingRoundId] = useState(null);
      const [editRoundTime, setEditRoundTime] = useState(30);
      const [editRoundQualifiers, setEditRoundQualifiers] = useState(10);
      const [searchQuery, setSearchQuery] = useState('');

      // Fetch games for this user
      useEffect(() => {
        if (!user) return;
        const gamesRef = collection(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION);
        const q = query(gamesRef); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const myGames = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            // Match game by Host ID (User ID)
            if (data.hostId === user.uid) myGames.push({ id: doc.id, ...data });
          });
          setGames(myGames);
        });
        return () => unsubscribe();
      }, [user]);

      // Sync active game
      useEffect(() => {
        if (!activeGameId) return;
        const gameRef = doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId);
        const unsubscribe = onSnapshot(gameRef, (doc) => { if (doc.exists()) setGameData(doc.data()); });
        return () => unsubscribe();
      }, [activeGameId]);

      // Timer Logic
      useEffect(() => {
        let interval = null;
        if (gameData?.buzzerOpen && gameData?.timer > 0) {
          interval = setInterval(() => {
            const newTime = gameData.timer - 1;
            updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
              timer: newTime, buzzerOpen: newTime > 0
            });
          }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
      }, [gameData?.buzzerOpen, gameData?.timer, activeGameId]);

      const createGame = async () => {
        const code = generateCode(6);
        const newGame = {
          hostId: user.uid,
          code,
          createdAt: serverTimestamp(),
          initialTimer: 30, timer: 30, buzzerOpen: false, round: 1, buzzes: [], players: {}, teams: [],
          rounds: [{ id: 1, label: 'Round 1', timer: 30, qualifiers: 100 }],
          status: 'lobby'
        };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, code), newGame);
        setActiveGameId(code);
        setViewState('lobby');
      };

      const handleMainButton = async () => {
        if (!gameData) return;
        const initialTime = gameData.initialTimer || 30;
        const isDirty = gameData.buzzerOpen || (gameData.timer !== initialTime && gameData.timer !== 0);
        if (isDirty || gameData.timer === 0) {
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), { buzzerOpen: false, timer: initialTime, buzzes: [] });
        } else {
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), { buzzerOpen: true });
        }
      };

      const updateScore = async (pid, delta) => {
        const p = gameData.players[pid];
        const newScore = p.score + delta;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
          players: { ...gameData.players, [pid]: { ...p, score: newScore } }
        });
      };

      const resetBuzzers = async () => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), { buzzes: [] });
      
      const addNewRound = async () => {
        const nextId = (gameData.rounds || []).length + 1;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
          rounds: arrayUnion({ id: nextId, label: `Round ${nextId}`, timer: newRoundTime, qualifiers: newRoundQualifiers })
        });
      };
      
      const activateRound = async (r) => {
        const sorted = Object.values(gameData.players).sort((a, b) => b.score - a.score);
        const qIds = sorted.slice(0, r.qualifiers).map(p => p.id);
        const updatedPlayers = { ...gameData.players };
        Object.keys(updatedPlayers).forEach(pid => updatedPlayers[pid].active = qIds.includes(pid));
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
          round: r.id, timer: r.timer, initialTimer: r.timer, buzzerOpen: false, buzzes: [], players: updatedPlayers
        });
      };

      const saveRound = async () => {
        const updatedRounds = gameData.rounds.map(r => r.id === editingRoundId ? { ...r, timer: editRoundTime, qualifiers: editRoundQualifiers } : r);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), { rounds: updatedRounds });
        setEditingRoundId(null);
      };

      const addPlayer = async () => {
        if(!newPlayerName.trim()) return;
        const pid = crypto.randomUUID();
        const pCode = generateCode(4);
        const newP = { id: pid, name: newPlayerName, team: selectedTeamForPlayer || 'Unassigned', code: pCode, score: 0, active: true };
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
           players: { ...gameData.players, [pid]: newP }
        });
        setNewPlayerName('');
      };

      const addTeam = async () => {
        if(!newTeamName.trim()) return;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), { teams: arrayUnion(newTeamName) });
        setNewTeamName('');
      };

      if (viewState === 'list') {
        return (
          <div className="p-6 max-w-4xl mx-auto text-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                
