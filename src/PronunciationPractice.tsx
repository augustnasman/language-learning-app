import { useRef, useState } from 'react'

const API = '/api'

interface PhoneError {
  expected: string
  heard: string | null
  confidence: number
}

interface WordError {
  word: string
  position: number
  expected: string
  actual: string | null
  confidence: number
  phones: PhoneError[]
}

interface AnalysisResult {
  score: number
  transcribe: string
  differences: {
    errors: WordError[]
    phoneme_error_rate: number
    word_error_rate: number
    feedback: string
  }
  acoustic_distance: number
}

const SENTENCES = [
  'Bonjour, comment ça va ?',
  'Je voudrais un café, s\u2019il vous plaît.',
  'La tour Eiffel est très belle la nuit.',
  'Quelle heure est-il ? J\u2019ai un train à prendre.',
  'Merci beaucoup, à bientôt !',
]

function scoreLabel(score: number): { emoji: string; text: string } {
  if (score >= 90) return { emoji: '🌟', text: 'Excellent!' }
  if (score >= 75) return { emoji: '🎉', text: 'Very good!' }
  if (score >= 55) return { emoji: '👍', text: 'Getting there — keep practicing.' }
  if (score >= 35) return { emoji: '💪', text: 'Needs work. Try again!' }
  return { emoji: '🎯', text: 'Keep trying — listen to the reference first.' }
}

export default function PronunciationPractice() {
  const [sentence, setSentence] = useState(SENTENCES[0])
  const [recording, setRecording] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const chunks = useRef<Blob[]>([])
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)

  async function startRecording() {
    setError(null)
    setResult(null)
    chunks.current = []
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'
      const rec = new MediaRecorder(stream.current, { mimeType: mime })
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }
      rec.onstop = () => void analyze()
      rec.start()
      recorder.current = rec
      setRecording(true)
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError(
          'Microphone blocked. Check iOS Settings → Brave → Microphone → allow, ' +
          'then tap Record again.',
        )
      } else if (name === 'NotFoundError') {
        setError('No microphone found on this device.')
      } else if (window.location.protocol !== 'https:') {
        setError('Could not access the microphone. Microphone needs https:// or localhost.')
      } else {
        setError(`Could not access the microphone (${name || 'unknown error'}).`)
      }
    }
  }

  function stopRecording() {
    recorder.current?.stop()
    setRecording(false)
  }

  async function analyze() {
    setAnalyzing(true)
    // wait briefly for the final dataavailable event
    if (recorder.current && recorder.current.state !== 'inactive') {
      await new Promise((r) => {
        recorder.current!.onstop = () => {}
        recorder.current!.addEventListener('stop', r, { once: true })
      })
    }
    stream.current?.getTracks().forEach((t) => t.stop())
    try {
      const blob = new Blob(chunks.current, { type: recorder.current?.mimeType })
      if (blob.size === 0) throw new Error('No audio was recorded.')
      const form = new FormData()
      form.append('file', blob, 'recording.webm')
      form.append('expected_text', sentence)
        form.append('lang', 'fr')
      const res = await fetch(`${API}/pronunciation`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  function playReference() {
    const utter = new SpeechSynthesisUtterance(sentence)
    utter.lang = 'fr-FR'
    window.speechSynthesis.speak(utter)
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Pronunciation Practice</h1>
      <p>Pick a sentence, listen to the reference, record yourself, get phoneme-level feedback.</p>

      <label htmlFor="sentence">Sentence: </label>
      <select id="sentence" value={sentence} onChange={(e) => setSentence(e.target.value)} disabled={recording}>
        {SENTENCES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" onClick={playReference}>▶ Listen</button>
        {recording ? (
          <button type="button" onClick={stopRecording}>■ Stop recording</button>
        ) : (
          <button type="button" onClick={() => void startRecording()} disabled={analyzing}>🎙 Record</button>
        )}
        {recording && <span aria-live="polite">Recording…</span>}
        {analyzing && <span aria-live="polite">Analyzing… (first analysis downloads models and can take a while)</span>}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <section style={{ borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
          <h2>
            {scoreLabel(result.score).emoji} Score: {Math.round(result.score)}/100
            <br />
            <small>{scoreLabel(result.score).text}</small>
          </h2>
          <p style={{ whiteSpace: 'pre-line' }}>{result.differences.feedback}</p>
          <p>
            <strong>Heard as:</strong> “{result.transcribe}”
          </p>
          {result.differences.errors.map((err) => (
            <div key={`${err.word}-${err.position}`} style={{ background: '#fff4f4', padding: '0.5rem', borderRadius: 6, marginBottom: '0.5rem' }}>
              <strong>{err.word}</strong>:{' '}
              expected <code>{err.expected}</code>{' '}
              → heard <code>{err.actual ?? '(missing)'}</code>{' '}
              ({Math.round(err.confidence * 100)}% confidence)
              {err.phones.length > 0 && (
                <ul>
                  {err.phones.map((p, i) => (
                    <li key={i}>
                      /{p.expected}/ → /{p.heard ?? '∅'}/ ({Math.round(p.confidence * 100)}%)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {result.differences.errors.length === 0 && (
            <p style={{ color: 'green' }}>No mispronounced words detected!</p>
          )}
        </section>
      )}
    </main>
  )
}
