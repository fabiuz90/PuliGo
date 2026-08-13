const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from "react";

import { Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { Image } from "@/components/ui/image";
import { safeReturnTo } from "@/lib/authReturnTo";
import GoogleIcon from "@/components/GoogleIcon";

const LOGO_URL = "https://media.db.com/images/public/6a7a4c2b1ee07a9df8e05052/c3ae44728_1fab1a1f-26ea-40c2-8536-ceafc55ebb98.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await db.auth.loginWithProvider("google", returnTo);
    } catch (err) {
      setGoogleLoading(false);
      setError("Accesso Google non riuscito. Riprova.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await db.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      const unauthorized =
        err.status === 403 ||
        msg.includes("not registered") ||
        msg.includes("not authorized") ||
        msg.includes("not invited") ||
        msg.includes("private") ||
        msg.includes("register");
      setError(
        unauthorized
          ? "Accesso non autorizzato. Contatta l'amministratore."
          : "Credenziali non valide. Controlla email e password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#102a2b]">
      {/* Pannello brand sinistro */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 text-white">
        <div className="flex items-center gap-3">
          <Image src={LOGO_URL} alt="PuliGo" className="w-12 h-12 rounded-xl" fittingType="fill" />
          <span className="text-2xl font-bold tracking-tight">PuliGo</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Gestione operativa<br />della tua impresa di pulizie
          </h1>
          <p className="text-white/60 mt-4 max-w-sm">
            Pianifica turni, assegna personale agli appalti e monitora la copertura dei servizi in tempo reale.
          </p>
        </div>
        <p className="text-xs text-white/40">Accesso riservato agli utenti autorizzati.</p>
      </div>

      {/* Pannello form destro */}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Image src={LOGO_URL} alt="PuliGo" className="w-12 h-12 rounded-xl" fittingType="fill" />
            <span className="text-2xl font-bold text-[#102a2b]">PuliGo</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Accedi al tuo account</h2>
          <p className="text-slate-500 mt-1 mb-8">Inserisci le tue credenziali per continuare.</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed mb-3"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
            {googleLoading ? "Accesso in corso…" : "Accedi con Google"}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">oppure</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@cleanplan.it"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#163f3d] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#102a2b] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Accesso in corso…
                </>
              ) : (
                "Accedi"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            Non hai un account? Contatta l'amministratore per ottenere l'accesso.
          </p>
          <div className="mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 space-y-1">
            <p>V 0.2 · Agosto 2026</p>
            <p>Licenza valida per: DiEmme 2011 srl</p>
          </div>
        </div>
      </div>
    </div>
  );
}