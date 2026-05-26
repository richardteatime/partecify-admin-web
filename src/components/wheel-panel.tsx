"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin-service";
import { RegistrationItem, WheelItem, WheelSettings, WheelSpin } from "@/types/admin";

type Tab = "create" | "list";

export default function WheelPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [wheels, setWheels] = useState<WheelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");

  // Form state
  const [selectedRegistration, setSelectedRegistration] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<WheelSettings["theme"]>("party");
  const [mode, setMode] = useState<WheelSettings["mode"]>("single");
  const [spinCount, setSpinCount] = useState(5);
  const [creating, setCreating] = useState(false);

  // Winners modal
  const [viewingWheel, setViewingWheel] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState("");
  const [spins, setSpins] = useState<WheelSpin[]>([]);
  const [loadingSpins, setLoadingSpins] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [regs, wls] = await Promise.all([
        adminService.loadRegistrations(),
        adminService.fetchWheels(),
      ]);
      setRegistrations(regs.filter((r) => r.isTimed && r.userCount > 0));
      setWheels(wls);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Errore caricamento dati.");
    } finally {
      setLoading(false);
    }
  }

  function handleRegistrationChange(docId: string) {
    setSelectedRegistration(docId);
    const reg = registrations.find((r) => r.docId === docId);
    if (reg) {
      setTitle(`Ruota ${reg.title} - ${reg.location}`);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRegistration) {
      setMessage("Seleziona una registrazione.");
      return;
    }
    const reg = registrations.find((r) => r.docId === selectedRegistration);
    if (!reg) return;

    const participants = reg.users
      .map((u) => String(u.name ?? ""))
      .filter(Boolean);

    if (participants.length === 0) {
      setMessage("Nessun partecipante trovato nella registrazione selezionata.");
      return;
    }

    setCreating(true);
    setMessage("");

    const sequenceSteps = Array.from({ length: spinCount }, (_, i) => ({
      id: `step-${i}`,
      type: "random" as const,
      winnerName: null as string | null,
    }));

    const settings: WheelSettings = {
      theme,
      mode,
      forcedWinner: null,
      soundEnabled: true,
      sequenceSteps: mode === "sequence" ? sequenceSteps : [],
    };

    try {
      const id = await adminService.createWheel({
        title: title.trim() || reg.title,
        location: reg.location,
        participants,
        sourceRegistrationId: reg.docId,
        settings,
      });
      setMessage(`Ruota creata! Link: ${origin}/wheel/${id}`);
      setSelectedRegistration("");
      setTitle("");
      setTheme("party");
      setMode("single");
      setSpinCount(5);
      await loadData();
      setActiveTab("list");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Errore creazione ruota.");
    } finally {
      setCreating(false);
    }
  }

  async function viewWinners(wheel: WheelItem) {
    setViewingWheel(wheel.id);
    setViewingTitle(wheel.title);
    setLoadingSpins(true);
    try {
      const data = await adminService.fetchWheelSpins(wheel.id);
      setSpins(data);
    } catch {
      setSpins([]);
    } finally {
      setLoadingSpins(false);
    }
  }

  function copyLink(id: string) {
    const url = `${origin}/wheel/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setMessage("Link copiato negli appunti!");
    });
  }

  const themeOptions = useMemo(() => ["base", "neon", "gold", "party"] as WheelSettings["theme"][], []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Ruota della Fortuna</h2>
        <p className="text-sm text-neutral-500">
          Crea ruote dai partecipanti registrati e gestisci i vincitori.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("create")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "create"
              ? "bg-red-600 text-white"
              : "border border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          Crea
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "list"
              ? "bg-red-600 text-white"
              : "border border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          Lista ruote
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          {message}
        </div>
      )}

      {activeTab === "create" && (
        <form onSubmit={handleCreate} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Nuova ruota da registrazione</h3>

          <div>
            <label className="mb-2 block text-sm font-medium">Registrazione *</label>
            <select
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
              value={selectedRegistration}
              onChange={(e) => handleRegistrationChange(e.target.value)}
            >
              <option value="">Seleziona una timed news con partecipanti</option>
              {registrations.map((reg) => (
                <option key={reg.docId} value={reg.docId}>
                  {reg.title} ({reg.location}) — {reg.userCount} partecipanti
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Titolo ruota</label>
            <input
              className="w-full rounded-xl border border-neutral-300 px-4 py-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Ruota Serata Live"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Tema</label>
              <select
                className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                value={theme}
                onChange={(e) => setTheme(e.target.value as WheelSettings["theme"])}
              >
                {themeOptions.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Modalita</label>
              <select
                className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                value={mode}
                onChange={(e) => setMode(e.target.value as WheelSettings["mode"])}
              >
                <option value="single">Singolo spin</option>
                <option value="sequence">Sequenza multi-spin</option>
              </select>
            </div>
          </div>

          {mode === "sequence" && (
            <div>
              <label className="mb-2 block text-sm font-medium">Numero di spin</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSpinCount((c) => Math.max(1, c - 1))}
                  className="h-10 w-10 rounded-lg border border-neutral-300 hover:bg-neutral-100"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono font-bold">{spinCount}</span>
                <button
                  type="button"
                  onClick={() => setSpinCount((c) => c + 1)}
                  className="h-10 w-10 rounded-lg border border-neutral-300 hover:bg-neutral-100"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {creating ? "Creazione in corso..." : "Crea ruota"}
          </button>
        </form>
      )}

      {activeTab === "list" && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Ruote create</h3>
            <button
              onClick={loadData}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Aggiorna
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-neutral-500">Caricamento...</p>
          ) : wheels.length === 0 ? (
            <p className="text-sm text-neutral-500">Nessuna ruota creata.</p>
          ) : (
            <div className="space-y-3">
              {wheels.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{w.title}</h4>
                    <p className="text-sm text-neutral-500">
                      {w.location} · {w.participants.length} partecipanti · {w.settings.theme}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyLink(w.id)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      Copia link
                    </button>
                    <a
                      href={`${origin}/wheel/${w.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Apri ruota
                    </a>
                    <button
                      onClick={() => viewWinners(w)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      Vedi vincitori
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Winners modal */}
      {viewingWheel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Vincitori — {viewingTitle}</h3>
              <button
                onClick={() => setViewingWheel(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                Chiudi
              </button>
            </div>

            {loadingSpins ? (
              <p className="text-sm text-neutral-500">Caricamento...</p>
            ) : spins.length === 0 ? (
              <p className="text-sm text-neutral-500">Nessuno spin effettuato.</p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {spins.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
                  >
                    <span className="font-medium">
                      #{s.spinIndex + 1} — {s.winnerName}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {s.timestamp.toLocaleString("it-IT")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
