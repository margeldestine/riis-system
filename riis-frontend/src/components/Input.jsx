export default function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
  name,
  rightElement,
}) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-widest text-gray-500"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#1a5fa8] focus:ring-2 focus:ring-[#1a5fa8]/20 disabled:cursor-not-allowed disabled:bg-gray-100 ${rightElement ? 'pr-11' : ''}`}
        />
        {rightElement ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        ) : null}
      </div>
    </div>
  )
}