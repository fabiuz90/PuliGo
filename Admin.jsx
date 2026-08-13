const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, ShieldCheck, User as UserIcon, Loader2, Mail } from "lucide-react";
import { PageHeader, Modal, inputClass, Loading } from "@/components/common";
import MobileSelect from "@/components/MobileSelect";
import ExportButton from "@/components/ExportButton";
import { fileDateSuffix } from "@/lib/reportCalc";

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await db.entities.User.list();
      setUsers(list);
    } catch (e) {
      setError(e.message || "Errore caricamento utenti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setError("");
    try {
      await db.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      await load();
    } catch (e) {
      setError(e.message || "Errore invito utente");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (u, role) => {
    if (u.id === currentUser.id && role !== "admin") {
      alert("Non puoi rimuovere il tuo ruolo admin.");
      return;
    }
    try {
      await db.entities.User.update(u.id, { role });
      await load();
    } catch (e) {
      setError(e.message || "Errore aggiornamento ruolo");
    }
  };

  const remove = async (u) => {
    if (u.id === currentUser.id) {
      alert("Non puoi eliminare il tuo account.");
      return;
    }
    if (window.confirm(`Rimuovere l'utente "${u.email}"?`)) {
      try {
        await db.entities.User.delete(u.id);
        await load();
      } catch (e) {
        setError(e.message || "Errore rimozione utente");
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1100px] mx-auto">
      <PageHeader
        eyebrow="Amministrazione"
        title="Utenti autorizzati"
        description="Gestisci gli utenti che possono accedere a PuliGo."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton sheets={[{ name: 'Utenti', rows: [['Nome', 'Email', 'Ruolo'], ...users.map((u) => [u.full_name || '', u.email, u.role || ''])] }]} filename={`PuliGo_Utenti_${fileDateSuffix()}.xlsx`} />
            <button
              onClick={() => setInviteOpen(true)}
              className="flex gap-2 bg-[#163f3d] text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
            >
              <Plus size={18} />Invita utente
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Utente</th>
                <th>Email</th>
                <th>Ruolo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-slate-500">
                        {u.role === "admin" ? <ShieldCheck size={17} /> : <UserIcon size={17} />}
                      </span>
                      <span className="font-medium">{u.full_name || "—"}</span>
                      {u.id === currentUser.id && <span className="text-xs text-slate-400">(tu)</span>}
                    </div>
                  </td>
                  <td className="text-slate-600">{u.email}</td>
                  <td>
                    <MobileSelect
                      value={u.role || "user"}
                      onChange={(v) => changeRole(u, v)}
                      options={[
                        { value: "visitatore", label: "Visitatore" },
                        { value: "user", label: "Utente" },
                        { value: "admin", label: "Admin" },
                      ]}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                    />
                  </td>
                  <td>
                    <div className="flex justify-end pr-4">
                      <button
                        onClick={() => remove(u)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        title="Rimuovi utente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Nessun utente registrato.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {inviteOpen && (
        <Modal title="Invita utente autorizzato" onClose={() => setInviteOpen(false)}>
          <form onSubmit={invite} className="p-6 space-y-5">
            <p className="text-sm text-slate-500">
              L'utente riceverà un'email di invito e completerà la registrazione impostando la propria password.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="nome@cleanplan.it"
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ruolo</label>
              <MobileSelect
                value={inviteRole}
                onChange={(v) => setInviteRole(v)}
                options={[
                  { value: "visitatore", label: "Visitatore — accesso in attesa di approvazione" },
                  { value: "user", label: "Utente — accesso ai moduli operativi" },
                  { value: "admin", label: "Admin — accesso completo + pannello amministrazione" },
                ]}
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-slate-50">Annulla</button>
              <button type="submit" disabled={inviting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#163f3d] text-white text-sm font-semibold disabled:opacity-60">
                {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Invita
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}