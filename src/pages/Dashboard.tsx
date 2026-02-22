import { useState, useCallback } from "react";
import BankingChatbot from "@/components/BankingChatbot";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Landmark,
  LogOut,
  Wallet,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ArrowDownToLine,
  SendHorizontal,
  History,
  X,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

type ModalType = "deposit" | "transfer" | "history" | null;
type Transaction = {
  id: string;
  from_username: string | null;
  to_username: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("kodbank_username") || "User";
  const getToken = () => localStorage.getItem("kodbank_token");

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Deposit
  const [depositAmount, setDepositAmount] = useState("");

  // Transfer
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  // History
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 1800;
    const colors = ["#F5C842", "#F59E0B", "#FBBF24", "#10B981", "#34D399"];
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors, ticks: 200 });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors, ticks: 200 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors, ticks: 300, gravity: 0.8, scalar: 1.2 });
  }, []);

  const checkBalance = async () => {
    setLoading(true);
    setError("");
    setBalance(null);
    setRevealed(false);
    const token = getToken();
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kodbank-balance`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "x-kodbank-token": token },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { localStorage.removeItem("kodbank_token"); localStorage.removeItem("kodbank_username"); navigate("/login"); return; }
        setError(data.error || "Failed to fetch balance.");
        return;
      }
      setBalance(data.balance);
      setRevealed(true);
      setTimeout(() => fireConfetti(), 300);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const handleDeposit = async () => {
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");
    const token = getToken();
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kodbank-deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kodbank-token": token },
        body: JSON.stringify({ amount: Number(depositAmount) }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error || "Deposit failed."); return; }
      setModalSuccess(data.message);
      setBalance(data.newBalance);
      setRevealed(true);
      setDepositAmount("");
      fireConfetti();
    } catch { setModalError("Network error."); }
    finally { setModalLoading(false); }
  };

  const handleTransfer = async () => {
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");
    const token = getToken();
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kodbank-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kodbank-token": token },
        body: JSON.stringify({ to_username: transferTo, amount: Number(transferAmount) }),
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error || "Transfer failed."); return; }
      setModalSuccess(data.message);
      setBalance(data.newBalance);
      setRevealed(true);
      setTransferTo("");
      setTransferAmount("");
      fireConfetti();
    } catch { setModalError("Network error."); }
    finally { setModalLoading(false); }
  };

  const fetchTransactions = async () => {
    setModalLoading(true);
    setModalError("");
    const token = getToken();
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kodbank-transactions`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "x-kodbank-token": token },
      });
      const data = await res.json();
      if (!res.ok) { setModalError(data.error || "Failed."); return; }
      setTransactions(data.transactions || []);
    } catch { setModalError("Network error."); }
    finally { setModalLoading(false); }
  };

  const openModal = (type: ModalType) => {
    setModal(type);
    setModalError("");
    setModalSuccess("");
    if (type === "history") fetchTransactions();
  };

  const handleLogout = () => {
    localStorage.removeItem("kodbank_token");
    localStorage.removeItem("kodbank_username");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="glass border-b border-border/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold">
            <Landmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-gold tracking-tight">KodBank</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            Welcome, <span className="text-foreground font-medium">{username}</span>
          </span>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-destructive/10">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          {/* Greeting */}
          <div className="text-center animate-slide-in">
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Dashboard</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Hello, <span className="text-gold">{username}</span> 👋
            </h2>
            <p className="text-muted-foreground mt-2">Manage your finances with confidence.</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={() => openModal("deposit")} className="glass rounded-2xl p-5 shadow-card text-center space-y-2 hover:border-gold/40 border border-transparent transition-all group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center mx-auto group-hover:bg-emerald/20 transition-colors">
                <ArrowDownToLine className="w-5 h-5 text-emerald" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Deposit</p>
              <p className="font-semibold text-sm text-foreground">Add Funds</p>
            </button>
            <button onClick={() => openModal("transfer")} className="glass rounded-2xl p-5 shadow-card text-center space-y-2 hover:border-gold/40 border border-transparent transition-all group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center mx-auto group-hover:bg-gold/20 transition-colors">
                <SendHorizontal className="w-5 h-5 text-gold" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Transfer</p>
              <p className="font-semibold text-sm text-foreground">Send Money</p>
            </button>
            <button onClick={() => openModal("history")} className="glass rounded-2xl p-5 shadow-card text-center space-y-2 hover:border-gold/40 border border-transparent transition-all group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <History className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">History</p>
              <p className="font-semibold text-sm text-foreground">Transactions</p>
            </button>
          </div>

          {/* Balance Card */}
          <div className="glass rounded-2xl p-8 shadow-card text-center space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold animate-pulse-gold">
                  <Wallet className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground uppercase tracking-widest">Account Balance</p>

              {revealed && balance !== null ? (
                <div className="animate-count-up space-y-1">
                  <p className="text-5xl sm:text-6xl font-bold text-gold font-mono tracking-tight">{formatINR(balance)}</p>
                  <p className="text-emerald text-sm flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4" /> Balance retrieved successfully!
                  </p>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <p className="text-muted-foreground text-lg">
                    {loading ? "Fetching your balance..." : "Click below to reveal your balance"}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm animate-slide-in">{error}</div>
            )}

            <button onClick={checkBalance} disabled={loading} className="w-full sm:w-auto mx-auto flex items-center justify-center gap-3 bg-gold-gradient text-primary-foreground font-semibold rounded-2xl py-4 px-10 hover:opacity-90 active:scale-[0.97] transition-all shadow-gold disabled:opacity-50 disabled:cursor-not-allowed text-base animate-pulse-gold">
              {loading ? (<><RefreshCw className="w-5 h-5 animate-spin" />Checking...</>) : revealed ? (<><RefreshCw className="w-5 h-5" />Refresh Balance</>) : (<><Wallet className="w-5 h-5" />Check My Balance</>)}
            </button>
            <p className="text-xs text-muted-foreground">🔒 Balance is verified via encrypted JWT token</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/30">
        KodBank © 2024 · Secured with bcrypt & JWT
      </footer>

      {/* Modal Overlay */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-scale" onClick={() => setModal(null)}>
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 shadow-card border border-border/50 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {modal === "deposit" && "💰 Deposit Funds"}
                {modal === "transfer" && "💸 Transfer Money"}
                {modal === "history" && "📜 Transaction History"}
              </h3>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modal === "deposit" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount (₹)</label>
                  <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Enter amount" min="1" max="1000000" className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all" />
                </div>
                {modalError && <p className="text-destructive text-sm">{modalError}</p>}
                {modalSuccess && <p className="text-emerald text-sm">{modalSuccess}</p>}
                <button onClick={handleDeposit} disabled={modalLoading || !depositAmount} className="w-full bg-gold-gradient text-primary-foreground font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-gold disabled:opacity-50">
                  {modalLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                  {modalLoading ? "Processing..." : "Deposit"}
                </button>
              </div>
            )}

            {modal === "transfer" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipient Username</label>
                  <input type="text" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="Enter recipient username" className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount (₹)</label>
                  <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Enter amount" min="1" max="1000000" className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all" />
                </div>
                {modalError && <p className="text-destructive text-sm">{modalError}</p>}
                {modalSuccess && <p className="text-emerald text-sm">{modalSuccess}</p>}
                <button onClick={handleTransfer} disabled={modalLoading || !transferTo || !transferAmount} className="w-full bg-gold-gradient text-primary-foreground font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-gold disabled:opacity-50">
                  {modalLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                  {modalLoading ? "Processing..." : "Transfer"}
                </button>
              </div>
            )}

            {modal === "history" && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {modalLoading && <p className="text-muted-foreground text-sm text-center">Loading...</p>}
                {modalError && <p className="text-destructive text-sm">{modalError}</p>}
                {!modalLoading && transactions.length === 0 && <p className="text-muted-foreground text-sm text-center">No transactions yet.</p>}
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "deposit" ? "bg-emerald/10" : tx.from_username === username ? "bg-destructive/10" : "bg-emerald/10"}`}>
                        {tx.type === "deposit" ? <ArrowDownToLine className="w-4 h-4 text-emerald" /> : <SendHorizontal className={`w-4 h-4 ${tx.from_username === username ? "text-destructive" : "text-emerald"}`} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.type === "deposit" ? "Deposit" : tx.from_username === username ? `To ${tx.to_username}` : `From ${tx.from_username}`}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <p className={`font-semibold text-sm ${tx.type === "deposit" || tx.to_username === username && tx.type === "transfer" ? "text-emerald" : "text-destructive"}`}>
                      {tx.type === "deposit" || (tx.to_username === username && tx.from_username !== username) ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BankingChatbot />
    </div>
  );
};

export default Dashboard;
