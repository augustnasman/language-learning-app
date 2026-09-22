interface Props {
  expected: number[]
  heard: number[]
}

const COLORS = ['#4fc3f7', '#ffd54f', '#ef9a9a', '#aed581', '#ce93d8']

export default function PhoneTracePlot({ expected, heard }: Props) {
  const all = [...expected, ...heard]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const height = 90
  const pad = 10
  const width = 600
  const toY = (v: number) => pad + (1 - (v - min) / span) * (height - 2 * pad)
  const stepE = expected.length > 1 ? width / (expected.length - 1) : 0
  const stepH = heard.length > 1 ? width / (heard.length - 1) : 0

  const toPoints = (vals: number[], step: number) =>
    vals.map((v, i) => `${(i * step).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')

  return (
    <figure style={{ margin: '0.5rem 0' }}>
      <figcaption style={{ fontSize: '0.85rem', color: '#888', marginBottom: 2 }}>
        Phonetic code aligned outperformed against heard (token space)
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', background: '#1b1b1f', borderRadius: 4 }}
        role="img"
        aria-label="Expected vs heard phone alignment"
      >
        {expected.map((v, i) => (
          <line
            key={`e${i}`}
            x1={(i * stepE).toFixed(1)}
            y1={toY(v).toFixed(1)}
            x2={(i * stepE).toFixed(1)}
            y2={height}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth="2"
            opacity="0.5"
          />
        ))}
        <polyline
          points={toPoints(expected, stepE)}
          fill="none"
          stroke="#4fc3f7"
          strokeWidth="1.5"
        />
        <polyline
          points={toPoints(heard, stepH)}
          fill="none"
          stroke="#ef9a9a"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>
      <figcaption style={{ fontSize: '0.8rem' }}>
        <span style={{ color: '#4fc3f7' }}>— expected</span> ·{' '}
        <span style={{ color: '#ef9a9a' }}>-- heard</span>
      </figcaption>
    </figure>
  )
}
