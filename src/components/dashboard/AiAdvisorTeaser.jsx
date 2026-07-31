import { Sparkles } from 'lucide-react'

// Widget informativo, no un botón — todavía no hay IA conectada del otro
// lado. Un botón que no lleva a ningún lado rompería la regla del
// proyecto, así que esto es puramente un aviso de "viene después".
export default function AiAdvisorTeaser() {
  return (
    <div className="mt-4 rounded-2xl bg-verde-bosque/30 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-verde-lima" strokeWidth={1.75} />
        <span className="text-sm font-extrabold text-crema-quinua">Asesor Orgánico IA</span>
        <span className="ml-auto rounded-full bg-crema-quinua/10 px-2 py-0.5 text-[10px] font-medium text-crema-quinua/50">
          Próximamente
        </span>
      </div>
      <p className="text-xs text-crema-quinua/70">
        Un asistente de IA para responder preguntas sobre tus campos — todavía no está conectado.
      </p>
    </div>
  )
}
