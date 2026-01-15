import { 
  CalculatorIcon, 
  BrainCircuitIcon, 
  HelpCircleIcon, 
  CheckCircle2Icon 
} from 'lucide-react';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Bienvenido al Sistema de Optimización
        </h1>
        <p className="text-slate-500 max-w-2xl">
          Selecciona una opción del menú lateral para comenzar. Aquí tienes un resumen de cómo operar los módulos principales del sistema.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4 text-blue-600">
            <CalculatorIcon size={24} />
            <h2 className="font-semibold text-lg text-slate-900">Flujo de Ventas</h2>
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• Registra ventas en tiempo real.</li>
            <li>• El sistema guarda automáticamente las series de tiempo para el análisis.</li>
            <li>• Los tickets se generan tras confirmar el pago.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4 text-purple-600">
            <BrainCircuitIcon size={24} />
            <h2 className="font-semibold text-lg text-slate-900">Motor Estadístico</h2>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            El motor estadistico procesa modelos de regresión lineal para predecir la demanda:
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4 text-emerald-600">
            <CheckCircle2Icon size={24} />
            <h2 className="font-semibold text-lg text-slate-900">Optimización PyME</h2>
          </div>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• Revisa el **Stock Sugerido** para evitar faltantes.</li>
            <li>• Gestiona deudores en la sección de CRM.</li>
            <li>• Exporta estadísticas para toma de decisiones.</li>
          </ul>
        </div>
      </div>

      <footer className="mt-12 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 text-sm">
          <HelpCircleIcon size={18} />
          <Link href="#" className='hover:underline'>¿Necesitas ayuda? Consulta la documentación tecnica.</Link>

        </div>

      </footer>
    </div>
  );
}