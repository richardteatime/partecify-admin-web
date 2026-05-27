"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin-service";
import { UserModel } from "@/types/user";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Card>
        <CardHeader>
          <CardTitle>Utenti</CardTitle>
          <CardDescription>
            Visualizza e modifica gli utenti registrati.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Select value={sedeFilter} onValueChange={(v) => setSedeFilter(v ?? "")}>
              <SelectTrigger className="md:w-64">
                <SelectValue placeholder="Tutte le sedi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutte le sedi</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="text"
              className="flex-1"
              placeholder="Cerca per nome o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Button variant="outline" onClick={load}>
              Aggiorna
            </Button>
          </div>

          {message && (
            <div className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {message}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun utente trovato.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Punti</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Nascita</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">
                        {user.fullName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>{user.sede}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{user.gamePoints}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="default">Sì</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.birthDate}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openEdit(user)}>
                          Modifica
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica utente</DialogTitle>
            <DialogDescription>
              Modifica i dati dell&apos;utente selezionato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input
                value={form.fullName ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                value={editingUser?.email ?? ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefono</Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Data di nascita</Label>
                <Input
                  value={form.birthDate ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, birthDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Indirizzo</Label>
              <Input
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sede</Label>
                <Select
                  value={form.sede ?? ""}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, sede: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Punti</Label>
                <Input
                  type="number"
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

            <label className="flex items-center gap-3 rounded-lg border px-4 py-3">
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

          <DialogFooter className="gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Salvataggio..." : "Salva modifiche"}
            </Button>
            <Button variant="outline" onClick={closeEdit}>
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
