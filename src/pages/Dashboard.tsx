import { useState, useCallback } from "react";
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
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const Dashboard = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("kodbank_username") || "User";

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 1800;
    const colors = ["#F5C842", "#F59E0B", "#FBBF24", "#10B981", "#34D399"];

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
        ticks: 200,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
        ticks: 200,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Center burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors,
      ticks: 300,
      gravity: 0.8,
      scalar: 1.2,
    });
  }, []);

  const checkBalance = async () => {
    setLoading(true);
    setError("");
    setBalance(null);
    setRevealed(false);

    const token = localStorage.getItem("kodbank_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kodbank-balance`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-kodbank-token": token,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("kodbank_token");
          localStorage.removeItem("kodbank_username");
          navigate("/login");
          return;
        }
        setError(data.error || "Failed to fetch balance.");
        return;
      }

      setBalance(data.balance);
      setRevealed(true);
      setTimeout(() => fireConfetti(), 300);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-destructive/10"
          >
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

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5 shadow-card text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5 text-gold" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Security</p>
              <p className="font-semibold text-sm text-foreground">JWT Protected</p>
            </div>
            <div className="glass rounded-2xl p-5 shadow-card text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center mx-auto">
                <TrendingUp className="w-5 h-5 text-emerald" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Account</p>
              <p className="font-semibold text-sm text-foreground">Customer</p>
            </div>
            <div className="glass rounded-2xl p-5 shadow-card text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center mx-auto">
                <Wallet className="w-5 h-5 text-gold" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Currency</p>
              <p className="font-semibold text-sm text-foreground">Indian Rupee ₹</p>
            </div>
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

              {/* Balance display */}
              {revealed && balance !== null ? (
                <div className="animate-count-up space-y-1">
                  <p className="text-5xl sm:text-6xl font-bold text-gold font-mono tracking-tight">
                    {formatINR(balance)}
                  </p>
                  <p className="text-emerald text-sm flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Balance retrieved successfully!
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

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm animate-slide-in">
                {error}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={checkBalance}
              disabled={loading}
              className="w-full sm:w-auto mx-auto flex items-center justify-center gap-3 bg-gold-gradient text-primary-foreground font-semibold rounded-2xl py-4 px-10 hover:opacity-90 active:scale-[0.97] transition-all shadow-gold disabled:opacity-50 disabled:cursor-not-allowed text-base animate-pulse-gold"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Checking...
                </>
              ) : revealed ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Refresh Balance
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Check My Balance
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground">
              🔒 Balance is verified via encrypted JWT token
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/30">
        KodBank © 2024 · Secured with bcrypt & JWT
      </footer>
    </div>
  );
};

export default Dashboard;
