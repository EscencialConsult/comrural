export function DocumentSheet({ children, className = '' }) {
  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
        }
      `}</style>
      <div className={`print-area mx-auto w-full overflow-hidden rounded-xl border border-marron-tierra/30 bg-white font-sans text-[13px] text-marron-cafe shadow-lg ${className}`}>
        {children}
      </div>
    </div>
  )
}

export function DocumentFooter({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5 border-t-2 border-marron-tierra/20 bg-marron-tierra/5 px-5 py-3.5 print:hidden">
      {children}
    </div>
  )
}
