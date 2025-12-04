import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
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
} from 'firebase/firestore';
import { 
  Smartphone, 
  Monitor, 
  Timer, 
  Users, 
  Trophy, 
  Zap, 
  Plus, 
  Minus,
  RefreshCw, 
  Search, 
  Lock,
  LogOut,
  ChevronRight,
  UserPlus,
  PlayCircle,
  List,
  Edit2,
  Check,
  X
} from 'lucide-react';

// --- Firebase Initialization ---
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKsrgWh96l19ZwpWbK_QIjIO3lATNaAIQ",
  authDomain: "buzzer-beater-ae6f8.firebaseapp.com",
  projectId: "buzzer-beater-ae6f8",
  storageBucket: "buzzer-beater-ae6f8.firebasestorage.app",
  messagingSenderId: "837054021400",
  appId: "1:837054021400:web:1cf3959c05f2c2e43a286d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "buzzer-game-v1";

// Define the specific collection name to ensure valid path depth (5 segments for collection)
const GAMES_COLLECTION = 'gameRooms';

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-6">
          <div className="bg-red-900/50 p-6 rounded-lg border border-red-500 max-w-lg">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <p className="text-sm font-mono mb-4">{this.state.error?.toString()}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-bold"
            >
              Reload Application
            </button>
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
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// --- Components ---

// 1. Loading / Error UI
const Loading = ({ msg }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
    <div className="flex flex-col items-center gap-4">
      <RefreshCw className="animate-spin w-8 h-8 text-blue-500" />
      <p>{msg || 'Connecting...'}</p>
    </div>
  </div>
);

// 2. Player View
const PlayerView = ({ game, player, playerId, gameId }) => {
  const [buzzed, setBuzzed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Check if I have buzzed
  useEffect(() => {
    if (game.buzzes) {
      const myBuzz = game.buzzes.find(b => b.playerId === playerId);
      setBuzzed(!!myBuzz);
      
      if (myBuzz) {
        // Calculate rank
        const rank = game.buzzes.findIndex(b => b.playerId === playerId) + 1;
        setFeedback(`Buzzed! Rank: ${rank}`);
      } else {
        setFeedback('');
        setBuzzed(false); // Reset local buzz state if removed from server
      }
    }
  }, [game.buzzes, playerId]);

  const handleBuzz = async () => {
    if (!game.buzzerOpen || buzzed || game.timer <= 0) return;

    // Optimistic UI
    setBuzzed(true); 
    setFeedback('Buzzing...');

    try {
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, gameId);
      // We push an object with ID and client timestamp (reliable enough for relative diffs in this context)
      await updateDoc(gameRef, {
        buzzes: arrayUnion({
          playerId,
          playerName: player.name,
          team: player.team,
          timestamp: Date.now()
        })
      });
    } catch (e) {
      console.error("Buzz failed", e);
      setBuzzed(false);
      setFeedback('Failed to buzz');
    }
  };

  // Calculate sorted players for leaderboard
  const sortedPlayers = useMemo(() => {
    return Object.values(game.players || {}).sort((a, b) => b.score - a.score);
  }, [game.players]);

  const isBuzzerEnabled = game.buzzerOpen && game.timer > 0 && !buzzed;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative">
      {/* Header */}
      <div className="bg-slate-800 p-4 shadow-lg flex justify-between items-center z-10">
        <div>
          <h2 className="font-bold text-lg">{player.name}</h2>
          <span className="text-sm text-slate-400">{player.team}</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-blue-400">{game.timer}s</div>
          <div className="text-xs text-slate-400">Round {game.round}</div>
        </div>
      </div>

      {/* Main Buzzer Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <button
          onClick={handleBuzz}
          disabled={!isBuzzerEnabled}
          className={`
            w-64 h-64 rounded-full border-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]
            flex flex-col items-center justify-center transition-all transform active:scale-95
            ${isBuzzerEnabled 
              ? 'bg-red-600 border-red-800 hover:bg-red-500 hover:shadow-[0_0_80px_rgba(220,38,38,0.6)] cursor-pointer' 
              : buzzed 
                ? 'bg-green-600 border-green-800 opacity-100'
                : 'bg-slate-700 border-slate-800 opacity-50 cursor-not-allowed'
            }
          `}
        >
          {buzzed ? <Zap className="w-20 h-20 text-white animate-pulse" /> : <Smartphone className="w-20 h-20 text-white" />}
          <span className="mt-2 font-bold text-xl uppercase tracking-widest">
            {buzzed ? 'LOCKED IN' : 'PUSH'}
          </span>
        </button>

        <div className="h-12 mt-8 font-bold text-xl text-center text-yellow-400 animate-bounce">
          {feedback}
        </div>
      </div>

      {/* Footer Info & Leaderboard Toggle */}
      <div className="bg-slate-800 p-4 flex justify-between items-center shadow-lg z-10">
        <div className="text-sm text-slate-400">
          My Score: <span className="text-white font-bold text-lg ml-1">{player.score}</span>
        </div>
        <button 
          onClick={() => setShowLeaderboard(true)}
          className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
        >
          <Trophy size={14} /> Leaderboard
        </button>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col animate-in fade-in duration-200">
          <div className="bg-slate-800 p-4 flex justify-between items-center shadow-md">
            <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
              <Trophy size={24} /> Leaderboard
            </h2>
            <button 
              onClick={() => setShowLeaderboard(false)} 
              className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <table className="w-full text-left border-collapse">
              <thead className="text-xs text-slate-500 uppercase border-b border-slate-700">
                <tr>
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Player</th>
                  <th className="pb-3 text-right pr-2">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedPlayers.map((p, index) => (
                  <tr key={p.id} className={`${p.id === playerId ? 'bg-indigo-900/30' : ''}`}>
                    <td className="py-3 pl-2 font-mono text-slate-400 w-12">
                      #{index + 1}
                    </td>
                    <td className="py-3">
                      <div className={`font-bold ${p.id === playerId ? 'text-indigo-400' : 'text-white'}`}>
                        {p.name} {p.id === playerId && '(You)'}
                      </div>
                      <div className="text-xs text-slate-500">{p.team}</div>
                    </td>
                    <td className="py-3 text-right pr-2 font-mono text-xl text-yellow-500 font-bold">
                      {p.score}
                    </td>
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

// 3. Host View
const HostView = ({ user, onLogout }) => {
  const [viewState, setViewState] = useState('list'); // list, lobby, game
  const [games, setGames] = useState([]);
  const [activeGameId, setActiveGameId] = useState(null);
  const [gameData, setGameData] = useState(null);
  
  // Game Setup States
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState('');
  
  // Round Management States
  const [newRoundTime, setNewRoundTime] = useState(30);
  const [newRoundQualifiers, setNewRoundQualifiers] = useState(10);
  const [editingRoundId, setEditingRoundId] = useState(null);
  const [editRoundTime, setEditRoundTime] = useState(30);
  const [editRoundQualifiers, setEditRoundQualifiers] = useState(10);
  
  const [searchQuery, setSearchQuery] = useState('');
  const timerIntervalRef = useRef(null);

  // Fetch Host's games
  useEffect(() => {
    if (!user) return;
    const gamesRef = collection(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION);
    const q = query(gamesRef); 
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const myGames = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.hostId === user.uid) {
          myGames.push({ id: doc.id, ...data });
        }
      });
      setGames(myGames);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Active Game
  useEffect(() => {
    if (!activeGameId) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        setGameData(doc.data());
      }
    });
    return () => unsubscribe();
  }, [activeGameId]);

  // --- Host Actions ---

  const createGame = async () => {
    const code = generateCode(6);
    const newGame = {
      hostId: user.uid,
      code,
      createdAt: serverTimestamp(),
      initialTimer: 30,
      timer: 30,
      buzzerOpen: false,
      round: 1,
      buzzes: [],
      players: {}, 
      teams: [],
      // Default Rounds Configuration
      rounds: [
        { id: 1, label: 'Round 1', timer: 30, qualifiers: 100 } // Default 100 qualifiers means everyone
      ],
      status: 'lobby'
    };
    
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, code), newGame);
    setActiveGameId(code);
    setViewState('lobby');
  };

  const addTeam = async () => {
    if (!newTeamName.trim() || !gameData) return;
    const teams = gameData.teams || [];
    if (!teams.includes(newTeamName)) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
        teams: arrayUnion(newTeamName)
      });
    }
    setNewTeamName('');
  };

  const addPlayer = async () => {
    if (!newPlayerName.trim() || !gameData) return;
    
    const playerId = crypto.randomUUID();
    const playerCode = generateCode(4);
    const newPlayer = {
      id: playerId,
      name: newPlayerName,
      team: selectedTeamForPlayer || 'Unassigned',
      code: playerCode,
      score: 0,
      active: true
    };

    const updatedPlayers = { ...gameData.players, [playerId]: newPlayer };
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
      players: updatedPlayers
    });
    
    setNewPlayerName('');
  };

  const updateScore = async (playerId, delta) => {
    const player = gameData.players[playerId];
    // Removed Math.max(0, ...) to allow negative scores
    const newScore = player.score + delta;
    const updatedPlayers = {
      ...gameData.players,
      [playerId]: { ...player, score: newScore }
    };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
      players: updatedPlayers
    });
  };

  const handleMainButton = async () => {
    if (!gameData) return;
    
    const initialTime = gameData.initialTimer || 30;
    const isDirty = gameData.buzzerOpen || (gameData.timer !== initialTime && gameData.timer !== 0);

    if (isDirty || gameData.timer === 0) {
       // RESET
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
         buzzerOpen: false,
         timer: initialTime,
         buzzes: []
       });
    } else {
       // OPEN
       await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
         buzzerOpen: true
       });
    }
  };

  // Improved Timer Logic using useEffect on Host
  useEffect(() => {
    let interval = null;
    if (gameData?.buzzerOpen && gameData?.timer > 0) {
      interval = setInterval(() => {
        const newTime = gameData.timer - 1;
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
          timer: newTime,
          buzzerOpen: newTime > 0
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameData?.buzzerOpen, gameData?.timer, activeGameId]);

  const resetBuzzers = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
      buzzes: []
    });
  };

  // --- Round Logic ---

  const addNewRound = async () => {
    if (!gameData.rounds) return;
    const nextId = gameData.rounds.length + 1;
    const newRound = {
      id: nextId,
      label: `Round ${nextId}`,
      timer: newRoundTime,
      qualifiers: newRoundQualifiers
    };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
      rounds: arrayUnion(newRound)
    });
  };

  const activateRound = async (roundConfig) => {
    // 1. Determine Qualifiers based on CURRENT scores
    const sortedPlayers = Object.values(gameData.players).sort((a, b) => b.score - a.score);
    // Take Top N
    const qualifiedIds = sortedPlayers.slice(0, roundConfig.qualifiers).map(p => p.id);
    
    // 2. Update Players Active Status
    const updatedPlayers = { ...gameData.players };
    Object.keys(updatedPlayers).forEach(pid => {
      updatedPlayers[pid].active = qualifiedIds.includes(pid);
    });

    // 3. Update Game State
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
      round: roundConfig.id,
      timer: roundConfig.timer,
      initialTimer: roundConfig.timer,
      buzzerOpen: false,
      buzzes: [],
      players: updatedPlayers
    });
  };

  const startEditingRound = (round) => {
    setEditingRoundId(round.id);
    setEditRoundTime(round.timer);
    setEditRoundQualifiers(round.qualifiers);
  };

  const saveRound = async () => {
    if (!gameData.rounds) return;
    
    const updatedRounds = gameData.rounds.map(r => {
      if (r.id === editingRoundId) {
        return { 
          ...r, 
          timer: editRoundTime, 
          qualifiers: editRoundQualifiers 
        };
      }
      return r;
    });

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, activeGameId), {
      rounds: updatedRounds
    });
    
    setEditingRoundId(null);
  };

  // --- Sub-Views ---

  if (viewState === 'list') {
    return (
      <div className="p-6 max-w-4xl mx-auto text-white">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="text-blue-500" /> Host Dashboard
          </h1>
          <button onClick={onLogout} className="text-slate-400 hover:text-white">
            <LogOut />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            onClick={createGame}
            className="bg-blue-600 p-8 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-700 transition shadow-lg"
          >
            <Plus className="w-12 h-12 mb-2" />
            <h3 className="text-xl font-bold">Create New Game Room</h3>
          </div>

          {games.map(g => (
            <div 
              key={g.id}
              onClick={() => { setActiveGameId(g.id); setViewState('lobby'); }}
              className="bg-slate-800 p-6 rounded-xl cursor-pointer hover:bg-slate-700 transition border border-slate-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold font-mono text-yellow-400">{g.code}</h3>
                  <p className="text-slate-400 text-sm">Created: {new Date(g.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-900 px-3 py-1 rounded text-xs">
                  Round {g.round}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                <Users className="w-4 h-4" />
                {Object.keys(g.players || {}).length} Players
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!gameData) return <Loading msg="Loading Game Room..." />;

  // Button State Logic
  const initialTime = gameData.initialTimer || 30;
  // If buzzer is open OR timer has moved (is dirty), show RESET. Otherwise show OPEN.
  const isDirty = gameData.buzzerOpen || (gameData.timer !== initialTime);
  const mainButtonLabel = isDirty ? "RESET" : "OPEN";
  const mainButtonColor = isDirty ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500";

  // Sort players for leaderboard
  const playerList = Object.values(gameData.players || {}).filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort buzzes
  const buzzes = (gameData.buzzes || []).sort((a, b) => a.timestamp - b.timestamp).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewState('list')} className="p-2 hover:bg-slate-700 rounded">
            &larr; Games
          </button>
          <div>
            <h2 className="font-bold text-xl font-mono text-yellow-400 tracking-wider">CODE: {gameData.code}</h2>
            <div className="text-xs text-slate-400">Round {gameData.round} • {gameData.status}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className={`px-4 py-2 rounded font-bold font-mono text-2xl ${gameData.timer <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
              {formatTime(gameData.timer)}
           </div>
           <button 
             onClick={handleMainButton}
             className={`px-8 py-2 rounded font-bold transition-colors shadow-lg ${mainButtonColor}`}
           >
             {mainButtonLabel}
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT PANEL: Game Controls & Buzzers */}
        <div className="w-full md:w-1/3 p-4 border-r border-slate-700 flex flex-col gap-6 overflow-y-auto">
          
          {/* Round Management (New Feature) */}
          <div className="bg-slate-800 p-4 rounded-lg space-y-3">
             <h3 className="font-bold text-slate-300 flex items-center gap-2">
               <List className="w-4 h-4" /> Round Management
             </h3>
             
             {/* List of Rounds */}
             <div className="space-y-2 mb-4">
               {(gameData.rounds || []).map((round) => {
                 const isEditing = editingRoundId === round.id;
                 const isActive = gameData.round === round.id;
                 
                 if (isEditing) {
                   return (
                     <div key={round.id} className="bg-slate-900 border border-blue-500 rounded p-2 flex gap-2 items-center">
                       <div className="flex-1 space-y-1">
                         <div className="text-[10px] text-slate-400">Time (s)</div>
                         <input 
                           type="number" 
                           value={editRoundTime}
                           onChange={(e) => setEditRoundTime(Number(e.target.value))}
                           className="w-full bg-slate-800 rounded border border-slate-600 px-1 py-0.5 text-sm"
                         />
                         <div className="text-[10px] text-slate-400">Qualifiers</div>
                         <input 
                           type="number" 
                           value={editRoundQualifiers}
                           onChange={(e) => setEditRoundQualifiers(Number(e.target.value))}
                           className="w-full bg-slate-800 rounded border border-slate-600 px-1 py-0.5 text-sm"
                         />
                       </div>
                       <div className="flex flex-col gap-1">
                         <button onClick={saveRound} className="p-1 bg-green-600 rounded hover:bg-green-500"><Check size={14}/></button>
                         <button onClick={() => setEditingRoundId(null)} className="p-1 bg-red-600 rounded hover:bg-red-500"><X size={14}/></button>
                       </div>
                     </div>
                   )
                 }

                 return (
                   <div 
                      key={round.id} 
                      className={`flex justify-between items-center p-2 rounded border ${isActive ? 'bg-indigo-900/50 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}
                   >
                     <div className="flex-1">
                       <div className="font-bold text-sm text-white flex items-center gap-2">
                         {round.label}
                         {isActive && <span className="text-[10px] bg-green-500 text-black px-1 rounded font-bold">ACTIVE</span>}
                       </div>
                       <div className="text-xs text-slate-400">{round.timer}s • Top {round.qualifiers}</div>
                     </div>
                     <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEditingRound(round)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => activateRound(round)}
                          className={`px-2 py-1 text-xs font-bold rounded ${isActive ? 'bg-slate-600 text-slate-300' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                        >
                          {isActive ? 'RESET' : 'GO'}
                        </button>
                     </div>
                   </div>
                 )
               })}
             </div>

             {/* Add New Round Form */}
             <div className="pt-3 border-t border-slate-700">
               <div className="text-xs font-bold text-slate-400 mb-2">Create New Round</div>
               <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Seconds</label>
                    <input 
                      type="number" 
                      value={newRoundTime}
                      onChange={(e) => setNewRoundTime(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Qualifiers</label>
                    <input 
                      type="number" 
                      value={newRoundQualifiers}
                      onChange={(e) => setNewRoundQualifiers(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                    />
                  </div>
               </div>
               <button onClick={addNewRound} className="w-full bg-slate-700 hover:bg-slate-600 py-1 rounded text-xs font-bold text-slate-300">
                 + Add Next Round
               </button>
             </div>
          </div>

          {/* Active Buzzers */}
          <div className="bg-slate-800 p-4 rounded-lg flex-1 min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> Live Buzzers
              </h3>
              <button onClick={resetBuzzers} className="text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">
                Clear
              </button>
            </div>
            
            <div className="space-y-2">
              {buzzes.length === 0 && <p className="text-slate-500 text-sm text-center italic py-8">Waiting for buzzers...</p>}
              {buzzes.map((buzz, idx) => (
                <div key={idx} className="bg-slate-900 p-3 rounded flex justify-between items-center border border-slate-700 animate-in fade-in slide-in-from-left-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-500 text-black font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold">{buzz.playerName}</div>
                      <div className="text-xs text-slate-400">{buzz.team}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                     {idx === 0 ? 'WINNER' : `+${(buzz.timestamp - buzzes[0].timestamp)}ms`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Player Management & Leaderboard */}
        <div className="flex-1 p-4 bg-slate-900 flex flex-col overflow-hidden">
          
          {/* Add Player / Team Section */}
          <div className="bg-slate-800 p-4 rounded-lg mb-4">
             <div className="flex flex-wrap gap-4">
                {/* Team Add */}
                <div className="flex-1 min-w-[200px]">
                   <label className="text-xs text-slate-400 mb-1 block">New Team</label>
                   <div className="flex gap-2">
                     <input 
                       value={newTeamName}
                       onChange={(e) => setNewTeamName(e.target.value)}
                       placeholder="Team Name"
                       className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                     />
                     <button onClick={addTeam} className="bg-green-600 hover:bg-green-500 px-3 rounded"><Plus size={16}/></button>
                   </div>
                </div>

                {/* Player Add */}
                <div className="flex-[2] min-w-[300px]">
                   <label className="text-xs text-slate-400 mb-1 block">Register Player & Generate Code</label>
                   <div className="flex gap-2">
                     <input 
                       value={newPlayerName}
                       onChange={(e) => setNewPlayerName(e.target.value)}
                       placeholder="Player Name"
                       className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                     />
                     <select 
                       value={selectedTeamForPlayer}
                       onChange={(e) => setSelectedTeamForPlayer(e.target.value)}
                       className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm max-w-[150px]"
                     >
                       <option value="">No Team</option>
                       {(gameData.teams || []).map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                     <button onClick={addPlayer} className="bg-blue-600 hover:bg-blue-500 px-3 rounded whitespace-nowrap flex items-center gap-1">
                       <UserPlus size={16}/> Gen Code
                     </button>
                   </div>
                </div>
             </div>
          </div>

          {/* Leaderboard Header */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-300 flex items-center gap-2">
               <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2 text-slate-500" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="bg-slate-800 border-none rounded-full py-1 pl-8 pr-4 text-sm focus:ring-2 ring-blue-500"
              />
            </div>
          </div>

          {/* Player Table */}
          <div className="flex-1 overflow-y-auto bg-slate-800 rounded-lg">
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-700 text-slate-300 text-xs uppercase sticky top-0">
                 <tr>
                   <th className="p-3">Player / Code</th>
                   <th className="p-3">Team</th>
                   <th className="p-3 text-center">Active</th>
                   <th className="p-3 text-right">Score</th>
                   <th className="p-3 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-700">
                 {playerList.sort((a,b) => b.score - a.score).map(player => (
                   <tr key={player.id} className={`hover:bg-slate-750 ${!player.active ? 'opacity-50 grayscale' : ''}`}>
                     <td className="p-3">
                       <div className="font-bold text-white">{player.name}</div>
                       <div className="text-xs font-mono text-yellow-400 bg-slate-900 inline-block px-1 rounded mt-1 select-all">
                         {player.code}
                       </div>
                     </td>
                     <td className="p-3 text-sm text-slate-300">{player.team}</td>
                     <td className="p-3 text-center">
                       <div className={`w-2 h-2 rounded-full mx-auto ${player.active ? 'bg-green-500' : 'bg-red-500'}`} />
                     </td>
                     <td className="p-3 text-right font-mono text-xl">{player.score}</td>
                     <td className="p-3 text-right">
                       <div className="flex justify-end gap-1">
                        <button 
                           onClick={() => updateScore(player.id, -0.5)}
                           className="bg-red-600 hover:bg-red-500 text-white p-1 rounded"
                           title="-0.5"
                         >
                           <Minus size={14} />
                         </button>
                         <button 
                           onClick={() => updateScore(player.id, 0.5)}
                           className="bg-green-600 hover:bg-green-500 text-white p-1 rounded"
                           title="+0.5"
                         >
                           <Plus size={14} />
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>

        </div>
      </div>
    </div>
  );
};


// 4. Main Application Entry
export default function BuzzerApp() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(null); // 'host' or 'player' or null
  const [loading, setLoading] = useState(true);

  // Auth State
  useEffect(() => {
    // Basic Auth
    const initAuth = async () => {
      // Use custom token if provided (rare in this specific environment but good practice)
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
          await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Player Login Logic ---
  const [gameCode, setGameCode] = useState('');
  const [playerCode, setPlayerCode] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [activePlayerGame, setActivePlayerGame] = useState(null);
  const [playerIdentity, setPlayerIdentity] = useState(null);

  const handlePlayerJoin = async () => {
    setPlayerError('');
    if (!gameCode || !playerCode) {
      setPlayerError('Please enter both codes.');
      return;
    }

    try {
      const gCode = gameCode.trim().toUpperCase(); // Not strictly uppercase in generator but let's assume strict input
      const pCode = playerCode.trim().toUpperCase();

      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, gCode);
      const gameSnap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION), where('code', '==', gCode)));
      
      // Since we use code as doc ID in creation, we can try direct get
      // But let's check the query result to be robust if ID != Code
      // In createGame, we did setDoc(..., code, data). So ID is code.
      
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, gCode);
      
      // Listener for game updates
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) {
           setPlayerError('Game room not found.');
           return;
        }
        
        const data = docSnap.data();
        // Verify Player Code
        const players = data.players || {};
        const foundPlayer = Object.values(players).find(p => p.code === pCode);
        
        if (foundPlayer) {
           if (!foundPlayer.active && data.round > 1) {
             setPlayerError('You were eliminated in a previous round.');
             // Optional: allow them to view but not play. 
             // For now, let them in but button will be disabled via logic inside PlayerView if needed.
           }
           setPlayerIdentity(foundPlayer);
           setActivePlayerGame(data);
           setMode('player_active');
        } else {
           setPlayerError('Invalid Player Code.');
        }
      });
      
      // Store unsubscribe in a ref if we were doing this properly inside a useEffect, 
      // but for this simple switch, we'll let the PlayerView handle its own listeners 
      // or pass the data down.
      // Actually, passing snapshot data from here is messy. 
      // Let's just validate once here, then let PlayerView attach its own listener.
      
      // Validation Run:
      const snap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION), where('code', '==', gCode)));
      let valid = false;
      snap.forEach(d => {
        if(d.id === gCode) {
           const p = Object.values(d.data().players || {}).find(pl => pl.code === pCode);
           if(p) {
             valid = true;
             setPlayerIdentity({ ...p, id: p.id }); // Ensure ID is passed
           }
        }
      });
      
      if(valid) {
        setMode('player_active');
      } else {
        setPlayerError('Invalid Game Code or Player Code');
      }

    } catch (e) {
      console.error(e);
      setPlayerError('Connection error.');
    }
  };

  // --- Views ---

  if (loading) return <Loading />;

  // 1. Host Mode
  if (mode === 'host') {
    return (
      <ErrorBoundary>
        <HostView user={user} onLogout={() => setMode(null)} />
      </ErrorBoundary>
    );
  }

  // 2. Player Mode (Active)
  if (mode === 'player_active') {
    // Need a wrapper to handle the real-time listener for the player
    return (
      <ErrorBoundary>
        <PlayerGameWrapper 
           gameCode={gameCode} 
           playerCode={playerCode} 
           onExit={() => setMode(null)} 
        />
      </ErrorBoundary>
    );
  }

  // 3. Landing Page
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-600 p-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)]">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">BuzzerBeater</h1>
          <p className="mt-2 text-slate-400">The Ultimate Game Show Companion</p>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
          {/* Tabs */}
          <div className="flex mb-6 bg-slate-900 p-1 rounded-lg">
            <button 
              className={`flex-1 py-2 rounded-md text-sm font-bold transition ${mode === 'join' || !mode ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setMode(null)}
            >
              Join Game
            </button>
            <button 
              className="flex-1 py-2 rounded-md text-sm font-bold text-slate-400 hover:text-white transition"
              onClick={() => setMode('host')}
            >
              Host Game
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Game Room Code</label>
              <input 
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="Ex: X7Y2"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center tracking-widest text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Your Unique Code</label>
              <input 
                value={playerCode}
                onChange={(e) => setPlayerCode(e.target.value.toUpperCase())}
                placeholder="Ex: A1B2"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center tracking-widest text-lg"
              />
            </div>

            {playerError && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-sm p-3 rounded text-center">
                {playerError}
              </div>
            )}

            <button 
              onClick={handlePlayerJoin}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              Enter Game <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper for Player to handle persistent listener
const PlayerGameWrapper = ({ gameCode, playerCode, onExit }) => {
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', GAMES_COLLECTION, gameCode);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const gData = docSnap.data();
        setGame(gData);
        
        const pData = Object.values(gData.players || {}).find(p => p.code === playerCode);
        if (pData) {
          setPlayer(pData);
        } else {
          // Player might have been deleted by host
          onExit();
        }
      } else {
        onExit();
      }
    });
    return () => unsubscribe();
  }, [gameCode, playerCode]);

  if (!game || !player) return <Loading msg="Syncing Game Data..." />;
  
  // If player is eliminated (active = false)
  if (!player.active) {
     return (
       <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-6 text-center">
         <div>
           <Lock className="w-16 h-16 mx-auto mb-4 text-red-500" />
           <h2 className="text-2xl font-bold mb-2">Eliminated</h2>
           <p className="text-slate-400 mb-6">You did not qualify for Round {game.round}.</p>
           <div className="bg-slate-800 p-4 rounded mb-4">
             <div className="text-sm text-slate-500">Final Score</div>
             <div className="text-3xl font-mono">{player.score}</div>
           </div>
           <button onClick={onExit} className="text-blue-400 hover:underline">Return to Home</button>
         </div>
       </div>
     )
  }

  return <PlayerView game={game} player={player} playerId={player.id} gameId={gameCode} />;
};