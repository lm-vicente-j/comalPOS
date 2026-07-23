import { getSettings } from "@/lib/actions/settings";
import SettingsManager from "./settings-manager";

export default async function SettingsPage() {
    const settings = await getSettings();

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configuración</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Los datos del negocio se guardan en el servidor y aplican a todos los
                    dispositivos. Las preferencias de este dispositivo se guardan solo en
                    este navegador.
                </p>
            </div>

            <SettingsManager settings={settings} />
        </div>
    );
}
