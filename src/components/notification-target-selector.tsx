"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin-service";
import { UserModel } from "@/types/user";
import { NotificationTarget } from "@/types/admin";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type TargetType = NotificationTarget["type"];

interface NotificationTargetSelectorProps {
  value: NotificationTarget;
  onChange: (target: NotificationTarget) => void;
}

export default function NotificationTargetSelector({
  value,
  onChange,
}: NotificationTargetSelectorProps) {
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Users dialog state
  const [users, setUsers] = useState<UserModel[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSedeFilter, setUserSedeFilter] = useState("");
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoadingLocations(true);
    adminService
      .fetchLocations()
      .then(setLocations)
      .catch(() => toast.error("Errore caricamento sedi."))
      .finally(() => setLoadingLocations(false));
  }, []);

  const targetType = value.type;

  function handleTypeChange(type: TargetType) {
    if (type === "broadcast") {
      onChange({ type: "broadcast" });
    } else if (type === "sedes") {
      onChange({ type: "sedes", sedes: [] });
    } else if (type === "users") {
      onChange({ type: "users", userUids: [] });
    }
  }

  // Sedes logic
  const selectedSedes = value.type === "sedes" ? value.sedes : [];

  function toggleSede(sede: string) {
    if (value.type !== "sedes") return;
    const next = selectedSedes.includes(sede)
      ? selectedSedes.filter((s) => s !== sede)
      : [...selectedSedes, sede];
    onChange({ type: "sedes", sedes: next });
  }

  // Users logic
  const selectedUserUids = value.type === "users" ? value.userUids : [];

  function openUsersDialog() {
    setDialogOpen(true);
    setUserSearch("");
    setUserSedeFilter("");
    setSelectedUids(new Set(selectedUserUids));

    if (users.length === 0) {
      setLoadingUsers(true);
      adminService
        .fetchUsers()
        .then(setUsers)
        .catch(() => toast.error("Errore caricamento utenti."))
        .finally(() => setLoadingUsers(false));
    }
  }

  function saveUserSelection() {
    onChange({ type: "users", userUids: Array.from(selectedUids) });
    setDialogOpen(false);
  }

  const filteredUsers = useMemo(() => {
    let result = users;
    if (userSedeFilter) {
      result = result.filter((u) => u.sede === userSedeFilter);
    }
    const term = userSearch.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }
    return result;
  }, [users, userSedeFilter, userSearch]);

  function toggleUser(uid: string) {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label>Destinatari</Label>
        <Select
          value={targetType}
          onValueChange={(v) => handleTypeChange(v as TargetType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona destinatari" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="broadcast">Tutti gli utenti</SelectItem>
            <SelectItem value="sedes">Per sede</SelectItem>
            <SelectItem value="users">Utenti specifici</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {targetType === "sedes" && (
        <div className="space-y-2">
          <Label>Seleziona le sedi</Label>
          {loadingLocations ? (
            <Skeleton className="h-8 w-full" />
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna sede disponibile.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {locations.map((loc) => (
                <label
                  key={loc}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={selectedSedes.includes(loc)}
                    onCheckedChange={() => toggleSede(loc)}
                  />
                  <span>{loc}</span>
                </label>
              ))}
            </div>
          )}
          {selectedSedes.length === 0 && (
            <p className="text-xs text-destructive">
              Seleziona almeno una sede.
            </p>
          )}
        </div>
      )}

      {targetType === "users" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Utenti selezionati</Label>
            <span className="text-xs text-muted-foreground">
              {selectedUserUids.length} utente
              {selectedUserUids.length === 1 ? "" : "i"}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={openUsersDialog}
          >
            {selectedUserUids.length > 0
              ? "Modifica selezione"
              : "Seleziona utenti"}
          </Button>
          {selectedUserUids.length === 0 && (
            <p className="text-xs text-destructive">
              Seleziona almeno un utente.
            </p>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleziona utenti</DialogTitle>
            <DialogDescription>
              Cerca e seleziona gli utenti a cui inviare la notifica.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 md:flex-row">
            <Select
              value={userSedeFilter}
              onValueChange={(v) => setUserSedeFilter(v ?? "")}
            >
              <SelectTrigger className="md:w-56">
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
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          {loadingUsers ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun utente trovato.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sede</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.uid}
                      onClick={() => toggleUser(user.uid)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedUids.has(user.uid)}
                          onCheckedChange={() => toggleUser(user.uid)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.fullName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>{user.sede}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedUids.size} selezionato
              {selectedUids.size === 1 ? "" : "i"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={saveUserSelection}>
                Conferma
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
