export function DocumentHeader({ titleNode, code, areaNode, statusNode }) {
  return (
    <div className="flex w-full flex-col sm:flex-row border-b-[3px] border-marron-cafe bg-white">
      <div className="w-full sm:w-[240px] shrink-0 border-b sm:border-b-0 sm:border-r border-marron-tierra/20 bg-[#fdf8f4] p-4">
        <span className="block text-[16px] font-bold tracking-[0.03em] text-marron-cafe">COMRURAL XXI</span>
        <span className="mt-1.5 block text-[9px] leading-relaxed text-marron-cafe/60">Sistema de Gestión — gestion.comrural.com.bo</span>
      </div>
      <div className="flex flex-1 items-center p-4 sm:px-5">
        {titleNode}
      </div>
      <div className="w-full sm:w-[220px] shrink-0 border-t sm:border-t-0 sm:border-l border-marron-tierra/20">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-marron-tierra/20">
              <th className="w-1/2 bg-[#fafaf7] px-2.5 py-1.5 text-left text-[11px] font-normal text-marron-cafe/60">Código</th>
              <td className="w-1/2 max-w-0 px-2.5 py-1.5 text-[11px]">{code}</td>
            </tr>
            <tr className="border-b border-marron-tierra/20">
              <th className="w-1/2 bg-[#fafaf7] px-2.5 py-1.5 text-left text-[11px] font-normal text-marron-cafe/60">Área</th>
              <td className="w-1/2 max-w-0 px-2.5 py-1.5 text-[11px]">
                {areaNode}
              </td>
            </tr>
            <tr>
              <th className="w-1/2 bg-[#fafaf7] px-2.5 py-1.5 text-left text-[11px] font-normal text-marron-cafe/60">Estado</th>
              <td className="w-1/2 max-w-0 px-2.5 py-1.5 text-[11px]">
                {statusNode}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
