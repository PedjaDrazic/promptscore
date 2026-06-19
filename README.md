# PromptScore

Free tool that scores any AI prompt out of 100.

**Live tool:** [promptscore.pedjadrazic.com](https://promptscore.pedjadrazic.com)

---

## What it does

Paste any AI prompt. PromptScore evaluates it across five dimensions and returns a score out of 100 with a rewritten version.

**The five dimensions:**

- **Role Definition** — Does the prompt assign a precise persona?
- **Context** — Does it provide goals, constraints, and background?
- **Specificity** — Are examples and details included?
- **Output Format** — Does it specify how the response should be structured?
- **Clarity** — Is the language clean and direct?

No account required. No API call for scoring. Instant.

---

## Tech stack

- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Vercel](https://vercel.com)
- [Tailwind CSS](https://tailwindcss.com)

---

## Run locally

```bash
git clone https://github.com/PedjaDrazic/promptscore.git
cd promptscore
yarn install
```

Copy `.env.example` to `.env.local` and fill in your Supabase credentials.

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Built by

[Pedja Drazic](https://pedjadrazic.com) — AI Workflow Architect. Systems over hacks.
