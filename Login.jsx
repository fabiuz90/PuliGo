import { useState } from "react";
import { Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { Image } from "@/image";
import { supabase } from "@/supabase";

const LOGO_URL = "https://media.db.com/images/public/6a7a4c2b1ee07a9df8e05052/c3ae44728_1fab1a1f-26ea-40c2-8536-ceafc55ebb98.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        throw signInError;
      }

      window.location.href = "/";
    } catch (err) {
      console.error("Login failed:", err);

      setError(
        "Credenziali non valide. Controlla email e password."
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
          <Image
            src={LOGO_URL}
            alt="PuliGo"
            className="w-12 h-12 rounded-xl"
            fittingType="fill"
          />
          <span className="text-2xl font-bold tracking-tight">
            PuliGo
          </span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Gestione operativa
            <br />
            della tua impresa di pulizie
          </h1>

          <p className="text-white/60 mt-4 max-w-sm">
            Pianifica turni, assegna personale agli appalti e monitora
            la copertura dei servizi in tempo reale.
          </p>
        </div>

        <p className="text-xs text-white/40">
          Accesso riservato agli utenti autorizzati.
        </p>
      </div>

      {/* Pannello form destro */}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Image
              src={LOGO_URL}
              alt="PuliGo"
              className="w-12 h-12 rounded-xl"
              fittingType="fill"
            />

            <span className="text-2xl font-bold text-[#102a2b]">
              PuliGo
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Accedi al tuo account
          </h2>

          <p className="text-slate-500 mt-1 mb-8">
            Inserisci le tue credenziali per continuare.
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <ShieldAlert
                size={18}
                className="shrink-0 mt-0.5"
              />

              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@azienda.it"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>

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
            Non hai un account? Contatta l'amministratore per ottenere
            l'accesso.
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