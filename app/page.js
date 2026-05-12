'use client'

import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// SCORING ENGINE — rules-based, no API
// ─────────────────────────────────────────────────────────────────────────────
function scorePrompt(text) {
  const lower = text.toLowerCase()
  const words = text.trim().split(/\s+/)
  const wordCount = words.length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length

  // 1. ROLE DEFINITION
  let roleScore = 0
  const rolePhrases = ['you are', 'act as', 'your role', 'as a', "you're a"]
  const roleWords   = ['expert', 'specialist', 'professional', 'assistant']
  if (rolePhrases.some(kw => lower.includes(kw))) roleScore += 5
  if (roleWords.some(kw => lower.includes(kw)))   roleScore += 3
  const first30 = words.slice(0, 30).join(' ').toLowerCase()
  if ([...rolePhrases, ...roleWords].some(kw => first30.includes(kw))) roleScore += 2
  roleScore = Math.min(10, roleScore)

  // 2. CONTEXT
  let contextScore = 0
  contextScore += Math.min(6, sentenceCount * 2)
  if (['because', 'in order to', 'the goal is', 'i need this for'].some(kw => lower.includes(kw))) contextScore += 2
  if (wordCount > 50) contextScore += 2
  contextScore = Math.min(10, contextScore)

  // 3. SPECIFICITY
  let specificityScore = 0
  if (/\d/.test(text)) specificityScore += 3
  if (['for example', 'such as', 'like:', 'e.g.'].some(kw => lower.includes(kw))) specificityScore += 3
  const midWords = words.slice(1).filter(w => /^[A-Z][a-zA-Z]{1,}$/.test(w) && w !== 'I')
  if (midWords.length > 0) specificityScore += 2
  if (wordCount > 40) specificityScore += 2
  if (['good', 'better', 'something', 'help me with', 'a bit'].some(kw => lower.includes(kw))) specificityScore -= 3
  specificityScore = Math.max(0, Math.min(10, specificityScore))

  // 4. OUTPUT FORMAT
  let formatScore = 0
  if (['bullet', 'numbered', 'list', 'table', 'json', 'paragraph', 'step by step'].some(kw => lower.includes(kw))) formatScore += 4
  if (['brief', 'detailed', 'concise'].some(kw => lower.includes(kw)) || /\d+\s*words?/.test(lower) || /\d+\s*sentences?/.test(lower)) formatScore += 3
  if (['formal', 'casual', 'simple', 'technical'].some(kw => lower.includes(kw))) formatScore += 3
  formatScore = Math.min(10, formatScore)

  // 5. CLARITY
  let clarityScore = 10
  let vagueHits = 0
  ;['stuff', 'things', 'etc', 'and so on', 'whatever'].forEach(kw => { if (lower.includes(kw)) vagueHits++ })
  clarityScore -= Math.min(6, vagueHits * 2)
  if (wordCount < 15)    clarityScore -= 2
  if (sentenceCount > 8) clarityScore -= 2
  clarityScore = Math.max(0, clarityScore)

  const avg = (roleScore + contextScore + specificityScore + formatScore + clarityScore) / 5
  return {
    dimensions: {
      'Role Definition': roleScore,
      'Context':         contextScore,
      'Specificity':     specificityScore,
      'Output Format':   formatScore,
      'Clarity':         clarityScore,
    },
    overallScore: Math.round(avg * 10),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────
const FEEDBACK = {
  'Role Definition': (s) => ({
    detected: s >= 8 ? 'Role phrase and expertise keyword detected near the opening.'
      : s >= 5 ? 'Role phrase found but expertise level not fully specified.'
      : 'No role or persona definition found in your prompt.',
    improve: s >= 8 ? 'Role is well-defined — keep it in the very first sentence.'
      : s >= 5 ? "Add an expertise keyword like 'expert' or 'specialist' after the role."
      : "Start with 'You are a [specific expert role]' to set the AI's context.",
  }),
  'Context': (s) => ({
    detected: s >= 8 ? 'Strong context — background sentences and purpose keyword present.'
      : s >= 4 ? 'Some context detected but the goal is not clearly stated.'
      : "Minimal context — the AI can't infer why you need this.",
    improve: s >= 8 ? 'Solid context. More background sentences would strengthen it further.'
      : s >= 4 ? "Add 'because...' or 'the goal is...' to explain your objective."
      : 'Explain your situation and why you need this specific output.',
  }),
  'Specificity': (s) => ({
    detected: s >= 8 ? 'Numbers, examples, and specific references all detected.'
      : s >= 4 ? 'Some specific details found, but lacks concrete examples.'
      : 'Prompt uses vague, generic language with no concrete details.',
    improve: s >= 8 ? 'High specificity — add exact platform names or metrics if possible.'
      : s >= 4 ? "Add at least one number and a 'for example' to anchor the response."
      : "Replace vague language with specific numbers, tools, and 'for example'.",
  }),
  'Output Format': (s) => ({
    detected: s >= 8 ? 'Format type, length, and tone instructions all specified.'
      : s >= 4 ? 'Partial format guidance — some output instructions missing.'
      : 'No output format, length, or tone specified in the prompt.',
    improve: s >= 8 ? 'Great format spec — all three (format, length, tone) are covered.'
      : s >= 4 ? 'Complete the trio: format (bullet/table) + length (N words) + tone.'
      : 'Specify format (bullet list), length (200 words), and tone (formal/casual).',
  }),
  'Clarity': (s) => ({
    detected: s >= 9 ? 'Prompt is clear — no vague filler words detected.'
      : s >= 6 ? 'Mostly clear, but some ambiguous or filler terms were found.'
      : 'Multiple vague terms or structural issues reduce overall clarity.',
    improve: s >= 9 ? 'Excellent clarity — keep prompts focused and direct.'
      : s >= 6 ? "Remove filler words like 'stuff', 'things', or 'etc.' from your prompt."
      : "Rewrite removing vague words ('stuff', 'things') — aim for under 8 sentences.",
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// CIRCULAR GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function CircularGauge({ score }) {
  const radius      = 54
  const strokeWidth = 10
  const circumference   = 2 * Math.PI * radius
  const dashoffset      = circumference * (1 - score / 100)
  const color  = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label  = score >= 70 ? 'Good'    : score >= 40 ? 'Average' : 'Poor'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={70} cy={70} r={radius} fill="none" stroke="#1f1f1f" strokeWidth={strokeWidth} />
          <circle
            cx={70} cy={70} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: '#ffffff' }}>{score}</span>
          <span className="text-xs" style={{ color: '#4b5563' }}>/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold tracking-wide" style={{ color }}>{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION CARD
// ─────────────────────────────────────────────────────────────────────────────
function DimensionCard({ name, score }) {
  const color    = score >= 7 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#ef4444'
  const feedback = FEEDBACK[name]?.(score) ?? { detected: '', improve: '' }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>{name}</span>
        <span className="text-sm font-mono font-bold" style={{ color }}>{score}/10</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1f1f1f' }}>
        <div className="h-1.5 rounded-full" style={{ width: `${score * 10}%`, backgroundColor: color, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div className="space-y-2">
        <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
          <span className="font-medium" style={{ color: '#4b5563' }}>Detected  </span>{feedback.detected}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
          <span className="font-medium" style={{ color: '#4b5563' }}>Improve  </span>{feedback.improve}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [prompt,        setPrompt]        = useState('')
  const [results,       setResults]       = useState(null)
  const [showModal,     setShowModal]     = useState(false)
  const [email,         setEmail]         = useState('')
  const [isGenerating,  setIsGenerating]  = useState(false)
  const [improvedPrompt,setImprovedPrompt]= useState(null)
  const [genError,      setGenError]      = useState(null)
  const [copied,        setCopied]        = useState(false)

  const wordCount = prompt.trim() === '' ? 0 : prompt.trim().split(/\s+/).length
  const isEmpty   = prompt.trim() === ''

  // Attempt table setup on mount (best-effort, non-blocking)
  useEffect(() => {
    fetch('/api/setup-db').catch(() => {})
  }, [])

  const handleAnalyze = () => {
    setResults(scorePrompt(prompt))
    setImprovedPrompt(null)
  }

  const handleGenerateClick = () => {
    setGenError(null)
    setShowModal(true)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || isGenerating) return
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setGenError('Please enter a valid email address.')
      return
    }

    setIsGenerating(true)
    setGenError(null)

    try {
      // Run save-lead (non-critical) + improve-prompt in parallel
      const [, improveRes] = await Promise.all([
        fetch('/api/save-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, score: results?.overallScore ?? 0 }),
        }).catch(() => null),
        fetch('/api/improve-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        }),
      ])

      if (!improveRes.ok) {
        const err = await improveRes.json().catch(() => ({}))
        throw new Error(err.error || 'Something went wrong. Try again.')
      }

      const data = await improveRes.json()
      setImprovedPrompt(data.improvedPrompt)
      setShowModal(false)
    } catch (err) {
      setGenError(err.message || 'Something went wrong. Try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!improvedPrompt) return
    navigator.clipboard.writeText(improvedPrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a' }} className="min-h-screen flex flex-col font-sans antialiased">

      {/* ── Header ── */}
      <header className="pt-16 pb-6 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
          PromptScore
        </h1>
        <p className="mt-4 text-base md:text-lg font-light" style={{ color: '#6b7280' }}>
          Find out why your AI prompts underperform.
        </p>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-6 pb-20">
        <div className="w-full max-w-2xl">

          {/* Textarea */}
          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setResults(null); setImprovedPrompt(null) }}
            placeholder="Paste your prompt here..."
            rows={10}
            suppressHydrationWarning
            className="w-full rounded-2xl p-5 text-base leading-relaxed resize-none focus:outline-none"
            style={{ backgroundColor: '#111111', border: '1px solid #222222', color: '#e5e7eb', caretColor: '#ffffff', transition: 'border-color 0.2s' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3f3f3f' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = '#222222' }}
          />

          {/* Word count */}
          <div className="mt-2 pr-1 text-sm text-right" style={{ color: '#4b5563' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>

          {/* Analyze button */}
          <button
            disabled={isEmpty}
            onClick={handleAnalyze}
            className="mt-4 w-full py-4 rounded-2xl text-base font-semibold tracking-wide"
            style={
              isEmpty
                ? { backgroundColor: '#161616', color: '#3f3f3f', cursor: 'not-allowed', border: '1px solid #1f1f1f' }
                : { backgroundColor: '#ffffff', color: '#0a0a0a', cursor: 'pointer', transition: 'background-color 0.2s' }
            }
            onMouseEnter={(e) => { if (!isEmpty) e.currentTarget.style.backgroundColor = '#e5e7eb' }}
            onMouseLeave={(e) => { if (!isEmpty) e.currentTarget.style.backgroundColor = '#ffffff' }}
          >
            Analyze Prompt
          </button>

          {/* ── RESULTS ── */}
          {results && (
            <div className="mt-10 space-y-8">

              {/* Overall gauge */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#374151' }}>Overall Score</p>
                <CircularGauge score={results.overallScore} />
              </div>

              <div style={{ height: 1, backgroundColor: '#1a1a1a' }} />

              {/* Dimension cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(results.dimensions).map(([name, score]) => (
                  <DimensionCard key={name} name={name} score={score} />
                ))}
              </div>

              {/* CTA */}
              {!improvedPrompt && (
                <div className="rounded-2xl p-7 text-center" style={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a' }}>
                  <p className="text-sm mb-5" style={{ color: '#6b7280' }}>
                    Want the improved version of your prompt?
                  </p>
                  <button
                    onClick={handleGenerateClick}
                    className="px-8 py-3.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: '#ffffff', color: '#0a0a0a', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
                  >
                    Generate Improved Prompt &rarr;
                  </button>
                </div>
              )}

              {/* Improved prompt output */}
              {improvedPrompt && (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1f1f1f' }}>
                  <div className="px-5 py-4" style={{ backgroundColor: '#111111', borderBottom: '1px solid #1a1a1a' }}>
                    <p className="text-xs uppercase tracking-widest font-medium" style={{ color: '#4b5563' }}>Improved Prompt</p>
                  </div>
                  <div className="p-5" style={{ backgroundColor: '#0d0d0d' }}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#d1d5db' }}>
                      {improvedPrompt}
                    </p>
                  </div>
                  <div className="px-5 py-4 flex flex-col items-center gap-3" style={{ backgroundColor: '#111111', borderTop: '1px solid #1a1a1a' }}>
                    <button
                      onClick={handleCopy}
                      className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={{
                        backgroundColor: copied ? '#0d1f0d' : '#1a1a1a',
                        color:           copied ? '#22c55e' : '#e5e7eb',
                        border:          `1px solid ${copied ? '#166534' : '#2a2a2a'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? '\u2713 Copied!' : 'Copy Improved Prompt'}
                    </button>
                    <p className="text-xs" style={{ color: '#374151' }}>
                      Want the full framework?&nbsp;&rarr;&nbsp;
                      <a
                        href="https://pedjadrazic.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#4b5563', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#9ca3af' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#4b5563' }}
                      >
                        pedjadrazic.com
                      </a>
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-7 text-center text-sm" style={{ color: '#374151' }}>
        Built by Pedja Drazic&nbsp;&middot;&nbsp;
        <a
          href="https://pedjadrazic.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#4b5563', transition: 'color 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#9ca3af' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#4b5563' }}
        >
          pedjadrazic.com
        </a>
      </footer>

      {/* ── MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setGenError(null) } }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-8"
            style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
          >
            {/* Close */}
            <button
              onClick={() => { setShowModal(false); setGenError(null) }}
              className="absolute top-4 right-5 text-lg font-light transition-colors"
              style={{ color: '#4b5563' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#e5e7eb' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#4b5563' }}
            >
              &#x2715;
            </button>

            <h2 className="text-xl font-bold mb-2" style={{ color: '#ffffff' }}>
              Get Your Improved Prompt
            </h2>
            <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
              Enter your email to receive the rewritten version.
            </p>

            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isGenerating}
                className="w-full rounded-xl px-4 py-3.5 text-sm mb-3 focus:outline-none"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e5e7eb', transition: 'border-color 0.2s' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3f3f3f' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#2a2a2a' }}
                autoFocus
              />

              {genError && (
                <p className="text-xs mb-3" style={{ color: '#f87171' }}>{genError}</p>
              )}

              <button
                type="submit"
                disabled={isGenerating || !email.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-semibold"
                style={
                  isGenerating || !email.trim()
                    ? { backgroundColor: '#1a1a1a', color: '#3f3f3f', cursor: 'not-allowed' }
                    : { backgroundColor: '#ffffff', color: '#0a0a0a', cursor: 'pointer', transition: 'background-color 0.2s' }
                }
                onMouseEnter={(e) => { if (!isGenerating && email.trim()) e.currentTarget.style.backgroundColor = '#e5e7eb' }}
                onMouseLeave={(e) => { if (!isGenerating && email.trim()) e.currentTarget.style.backgroundColor = '#ffffff' }}
              >
                {isGenerating ? 'Generating\u2026' : 'Generate Now'}
              </button>

              <p className="text-xs text-center mt-4" style={{ color: '#374151' }}>
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
