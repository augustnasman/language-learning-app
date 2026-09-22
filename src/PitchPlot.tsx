interface PlotProps {
  values: (number | null)[]
  color: string
  label: string
  unit?: string
  height?: number
}

function range(values: (number | null)[]): [number, number] {
  const nums = values.filter((v): v is number => v != null)
  let min = Math.min(...nums)
  let max = Math.max(...nums)
  if (max - min < 1e-9) max = min + 1
  if (min > 0 && max / min < 1.15) min = 0 // flat-ish, baseline at 0
  return [min, max]
}

export default function Plot({ values, color, label, unit = '', height = 70 }: PlotProps) {
  const [min, max] = range(values)
  const width = 600
  const pad = 4
  const stepX = values.length > 1 ? width / (values.length - 1) : width

  const points = values
    .map((v, i) => {
      if (v == null) return null
      const x = i * stepX
      const y = pad + ((max - v) / (max - min)) * (height - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .filter((p): p is string => p != null)

  return (
    <figure style={{ margin: '0.5rem 0' }}>
      <figcaption style={{ fontSize: '0.85rem', color: '#888', marginBottom: 2 }}>
        {label} <small>({min.toFixed(0)}–{max.toFixed(0)}{unit})</small>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', background: '#1b1b1f', borderRadius: 4 }}
        role="img"
        aria-label={label}
      >
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </figure>
  )
}
