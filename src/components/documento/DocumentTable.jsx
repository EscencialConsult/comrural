export function DocumentSectionTitle({ title, prefix }) {
  return (
    <h2 className="mb-2.5 mt-6 rounded-r-md border-l-4 border-marron-cafe bg-marron-tierra/5 px-2.5 py-1.5 text-[12px] uppercase tracking-wide text-marron-cafe">
      {prefix && `${prefix}. `}{title}
    </h2>
  )
}

export function DocumentTable({ children }) {
  return (
    <table className="w-full border-collapse">
      <tbody>{children}</tbody>
    </table>
  )
}

export function DocumentRow({ labelNode, code, required, unit, controlNode, actionsNode, isDeleted }) {
  return (
    <tr>
      <th className="w-1/2 border border-marron-tierra/20 bg-[#f7f6f0] px-3 py-2 text-left align-top text-[11px] font-bold uppercase text-marron-cafe">
        {labelNode}
        <span className={`font-normal normal-case ${required ? 'text-rojo-pasankalla' : 'text-marron-cafe/50'}`}>
          {required ? ' (Obligatorio)' : ' (Opcional)'}
        </span>
        {unit && <span className="font-normal normal-case text-marron-cafe/50"> ({unit})</span>}
      </th>
      <td className="border border-marron-tierra/20 px-3 py-2 align-middle">
        {controlNode}
      </td>
      {actionsNode && (
        <td className="w-[56px] whitespace-nowrap border border-marron-tierra/20 bg-[#fafaf9] px-2 py-2 text-center align-middle print:hidden">
          {actionsNode}
        </td>
      )}
    </tr>
  )
}
