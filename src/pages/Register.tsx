import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Phone, Lock, Hash, ArrowRight, Landmark } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    uid: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    role: "Customer",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, string> = {
        username: form.username,
        password: form.password,
        email: form.email,
        phone: form.phone,
        role: form.role,
      };
      if (form.uid.trim()) body.uid = form.uid.trim();

      const res = await fetch(`${SUPABASE_URL}/functions/v1/kodbank-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-scale">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-gradient shadow-gold mb-4 animate-float">
            <Landmark className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gold tracking-tight">KodBank</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create your account</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* UID (optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> UID (optional)
              </label>
              <input
                name="uid"
                value={form.uid}
                onChange={handleChange}
                placeholder="Leave blank to auto-generate"
                className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Username *
              </label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="johndoe"
                className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email *
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Password *
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Min 8 characters"
                  className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone *
              </label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="+91 9876543210"
                className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all appearance-none cursor-pointer"
              >
                <option value="Customer">Customer</option>
              </select>
            </div>

            {/* Error/Success */}
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-destructive text-sm animate-slide-in">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-emerald/10 border border-emerald/30 px-4 py-3 text-emerald text-sm animate-slide-in">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-gradient text-primary-foreground font-semibold rounded-xl py-3.5 px-6 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-gold disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-gold hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
