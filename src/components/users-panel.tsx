"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { toast } from "sonner";

const userSchema = z.object({
  fullName: z.string().min(1, "Il nome completo è obbligatorio."),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  sede: z.string().min(1, "Seleziona una sede."),
  gamePoints: z.number().int().min(0, "I punti devono essere un numero intero positivo."),
  isAdmin: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function UsersPanel() {
  const [users, setUsers] = useState<UserModel[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sedeFilter, setSedeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserModel | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      birthDate: "",
      address: "",
      sede: "",
      gamePoints: 0,
      isAdmin: false,
    },
  });

  async function load() {
    setLoading(true);
    try {
      const [u, locs] = await Promise.all([
        adminService.fetchUsers(sedeFilter || undefined),
        adminService.fetchLocations(),
      ]);
      setUsers(u);
      setLocations(locs);
    } catch {
      toast.error("Errore durante il caricamento degli utenti.");
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
    reset({
      fullName: user.fullName,
      phone: user.phone || "",
      birthDate: user.birthDate || "",
      address: user.address || "",
      sede: user.sede || "",
      gamePoints: user.gamePoints ?? 0,
      isAdmin: user.isAdmin ?? false,
    });
  }

  function closeEdit() {
    setEditingUser(null);
    reset();
  }

  async function onSubmit(data: UserFormData) {
    if (!editingUser) return;
    setSaving(true);
    try {
      await adminService.updateUser(editingUser.uid, {
        fullName: data.fullName,
        phone: data.phone,
        birthDate: data.birthDate,
        address: data.address,
        sede: data.sede,
        gamePoints: data.gamePoints,
        isAdmin: data.isAdmin,
      });
      toast.success("Utente aggiornato con successo.");
      closeEdit();
      await load();
    } catch {
      toast.error("Errore durante il salvataggio.");
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={editingUser?.email ?? ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                />
              </div>

              <div>
                <Label htmlFor="birthDate">Data di nascita</Label>
                <Input
                  id="birthDate"
                  {...register("birthDate")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Indirizzo</Label>
              <Input
                id="address"
                {...register("address")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sede">Sede</Label>
                <Select
                  value={watch("sede") || ""}
                  onValueChange={(value) =>
                    setValue("sede", value ?? "", { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="sede">
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
                {errors.sede && (
                  <p className="text-sm text-destructive">{errors.sede.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gamePoints">Punti</Label>
                <Input
                  id="gamePoints"
                  type="number"
                  {...register("gamePoints", { valueAsNumber: true })}
                />
                {errors.gamePoints && (
                  <p className="text-sm text-destructive">{errors.gamePoints.message}</p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <input
                type="checkbox"
                {...register("isAdmin")}
              />
              <span className="text-sm font-medium">Amministratore</span>
            </label>

            <DialogFooter className="gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </Button>
              <Button variant="outline" onClick={closeEdit}>
                Annulla
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
