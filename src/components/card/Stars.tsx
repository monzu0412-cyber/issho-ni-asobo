export function Stars({
  level,
  isEditable = false,
  onChange,
}: {
  level: number
  isEditable?: boolean
  onChange?: (level: number) => void
}) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((starLevel) => (
        <button
          className={starLevel <= level ? 'filled' : ''}
          type="button"
          key={starLevel}
          disabled={!isEditable}
          aria-label={`興味度${starLevel}`}
          onClick={() => onChange?.(starLevel)}
        >
          {starLevel <= level ? '★' : '☆'}
        </button>
      ))}
    </span>
  )
}
