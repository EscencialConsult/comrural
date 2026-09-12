import { useRef, useEffect } from 'react'
import { Pencil } from 'lucide-react'

export function EditableTitleInput({ value, onChange, disabled, title, maxLength = 150 }) {
  return (
    <div className="flex w-full items-start gap-1.5 rounded-md border border-amber-400 bg-amber-50 px-1.5 py-1 transition-colors focus-within:border-amber-500 focus-within:bg-amber-100 focus-within:ring-2 focus-within:ring-amber-500/20">
      <Pencil size={12} className="mt-[3px] shrink-0 text-amber-600/70" />
      <input
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent text-[15px] font-bold uppercase tracking-wide text-marron-cafe outline-none"
        title={title}
      />
    </div>
  )
}

export function EditableSelect({ value, onChange, disabled, options, title }) {
  return (
    <div className="flex w-full overflow-hidden items-center gap-1.5 rounded-md border border-amber-400 bg-amber-50 px-1 py-0.5 transition-colors focus-within:border-amber-500 focus-within:bg-amber-100 focus-within:ring-2 focus-within:ring-amber-500/20">
      <Pencil size={10} className="shrink-0 text-amber-600/70" />
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="min-w-0 flex-1 truncate bg-transparent text-[11px] outline-none"
        title={title}
      >
        {options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function EditableCheckbox({ checked, onChange, disabled, labelActivo, labelInactivo, title }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5" title={title}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="size-3.5 accent-[#6b4a32]"
      />
      <span className={checked ? 'font-semibold text-verde-bosque' : 'text-marron-cafe/50'}>
        {checked ? labelActivo : labelInactivo}
      </span>
    </label>
  )
}

export function EditableTextarea({ value, onChange, disabled, title, maxLength = 200 }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [value])

  return (
    <div className="mb-0.5 flex items-start gap-1.5 rounded-md border border-amber-400 bg-amber-50 px-1.5 py-0.5 transition-colors focus-within:border-amber-500 focus-within:bg-amber-100 focus-within:ring-2 focus-within:ring-amber-500/20">
      <Pencil size={11} className="mt-[3px] shrink-0 text-amber-600/70" />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        disabled={disabled}
        className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent font-sans text-[12.5px] leading-relaxed outline-none"
        title={title}
        rows={1}
      />
    </div>
  )
}
