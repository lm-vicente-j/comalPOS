"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Landmark, MonitorSmartphone } from "lucide-react";
import { saveSettings, type BusinessSettings } from "@/lib/actions/settings";
import { useDeviceSettings, useDeviceSettingsHydration } from "@/lib/device-settings";

type Alert = { type: "success" | "error"; message: string };

export default function SettingsManager({ settings }: { settings: BusinessSettings }) {
    return (
        <div className="space-y-6">
            <BusinessSettingsCard settings={settings} />
            <DeviceSettingsCard />
        </div>
    );
}

function BusinessSettingsCard({ settings }: { settings: BusinessSettings }) {
    const [clabe, setClabe] = useState(settings.clabe);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [alert, setAlert] = useState<Alert | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setErrors({});
        setAlert(null);
        setSaving(true);
        const res = await saveSettings({ clabe });
        setSaving(false);

        if (res.success) {
            setAlert({ type: "success", message: "Configuración guardada." });
            setTimeout(() => setAlert(null), 4000);
        } else {
            if (res.fieldErrors) setErrors(res.fieldErrors);
            setAlert({
                type: "error",
                message:
                    res.error === "PERMISSION DENIED"
                        ? "No tienes permiso para modificar la configuración del negocio."
                        : res.error || "Error al guardar.",
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-orange-500" />
                    Datos del negocio
                </CardTitle>
                <CardDescription>
                    Se guardan en el servidor y se comparten entre todos los dispositivos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {alert && (
                    <div
                        className={`rounded p-3 text-sm font-medium ${
                            alert.type === "success"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
                        {alert.message}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Label htmlFor="clabe">CLABE interbancaria</Label>
                    <Input
                        id="clabe"
                        inputMode="numeric"
                        maxLength={18}
                        placeholder="18 dígitos"
                        value={clabe}
                        onChange={(e) => setClabe(e.target.value.replace(/\D/g, ""))}
                    />
                    <p className="text-xs text-muted-foreground">
                        Cuenta a la que los clientes envían transferencias.
                    </p>
                    {errors.clabe && (
                        <p className="text-xs text-red-500">{errors.clabe[0]}</p>
                    )}
                </div>

                <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
                    {saving ? "Guardando..." : "Guardar"}
                </Button>
            </CardContent>
        </Card>
    );
}

function DeviceSettingsCard() {
    useDeviceSettingsHydration();
    const hydrated = useDeviceSettings((s) => s.hydrated);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MonitorSmartphone className="h-5 w-5 text-orange-500" />
                    Este dispositivo
                </CardTitle>
                <CardDescription>
                    Se guarda solo en este navegador. Otros dispositivos no lo ven.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Gate on hydration so the inner form's initial state is seeded
                    from localStorage in a single render (avoids syncing via an
                    effect and the server/client value mismatch). */}
                {hydrated ? <DeviceSettingsForm /> : <DeviceSettingsSkeleton />}
            </CardContent>
        </Card>
    );
}

function DeviceSettingsForm() {
    const deviceName = useDeviceSettings((s) => s.deviceName);
    const setDeviceName = useDeviceSettings((s) => s.setDeviceName);

    // Local draft so typing doesn't rewrite localStorage on every keystroke;
    // committed on save. Initialized from the persisted value (this component
    // only mounts once storage has been read).
    const [draft, setDraft] = useState(deviceName);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setDeviceName(draft.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
    };

    return (
        <>
            {saved && (
                <div className="rounded p-3 text-sm font-medium bg-green-100 text-green-700">
                    Preferencia guardada en este dispositivo.
                </div>
            )}

            <div className="flex flex-col gap-2">
                <Label htmlFor="deviceName">Nombre de este dispositivo</Label>
                <Input
                    id="deviceName"
                    placeholder="Ej: Caja principal"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Ayuda a identificar esta terminal (mostrador, barra, móvil...).
                </p>
            </div>

            <Button onClick={handleSave} className="cursor-pointer">
                Guardar en este dispositivo
            </Button>
        </>
    );
}

function DeviceSettingsSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor="deviceName">Nombre de este dispositivo</Label>
            <Input id="deviceName" placeholder="Ej: Caja principal" disabled />
            <p className="text-xs text-muted-foreground">
                Ayuda a identificar esta terminal (mostrador, barra, móvil...).
            </p>
        </div>
    );
}
