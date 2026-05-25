"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin-service";
import { UserModel } from "@/types/user";

export default function UsersPanel() {
  const [users, setUsers] = useState<UserModel[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sedeFilter, setSedeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserModel | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<UserModel>>({});

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [u, locs] = await Promise.all([
        adminService.fetchUsers(sedeFilter || undefined),
        adminService.fetchLocations(),
      ]);
      setUsers(u);
      setLocations(locs);
    } catch {
      setMessage("Errore durante il caricamento degli utenti.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sedeFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    );
  }, [users, search]);

  function openEdit(user: UserModel) {
    setEditingUser(user);
    setForm({ ...user });
  }

  function closeEdit() {
    setEditingUser(null);
    setForm({});
  }

  async function handleSave() {
    if (!editingUser) return;
    setSaving(true);
    setMessage("");
    try {
      await adminService.updateUser(editingUser.uid, form);
      setMessage("Utente aggiornato con successo.");
      closeEdit();
      await load();
    } catch {
      setMessage("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Utenti</h2>
        <p className="text-sm text-neutral-500">
          Visualizza e modifica gli utenti registrati.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <select
          className="rounded-xl border border-neutral-300 px-4 py-3 md:w-64"
          value={sedeFilter}
          onChange={(e) => setSedeFilter(e.target.value)}
        >
          <option value="">Tutte le sedi</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="flex-1 rounded-xl border border-neutral-300 px-4 py-3"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          onClick={load}
          className="rounded-xl border border-neutral-300 px-4 py-3 hover:bg-neutral-50"
        >
          Aggiorna
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Caricamento in corso...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">Nessun utente trovato.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Sede</th>
                <th className="px-4 py-3 font-medium">Telefono</th>
                <th className="px-4 py-3 font-medium">Punti</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Nascita</th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((user) => (
                <tr key={user.uid} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                  <td className="px-4 py-3">{user.sede}</td>
                  <td className="px-4 py-3">{user.phone}</td>
                  <td className="px-4 py-3">{user.gamePoints}</td>
                  <td className="px-4 py-3">
                    {user.isAdmin ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        Sì
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{user.birthDate}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(user)}
                      className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                    >
                      Modifica
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-bold">Modifica utente</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Nome completo</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={form.fullName ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3 text-neutral-500"
                  value={editingUser.email}
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Telefono</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Data di nascita</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    value={form.birthDate ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, birthDate: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Indirizzo</label>
                <input
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  value={form.address ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Sede</label>
                  <select
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    value={form.sede ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sede: e.target.value }))
                    }
                  >
                    <option value="">Seleziona</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Punti</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    value={form.gamePoints ?? 0}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        gamePoints: Number.parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isAdmin ?? false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isAdmin: e.target.checked }))
                  }
                />
                <span className="text-sm font-medium">Amministratore</span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>
              <button
                onClick={closeEdit}
                className="rounded-xl border border-neutral-300 px-4 py-3 hover:bg-neutral-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
