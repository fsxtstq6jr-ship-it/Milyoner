import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Wallet, Landmark, ShoppingBag, User, 
  Play, LogOut, TrendingUp, Award, Zap, 
  ChevronRight, Home, Car, Building2, Briefcase,
  BarChart3, Settings, ShieldCheck, HelpCircle
} from 'lucide-react';
import { cn, formatCurrency, PRIZE_LADDER, SAFE_ZONES } from './utils';

// --- Types ---
interface UserProfile {
  id: number;
  username: string;
  email: string;
  wallet_balance: number;
  bank_balance: number;
  xp: number;
  level: number;
  inventory: any[];
  history: any[];
  totalPassive: number;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  correct_answer: string;
  difficulty: number;
  category: string;
}

// --- Components ---

const Auth = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { username, email, password };
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.token) {
      onLogin(data.token);
    } else {
      alert(data.error || 'Bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#151619] border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tighter">milyoner<span className="text-emerald-500">.tr</span></h1>
          <p className="text-zinc-500 text-sm">Bilginle kazan, yatırımla büyü.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">Kullanıcı Adı</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="milyoner_adayi"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">E-posta</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="ornek@mail.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">Şifre</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 mt-4">
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Zaten üye misin? Giriş yap'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Quiz = ({ token, onComplete }: { token: string, onComplete: () => void }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lifelines, setLifelines] = useState({ fifty: true, audience: true, change: true });
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [audienceAdvice, setAudienceAdvice] = useState<any>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    fetch('/api/quiz/questions', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(setQuestions);
  }, [token]);

  const useLifeline = async (type: 'fifty' | 'audience' | 'change') => {
    if (!lifelines[type]) return;
    
    if (type === 'fifty') {
      const current = questions[currentIdx];
      const wrongOptions = current.options.filter(o => o !== current.correct_answer);
      const toHide = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
      setHiddenOptions(toHide);
    } else if (type === 'audience') {
      const res = await fetch('/api/ai/generate-question', { // Reusing AI endpoint for logic
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          prompt: `Seyirci jokeri olarak şu soruya yüzdeler ver: "${questions[currentIdx].text}". Şıklar: ${questions[currentIdx].options.join(',')}. Doğru cevap: ${questions[currentIdx].correct_answer}. Gerçekçi olsun ama doğru cevaba daha yüksek ihtimal ver.`
        })
      });
      // Mocking audience for now if AI fails
      const mockAdvice = { [questions[currentIdx].correct_answer]: 65 };
      questions[currentIdx].options.forEach(o => { if(!mockAdvice[o]) mockAdvice[o] = Math.floor(Math.random() * 15); });
      setAudienceAdvice(mockAdvice);
    } else if (type === 'change') {
      const res = await fetch('/api/ai/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ difficulty: currentIdx + 1 })
      });
      const newQ = await res.json();
      const newQuestions = [...questions];
      newQuestions[currentIdx] = newQ;
      setQuestions(newQuestions);
      setHiddenOptions([]);
      setAudienceAdvice(null);
    }

    setLifelines({ ...lifelines, [type]: false });
  };

  useEffect(() => {
    if (timeLeft > 0 && !gameOver && !selectedOption) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !selectedOption) {
      handleGameOver();
    }
  }, [timeLeft, gameOver, selectedOption]);

  const handleGameOver = async () => {
    setGameOver(true);
    const earnings = currentIdx > 0 ? (SAFE_ZONES.includes(currentIdx) ? PRIZE_LADDER[currentIdx - 1] : 0) : 0;
    await fetch('/api/quiz/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ score: currentIdx, earnings, xpGained: currentIdx * 100 }),
    });
  };

  const handleOptionSelect = async (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    const correct = option === questions[currentIdx].correct_answer;
    setIsCorrect(correct);

    setTimeout(async () => {
      if (correct) {
        if (currentIdx === 14) {
          setWon(true);
          setGameOver(true);
          await fetch('/api/quiz/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ score: 15, earnings: PRIZE_LADDER[14], xpGained: 5000 }),
          });
        } else {
          setCurrentIdx(currentIdx + 1);
          setSelectedOption(null);
          setIsCorrect(null);
          setTimeLeft(30);
          setHiddenOptions([]);
          setAudienceAdvice(null);
        }
      } else {
        handleGameOver();
      }
    }, 2000);
  };

  const handleWithdraw = async () => {
    if (currentIdx === 0) return onComplete();
    setGameOver(true);
    const earnings = PRIZE_LADDER[currentIdx - 1];
    await fetch('/api/quiz/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ score: currentIdx, earnings, xpGained: currentIdx * 50 }),
    });
  };

  if (questions.length === 0) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Yükleniyor...</div>;

  if (gameOver) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Trophy className={cn("w-24 h-24 mb-6 mx-auto", won ? "text-yellow-500" : "text-zinc-600")} />
          <h2 className="text-4xl font-bold text-white mb-2">{won ? 'TEBRİKLER!' : 'OYUN BİTTİ'}</h2>
          <p className="text-zinc-400 mb-8">Kazanılan Ödül: <span className="text-emerald-500 font-bold">{formatCurrency(won ? PRIZE_LADDER[14] : (currentIdx > 0 ? PRIZE_LADDER[currentIdx - 1] : 0))}</span></p>
          <button 
            onClick={onComplete}
            className="bg-white text-black font-bold px-12 py-4 rounded-full hover:bg-zinc-200 transition-colors"
          >
            Ana Menüye Dön
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-between items-center border-bottom border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <span className="text-emerald-500 font-bold">{timeLeft}</span>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Soru {currentIdx + 1}/15</p>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(PRIZE_LADDER[currentIdx])}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleWithdraw}
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-all mr-4"
          >
            Çekil
          </button>
          <button 
            disabled={!lifelines.fifty}
            onClick={() => useLifeline('fifty')}
            className={cn("p-3 rounded-xl border transition-all", lifelines.fifty ? "border-white/10 hover:bg-white/5" : "opacity-30")}
          >50:50</button>
          <button 
            disabled={!lifelines.audience}
            onClick={() => useLifeline('audience')}
            className={cn("p-3 rounded-xl border transition-all", lifelines.audience ? "border-white/10 hover:bg-white/5" : "opacity-30")}
          ><User size={20}/></button>
          <button 
            disabled={!lifelines.change}
            onClick={() => useLifeline('change')}
            className={cn("p-3 rounded-xl border transition-all", lifelines.change ? "border-white/10 hover:bg-white/5" : "opacity-30")}
          ><Zap size={20}/></button>
        </div>
      </div>

      {audienceAdvice && (
        <div className="px-6 py-2 bg-emerald-500/10 border-y border-emerald-500/20 flex gap-4 overflow-x-auto">
          {Object.entries(audienceAdvice).map(([opt, val]: any) => (
            <div key={opt} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-[10px] font-bold text-emerald-500">{opt}:</span>
              <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${val}%` }} />
              </div>
              <span className="text-[10px] font-bold text-zinc-400">%{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <motion.div 
          key={currentIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
            {currentQuestion.category}
          </span>
          <h3 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            {currentQuestion.text}
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {currentQuestion.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleOptionSelect(option)}
              disabled={!!selectedOption || hiddenOptions.includes(option)}
              className={cn(
                "p-6 rounded-2xl border text-left transition-all duration-300 flex items-center gap-4 group",
                hiddenOptions.includes(option) ? "opacity-0 pointer-events-none" : "",
                selectedOption === option 
                  ? (isCorrect ? "bg-emerald-500 border-emerald-400 text-white" : "bg-red-500 border-red-400 text-white")
                  : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10"
              )}
            >
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold group-hover:bg-white/20">
                {['A', 'B', 'C', 'D'][i]}
              </span>
              <span className="font-medium text-lg">{option}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prize Ladder (Desktop Sidebar) */}
      <div className="hidden lg:block fixed right-0 top-0 h-full w-64 bg-[#151619] border-l border-white/5 p-6 overflow-y-auto">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Ödül Tablosu</h4>
        <div className="space-y-1">
          {[...PRIZE_LADDER].reverse().map((prize, i) => {
            const idx = 14 - i;
            const isCurrent = idx === currentIdx;
            const isSafe = SAFE_ZONES.includes(idx + 1);
            return (
              <div 
                key={idx}
                className={cn(
                  "flex justify-between items-center p-2 rounded-lg text-sm font-bold transition-all",
                  isCurrent ? "bg-emerald-500 text-white scale-105 shadow-lg shadow-emerald-500/20" : 
                  isSafe ? "text-emerald-400" : "text-zinc-500"
                )}
              >
                <span>{idx + 1}</span>
                <span>{formatCurrency(prize)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ profile, onStartQuiz, onLogout, setView, onRefresh }: { profile: UserProfile, onStartQuiz: () => void, onLogout: () => void, setView: (v: string) => void, onRefresh: () => void }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Sidebar / Nav */}
      <div className="fixed left-0 top-0 h-full w-20 md:w-64 bg-[#151619] border-r border-white/5 flex flex-col p-4">
        <div className="mb-12 px-4 hidden md:block">
          <h1 className="text-2xl font-bold tracking-tighter">milyoner<span className="text-emerald-500">.tr</span></h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Panel' },
            { id: 'shop', icon: ShoppingBag, label: 'Mağaza' },
            { id: 'bank', icon: Landmark, label: 'Banka' },
            { id: 'leaderboard', icon: Trophy, label: 'Sıralama' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setView(item.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all group"
            >
              <item.icon size={24} className="group-hover:text-emerald-500 transition-colors" />
              <span className="hidden md:block font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all"
        >
          <LogOut size={24} />
          <span className="hidden md:block font-semibold">Çıkış Yap</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-20 md:ml-64 p-6 md:p-12 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Hoş geldin, {profile.username}</h2>
            <p className="text-zinc-500">Bugün milyoner olmaya hazır mısın?</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-[#151619] border border-white/5 rounded-2xl p-4 flex items-center gap-4 min-w-[160px]">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cüzdan</p>
                <p className="text-lg font-bold">{formatCurrency(profile.wallet_balance)}</p>
              </div>
            </div>
            <div className="bg-[#151619] border border-white/5 rounded-2xl p-4 flex items-center gap-4 min-w-[160px]">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Landmark size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Banka</p>
                <p className="text-lg font-bold">{formatCurrency(profile.bank_balance)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl shadow-emerald-900/20">
            <div className="relative z-10">
              <p className="text-emerald-200 text-sm font-bold uppercase tracking-widest mb-2">Hızlı Başlat</p>
              <h3 className="text-3xl font-bold mb-6">Yeni Yarışma</h3>
              <button 
                onClick={onStartQuiz}
                className="bg-white text-emerald-900 font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Play size={20} fill="currentColor" /> Hemen Oyna
              </button>
            </div>
            <Trophy className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </div>

          <div className="bg-[#151619] border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Profil Seviyesi</h3>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">LVL {profile.level}</span>
            </div>
            <div className="space-y-4">
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(profile.xp % 1000) / 10}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <p className="text-zinc-500 text-sm font-medium">Sonraki seviyeye {1000 - (profile.xp % 1000)} XP kaldı</p>
            </div>
          </div>

          <div className="bg-[#151619] border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Pasif Gelir</h3>
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
            <div className="space-y-4">
              <p className="text-3xl font-bold">{formatCurrency(profile.totalPassive)} <span className="text-xs text-zinc-500 font-normal">/gün</span></p>
              <button 
                onClick={async () => {
                  await fetch('/api/user/collect-income', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  });
                  onRefresh();
                }}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all"
              >
                Tahsil Et
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-[#151619] border border-white/5 rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-8">Son Yarışmalar</h3>
          <div className="space-y-4">
            {profile.history.map((game, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="font-bold">{game.score}. Soruya Ulaştın</p>
                    <p className="text-xs text-zinc-500">{new Date(game.played_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
                <p className="text-emerald-500 font-bold">+{formatCurrency(game.earnings)}</p>
              </div>
            ))}
            {profile.history.length === 0 && <p className="text-center text-zinc-500 py-8">Henüz oyun oynamadın.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const Shop = ({ token, profile, onPurchase }: { token: string, profile: UserProfile, onPurchase: () => void }) => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/shop/items').then(res => res.json()).then(setItems);
  }, []);

  const handleBuy = async (item: any) => {
    if (profile.wallet_balance < item.price) return alert('Yetersiz bakiye!');
    const res = await fetch('/api/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ...item, itemId: item.id }),
    });
    if (res.ok) {
      onPurchase();
      alert('Satın alma başarılı!');
    }
  };

  return (
    <div className="p-8 md:p-12">
      <h2 className="text-4xl font-bold mb-8">Mağaza</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-[#151619] border border-white/5 rounded-3xl p-6 flex flex-col">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
              {item.type === 'Ev' ? <Home size={32}/> : item.type === 'Araba' ? <Car size={32}/> : <Briefcase size={32}/>}
            </div>
            <h3 className="text-xl font-bold mb-1">{item.name}</h3>
            <p className="text-zinc-500 text-sm mb-4">{item.type}</p>
            {item.passive_income > 0 && (
              <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold mb-6">
                <TrendingUp size={14} /> Günlük Gelir: {formatCurrency(item.passive_income)}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
              <p className="text-lg font-bold">{formatCurrency(item.price)}</p>
              <button 
                onClick={() => handleBuy(item)}
                className="bg-white text-black font-bold px-6 py-2 rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Satın Al
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState('dashboard');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchProfile = async () => {
    if (!token) return;
    const res = await fetch('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setProfile(await res.json());
    } else {
      handleLogout();
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setProfile(null);
  };

  if (!token) return <Auth onLogin={handleLogin} />;
  if (!profile) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Yükleniyor...</div>;

  if (view === 'quiz') {
    return <Quiz token={token} onComplete={() => { setView('dashboard'); fetchProfile(); }} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Shared Nav for sub-views */}
      <div className="fixed left-0 top-0 h-full w-20 md:w-64 bg-[#151619] border-r border-white/5 flex flex-col p-4 z-50">
        <div className="mb-12 px-4 hidden md:block">
          <h1 className="text-2xl font-bold tracking-tighter">milyoner<span className="text-emerald-500">.tr</span></h1>
        </div>
        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Panel' },
            { id: 'shop', icon: ShoppingBag, label: 'Mağaza' },
            { id: 'bank', icon: Landmark, label: 'Banka' },
            { id: 'leaderboard', icon: Trophy, label: 'Sıralama' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                view === item.id ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={24} />
              <span className="hidden md:block font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all">
          <LogOut size={24} />
          <span className="hidden md:block font-semibold">Çıkış Yap</span>
        </button>
      </div>

      <div className="ml-20 md:ml-64">
        {view === 'dashboard' && <Dashboard profile={profile} onStartQuiz={() => setView('quiz')} onLogout={handleLogout} setView={setView} onRefresh={fetchProfile} />}
        {view === 'shop' && <Shop token={token} profile={profile} onPurchase={fetchProfile} />}
        {view === 'bank' && (
          <div className="p-8 md:p-12 max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">Banka</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-[#151619] border border-white/5 rounded-3xl p-8">
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Cüzdan Bakiyesi</p>
                <p className="text-4xl font-bold text-white mb-8">{formatCurrency(profile.wallet_balance)}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={async () => {
                      const amount = Number(prompt('Yatırılacak miktar:'));
                      if (!amount) return;
                      await fetch('/api/bank/deposit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ amount }),
                      });
                      fetchProfile();
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Yatır
                  </button>
                </div>
              </div>
              <div className="bg-[#151619] border border-white/5 rounded-3xl p-8">
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Banka Bakiyesi</p>
                <p className="text-4xl font-bold text-emerald-500 mb-8">{formatCurrency(profile.bank_balance)}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={async () => {
                      const amount = Number(prompt('Çekilecek miktar:'));
                      if (!amount) return;
                      await fetch('/api/bank/withdraw', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ amount }),
                      });
                      fetchProfile();
                    }}
                    className="flex-1 bg-white text-black font-bold py-3 rounded-xl transition-all"
                  >
                    Çek
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-[#151619] border border-white/5 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-4">Hesap Türleri</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="font-bold">Vadeli Hesap</p>
                    <p className="text-xs text-zinc-500">Düşük risk, %5 yıllık faiz</p>
                  </div>
                  <span className="text-emerald-500 font-bold">Aktif</span>
                </div>
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex justify-between items-center opacity-50">
                  <div>
                    <p className="font-bold">Riskli Fon</p>
                    <p className="text-xs text-zinc-500">Yüksek getiri ihtimali (Level 10+)</p>
                  </div>
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>
          </div>
        )}
        {view === 'leaderboard' && (
          <div className="p-8 md:p-12 max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">Sıralama</h2>
            <div className="bg-[#151619] border border-white/5 rounded-3xl overflow-hidden">
              <div className="grid grid-cols-4 p-4 bg-white/5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <span className="col-span-1">Sıra</span>
                <span className="col-span-1">Oyuncu</span>
                <span className="col-span-1">Seviye</span>
                <span className="col-span-1 text-right">Toplam Varlık</span>
              </div>
              <div className="divide-y divide-white/5">
                {/* Mock leaderboard data for now */}
                {[
                  { username: profile.username, total_wealth: profile.wallet_balance + profile.bank_balance, level: profile.level },
                  { username: 'Bilgin_01', total_wealth: 5000000, level: 25 },
                  { username: 'Yatirimci_Ali', total_wealth: 2500000, level: 18 },
                  { username: 'Zeki_Muren', total_wealth: 1200000, level: 15 },
                ].sort((a, b) => b.total_wealth - a.total_wealth).map((user, i) => (
                  <div key={i} className="grid grid-cols-4 p-6 items-center">
                    <span className="col-span-1 font-bold text-zinc-500">#{i + 1}</span>
                    <span className="col-span-1 font-bold">{user.username}</span>
                    <span className="col-span-1 text-zinc-400">LVL {user.level}</span>
                    <span className="col-span-1 text-right text-emerald-500 font-bold">{formatCurrency(user.total_wealth)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
