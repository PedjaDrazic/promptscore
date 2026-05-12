'use client'

import { useState } from 'react'

// ─────────────────────────────────────────────
// SCORING ENGINE — rules-based, no API
// ─────────────────────────────────────────────
function scorePrompt(text) {
  const lower = text.toLowerCase()
  const words = text.trim().split(/\s+/)
  const wordCount = words.length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length

  // ── 1. ROLE DEFINITION (0-10) ──
  let roleScore = 0
  const rolePhrases = ["you are", "act as", "your role", "as a", "you're a"]
  const roleWords   = ["expert", "specialist", "professional", "assistant"]
  if (rolePhrases.some(kw => lower.includes(kw))) roleScore += 5
  if (roleWords.some(kw => lower.includes(kw)))   roleScore += 3
  const first30 = words.slice(0, 30).join(' ').toLowerCase()
  if ([...rolePhrases, ...roleWords].some(kw => first30.includes(kw))) roleScore += 2
  roleScore = Math.min(10, roleScore)

  // ── 2. CONTEXT (0-10) ──
  let contextScore = 0
  contextScore += Math.min(6, sentenceCount * 2)
  const contextKw = ["because", "in order to", "the goal is", "i need this for"]
  if (contextKw.some(kw => lower.includes(kw))) contextScore += 2
  if (wordCount > 50) contextScore += 2
  contextScore = Math.min(10, contextScore)

  // ── 3. SPECIFICITY (0-10) ──
  let specificityScore = 0
  if (/\d/.test(text)) specificityScore += 3
  const exampleKw = ["for example", "such as", "like:", "e.g."]
  if (exampleKw.some(kw => lower.includes(kw))) specificityScore += 3
  // Proper nouns: capitalised words that are not "I" and not sentence-starters
  const midWords = words.slice(1).filter(w => /^[A-Z][a-zA-Z]{1,}$/.test(w) && w !== 'I')
  if (midWords.length > 0) specificityScore += 2
  if (wordCount > 40) specificityScore += 2
  const vagueKw = ["good", "better", "something", "help me with", "a bit"]
  if (vagueKw.some(kw => lower.includes(kw))) specificityScore -= 3
  specificityScore = Math.max(0, Math.min(10, specificityScore))

  // ── 4. OUTPUT FORMAT (0-10) ──
  let formatScore = 0
  const formatKw = ["bullet", "numbered", "list", "table", "json", "paragraph", "step by step"]
  if (formatKw.some(kw => lower.includes(kw))) formatScore += 4
  const lengthKw = ["brief", "detailed", "concise"]
  if (
    lengthKw.some(kw => lower.includes(kw)) ||
    /\d+\s*words?/.test(lower) ||
    /\d+\s*sentences?/.test(lower)
  ) formatScore += 3
  const toneKw = ["formal", "casual", "simple", "technical"]
  if (toneKw.some(kw => lower.includes(kw))) formatScore += 3
  formatScore = Math.min(10, formatScore)

  // ── 5. CLARITY (0-10) ──
  let clarityScore = 10
  const clarityVague = ["stuff", "things", "etc", "and so on", "whatever"]
  let vagueHits = 0
  clarityVague.forEach(kw => { if (lower.includes(kw)) vagueHits++ })
  clarityScore -= Math.min(6, vagueHits * 2)
  if (wordCount < 15) clarityScore -= 2
  if (sentenceCount > 8) clarityScore -= 2
  clarityScore = Math.max(0, clarityScore)

  // ── OVERALL: average × 10 ──
  const avg = (roleScore + contextScore + specificityScore + formatScore + clarityScore) / 5
  const overallScore = Math.round(avg * 10)

  return {
    dimensions: {
      'Role Definition': roleScore,
      'Context':         contextScore,
      'Specificity':     specificityScore,
      'Output Format':   formatScore,
      'Clarity':         clarityScore,
    },
    overallScore,
  }
}

export default function App() {
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState(null)

  const wordCount = prompt.trim() === '' ? 0 : prompt.trim().split(/\s+/).length
  const isEmpty = prompt.trim() === ''

  const handleAnalyze = () => {
    setResults(scorePrompt(prompt))
  }

  return (
    <div
      style={{ backgroundColor: '#0a0a0a' }}
      className="min-h-screen flex flex-col font-sans antialiased"
    >
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
      <main className="flex-1 flex flex-col items-center px-6 pt-6 pb-16">
        <div className="w-full max-w-2xl">

          {/* Textarea */}
          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setResults(null) }}
            placeholder="Paste your prompt here..."
            rows={10}
            suppressHydrationWarning
            className="w-full rounded-2xl p-5 text-base leading-relaxed resize-none focus:outline-none"
            style={{
              backgroundColor: '#111111',
              border: '1px solid #222222',
              color: '#e5e7eb',
              caretColor: '#ffffff',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3f3f3f' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = '#222222' }}
          />

          {/* Word count */}
          <div className="mt-2 pr-1 text-sm text-right" style={{ color: '#4b5563' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>

          {/* Analyze Button */}
          <button
            disabled={isEmpty}
            onClick={handleAnalyze}
            className="
              mt-4
              w-full
              py-4
              rounded-2xl
              text-base
              font-semibold
              tracking-wide
              transition-all
              duration-200
            "
            style={
              isEmpty
                ? {
                    backgroundColor: '#161616',
                    color: '#3f3f3f',
                    cursor: 'not-allowed',
                    border: '1px solid #1f1f1f',
                  }
                : {
                    backgroundColor: '#ffffff',
                    color: '#0a0a0a',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                  }
            }
            onMouseEnter={(e) => {
              if (!isEmpty) {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
              }
            }}
            onMouseLeave={(e) => {
              if (!isEmpty) {
                e.currentTarget.style.backgroundColor = '#ffffff'
              }
            }}
          >
            Analyze Prompt
          </button>

          {/* ── Phase 2: Basic Score Output ── */}
          {results && (
            <div
              className="mt-8 rounded-2xl p-6"
              style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
            >
              {/* Overall */}
              <div className="text-center mb-6">
                <p className="text-sm uppercase tracking-widest mb-1" style={{ color: '#4b5563' }}>
                  Overall Score
                </p>
                <span className="text-7xl font-bold" style={{ color: '#ffffff' }}>
                  {results.overallScore}
                </span>
                <span className="text-2xl ml-1" style={{ color: '#4b5563' }}>/100</span>
              </div>

              {/* Dimension breakdown */}
              <div className="space-y-3">
                {Object.entries(results.dimensions).map(([name, val]) => (
                  <div key={name} className="flex items-center justify-between gap-4">
                    <span className="text-sm w-36 shrink-0" style={{ color: '#9ca3af' }}>{name}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#1f1f1f' }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${val * 10}%`,
                          backgroundColor: val >= 7 ? '#22c55e' : val >= 4 ? '#eab308' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-sm w-10 text-right font-mono" style={{ color: '#ffffff' }}>
                      {val}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-7 text-center text-sm" style={{ color: '#374151' }}>
        Built by Pedja Drazic&nbsp;·&nbsp;
        <a
          href="https://pedjadrazic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors duration-200"
          style={{ color: '#4b5563' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#9ca3af' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#4b5563' }}
        >
          pedjadrazic.com
        </a>
      </footer>
    </div>
  )
}
