'use client'

import { useState } from 'react'

export default function App() {
  const [prompt, setPrompt] = useState('')

  const wordCount = prompt.trim() === '' ? 0 : prompt.trim().split(/\s+/).length
  const isEmpty = prompt.trim() === ''

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
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste your prompt here..."
            rows={10}
            className="
              w-full
              rounded-2xl
              p-5
              text-base
              leading-relaxed
              resize-none
              transition-colors
              duration-200
              focus:outline-none
            "
            style={{
              backgroundColor: '#111111',
              border: '1px solid #222222',
              color: '#e5e7eb',
              caretColor: '#ffffff',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3f3f3f'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#222222'
            }}
          />

          {/* Word count */}
          <div className="mt-2 pr-1 text-sm text-right" style={{ color: '#4b5563' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>

          {/* Analyze Button */}
          <button
            disabled={isEmpty}
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
