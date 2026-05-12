import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ─── Clients (lazy-safe) ───────────────────────────────────────────────────
const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      )
    : null

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// ─── CORS helper ──────────────────────────────────────────────────────────
function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return res
}
export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

// ─── Routing ──────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
  const path = (params?.path || []).join('/')
  if (path === 'setup-db') return handleSetupDb()
  return cors(NextResponse.json({ message: 'PromptScore API' }))
}

export async function POST(request, { params }) {
  const path = (params?.path || []).join('/')
  if (path === 'save-lead')      return handleSaveLead(request)
  if (path === 'improve-prompt') return handleImprovePrompt(request)
  return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }))
}

// ─── Setup DB ─────────────────────────────────────────────────────────────
async function handleSetupDb() {
  if (!supabase) {
    return cors(NextResponse.json({ error: 'Supabase not configured' }, { status: 500 }))
  }

  // Check if table already exists
  const { error: checkErr } = await supabase.from('leads').select('id').limit(1)
  if (!checkErr) {
    return cors(NextResponse.json({ success: true, message: 'Table ready.' }))
  }

  const sql = `
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  score int4 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'allow_anon_insert'
  ) THEN
    CREATE POLICY "allow_anon_insert" ON public.leads FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;`.trim()

  // Try Supabase Management API (requires PAT — will gracefully fail with anon key)
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1]
  if (ref) {
    try {
      const r = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sql }),
        }
      )
      if (r.ok) return cors(NextResponse.json({ success: true, message: 'Table created.' }))
    } catch (_) {
      // Expected — anon key can't use management API
    }
  }

  // Return SQL for manual execution in Supabase SQL Editor
  return cors(
    NextResponse.json({
      success: false,
      needsManualSetup: true,
      sql,
    })
  )
}

// ─── Save Lead ────────────────────────────────────────────────────────────
async function handleSaveLead(request) {
  try {
    const { email, score } = await request.json()
    if (!email) {
      return cors(NextResponse.json({ error: 'Email required' }, { status: 400 }))
    }
    if (!supabase) {
      return cors(NextResponse.json({ success: false, error: 'DB not configured' }))
    }

    const { error } = await supabase
      .from('leads')
      .insert({ email: email.toLowerCase().trim(), score: score ?? 0 })

    if (error && error.code !== '23505') {
      console.error('Supabase insert error:', error.message)
    }
    // Always return success — lead save is non-blocking for UX
    return cors(NextResponse.json({ success: true }))
  } catch (err) {
    console.error('save-lead error:', err)
    return cors(NextResponse.json({ success: true }))
  }
}

// ─── Improve Prompt ───────────────────────────────────────────────────────
async function handleImprovePrompt(request) {
  try {
    const { prompt } = await request.json()
    if (!prompt) {
      return cors(NextResponse.json({ error: 'Prompt required' }, { status: 400 }))
    }
    if (!anthropic) {
      return cors(NextResponse.json({ error: 'Anthropic not configured' }, { status: 500 }))
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system:
        'You are a prompt engineering expert. The user will give you a prompt. Rewrite it to be significantly better. Preserve the original intent exactly. Improve: role definition, context, specificity, output format, and clarity. Return ONLY the improved prompt. No explanation. No preamble. Just the rewritten prompt.',
      messages: [{ role: 'user', content: prompt }],
    })

    const improvedPrompt = message.content[0]?.text
    if (!improvedPrompt) throw new Error('Empty response from Claude')

    return cors(NextResponse.json({ success: true, improvedPrompt }))
  } catch (err) {
    console.error('improve-prompt error:', err.message)
    return cors(
      NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
    )
  }
}
