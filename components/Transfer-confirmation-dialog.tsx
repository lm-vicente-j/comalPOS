"use client";

import { useEffect, useRef, useState } from "react";
import { getSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TransferConfirmationDialog({
  accountLabel,
  total,
  onCancel,
  onConfirm,
}: {
  accountLabel: string | null;
  total: number;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const [clabe, setClabe] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    getSettings().then((settings) => {
      if (active) setClabe(settings.clabe);
    }).catch(() => {
      if (active) setError("No se pudo cargar la CLABE. Cierra el diálogo e inténtalo de nuevo.");
    });
    return () => { active = false; };
  }, []);

  const formattedClabe = clabe?.replace(/\s/g, "").match(/.{1,4}/g)?.join(" ") || "";

  const handleConfirm = async () => {
    if (confirming || clabe === null) return;
    setConfirming(true);
    setError("");
    try {
      if (!await onConfirm()) {
        setError("No se pudo registrar el cobro. Inténtalo de nuevo.");
      }
    } catch {
      setError("No se pudo registrar el cobro. Inténtalo de nuevo.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !confirming) onCancel(); }}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden"
        onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }}
      >
        <div className="min-h-0 space-y-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar transferencia recibida</DialogTitle>
            <DialogDescription>
              Verifica que recibiste la transferencia de {accountLabel || "esta cuenta"} antes de registrar el cobro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">CLABE interbancaria</p>
            {clabe === null ? (
              <p role="status" className="text-sm text-muted-foreground">Cargando CLABE...</p>
            ) : formattedClabe ? (
              <p aria-label="CLABE de transferencia" className="break-words font-mono text-base tabular-nums">{formattedClabe}</p>
            ) : (
              <p role="status" className="text-sm text-muted-foreground">No hay una CLABE configurada.</p>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="shrink-0 border-t pt-3">
          <div className="mb-3 flex items-center justify-between gap-2 text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total)}</span>
          </div>
          <DialogFooter>
            <Button ref={cancelRef} type="button" variant="outline" disabled={confirming} onClick={onCancel} className="min-h-11">
              Cancelar
            </Button>
            <Button type="button" disabled={confirming || clabe === null} onClick={() => void handleConfirm()} className="h-auto min-h-11 whitespace-normal py-2">
              {confirming ? "Registrando cobro..." : "Confirmar transferencia recibida"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
