"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin-service";
import { WheelItem, WheelSettings } from "@/types/admin";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface WheelSettingsDialogProps {
  wheel: WheelItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const themeOptions: WheelSettings["theme"][] = ["base", "neon", "gold", "party"];

function SearchableParticipantSelect({
  value,
  onChange,
  placeholder,
  participants,
  allowEmpty,
  emptyLabel,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  participants: string[];
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? participants.filter((p) => p.toLowerCase().includes(term))
      : participants;
    if (value && !base.includes(value)) return [value, ...base];
    return base;
  }, [participants, search, value]);

  return (
    <div className="space-y-1">
      <Input
        placeholder="Cerca partecipante..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-sm h-8"
      />
      <Select
        value={value ?? ""}
        onValueChange={(v) => {
          onChange(v || null);
          setSearch("");
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || "Seleziona..."} />
        </SelectTrigger>
        <SelectContent className="max-h-48 overflow-y-auto">
          {allowEmpty && (
            <SelectItem value="">{emptyLabel || "-- Nessuno --"}</SelectItem>
          )}
          {filtered.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function WheelSettingsDialog({
  wheel,
  open,
  onOpenChange,
  onSaved,
}: WheelSettingsDialogProps) {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WheelSettings>({
    theme: "party",
    mode: "single",
    sequenceSteps: [],
    forcedWinner: null,
    soundEnabled: true,
  });

  useEffect(() => {
    if (wheel) {
      setSettings({ ...wheel.settings });
    }
  }, [wheel]);

  function setSequenceLength(length: number) {
    if (length < 1) return;
    const current = settings.sequenceSteps;
    let next = [...current];
    if (length > current.length) {
      for (let i = 0; i < length - current.length; i++) {
        next.push({ type: "random" as const, winnerName: null });
      }
    } else {
      next = next.slice(0, length);
    }
    setSettings((prev) => ({ ...prev, sequenceSteps: next }));
  }

  function updateSequenceStep(
    index: number,
    field: "type" | "winnerName",
    value: string | null
  ) {
    const next = [...settings.sequenceSteps];
    next[index] = { ...next[index], [field]: value };
    if (field === "type" && value === "random") {
      next[index].winnerName = null;
    }
    setSettings((prev) => ({ ...prev, sequenceSteps: next }));
  }

  async function handleSave() {
    if (!wheel) return;
    setSaving(true);
    try {
      await adminService.updateWheel(wheel.id, { settings });
      toast.success("Impostazioni salvate.");
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  const participants = wheel?.participants ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impostazioni ruota</DialogTitle>
          <DialogDescription>
            Modifica tema, modalità e vincitori per{" "}
            <span className="font-medium">{wheel?.title}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme */}
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="flex flex-wrap gap-2">
              {themeOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setSettings((prev) => ({ ...prev, theme: t }))}
                  className={`px-3 py-1.5 rounded-full border text-xs font-bold capitalize transition-all ${
                    settings.theme === t
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label>Modalità</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setSettings((prev) => ({ ...prev, mode: "single" }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                  settings.mode === "single"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Singolo spin
              </button>
              <button
                onClick={() => setSettings((prev) => ({ ...prev, mode: "sequence" }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                  settings.mode === "sequence"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Sequenza multi-spin
              </button>
            </div>
          </div>

          {/* Single mode: forced winner */}
          {settings.mode === "single" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-red-400">
                Vincitore forzato (rigging)
              </Label>
              <SearchableParticipantSelect
                value={settings.forcedWinner}
                onChange={(v) =>
                  setSettings((prev) => ({
                    ...prev,
                    forcedWinner: v,
                  }))
                }
                participants={participants}
                allowEmpty
                emptyLabel="-- Casuale (fair play) --"
              />
            </div>
          )}

          {/* Sequence mode: steps */}
          {settings.mode === "sequence" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Numero di spin</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSequenceLength(settings.sequenceSteps.length - 1)}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-mono font-bold">
                    {settings.sequenceSteps.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSequenceLength(settings.sequenceSteps.length + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {settings.sequenceSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <Badge variant="outline" className="shrink-0">
                      #{idx + 1}
                    </Badge>
                    <Select
                      value={step.type}
                      onValueChange={(v) =>
                        updateSequenceStep(idx, "type", v as "random" | "fixed")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">Casuale</SelectItem>
                        <SelectItem value="fixed">Vincitore</SelectItem>
                      </SelectContent>
                    </Select>
                    {step.type === "fixed" ? (
                      <div className="flex-1">
                        <SearchableParticipantSelect
                          value={step.winnerName}
                          onChange={(v) =>
                            updateSequenceStep(idx, "winnerName", v)
                          }
                          participants={participants}
                          placeholder="Seleziona..."
                        />
                      </div>
                    ) : (
                      <span className="flex-1 text-xs text-muted-foreground italic px-2">
                        Risultato casuale
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sound toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-medium">Effetti sonori</span>
            <button
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  soundEnabled: !prev.soundEnabled,
                }))
              }
              className={`w-10 h-5 rounded-full transition-colors relative ${
                settings.soundEnabled ? "bg-green-500" : "bg-slate-600"
              }`}
            >
              <div
                className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${
                  settings.soundEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvataggio..." : "Salva impostazioni"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
