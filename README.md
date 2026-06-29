# Build a Personal Assistant in TypeScript

[![personal-assistant-github@2x](https://github.com/user-attachments/assets/6b7f0ddb-2f74-4bbf-817a-c2c20a67a246)](https://www.aihero.dev/cohorts/build-your-own-ai-personal-assistant-in-typescript)


Repository for the [5-day cohort course](https://www.aihero.dev/cohorts/build-your-own-ai-personal-assistant-in-typescript) on building production AI systems with retrieval, memory, evals, and human-in-the-loop patterns.

## Prerequisites

- [Node.js](https://nodejs.org/en/download) (version 22 or higher)
- [pnpm](https://pnpm.io/) (recommended) or npm/yarn/bun
- [Varlock](https://varlock.dev/) (installed by this repo)
- AI SDK v5 knowledge (prerequisite)
- API keys for AI providers:
  - [OpenAI](https://platform.openai.com/api-keys) (GPT-4, GPT-3.5)
  - [Anthropic](https://console.anthropic.com/) (Claude)
  - [Google AI Studio](https://aistudio.google.com/apikey) (Gemini)

## Quick Start

1. **Clone this repository:**

```bash
git clone https://github.com/mattpocock/cohort-002-skill-building.git
cd cohort-002-skill-building
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Configure your environment:**

```bash
pnpm env:check
```

4. **Use the local Varlock profile.**

The committed `.env.jb` profile contains portable resolver refs for
JB's local dev secrets imported with `varlock keychain import`. Each
Keychain item uses service `varlock` and account
`aihero-cohort-002-skill-building:jb:<ENV_VAR_NAME>`. When creating
the Keychain item, add the repo path as a comment/label if your
Keychain tool supports it:
`/Users/bjesuiter/Develop/bjesuiter/aihero-cohort-002-skill-building`.
If a Keychain access prompt appears, approve it for the scoped local
dev item.

The default local scripts set `DEV_ENV=jb` inline, so a fresh clone does
not need a local `.env.local` selector for normal exercise commands.

```dotenv
# Local dev secret for GOOGLE_GENERATIVE_AI_API_KEY.
# Project slug: aihero-cohort-002-skill-building.
# Profile: jb.
GOOGLE_GENERATIVE_AI_API_KEY=keychain(service="varlock", account="aihero-cohort-002-skill-building:jb:GOOGLE_GENERATIVE_AI_API_KEY")

# Local dev secret for ANTHROPIC_API_KEY.
# Project slug: aihero-cohort-002-skill-building.
# Profile: jb.
ANTHROPIC_API_KEY=keychain(service="varlock", account="aihero-cohort-002-skill-building:jb:ANTHROPIC_API_KEY")

# Local dev secret for OPENAI_API_KEY.
# Project slug: aihero-cohort-002-skill-building.
# Profile: jb.
OPENAI_API_KEY=keychain(service="varlock", account="aihero-cohort-002-skill-building:jb:OPENAI_API_KEY")

# Local dev secret for OPENCODE_ZEN_API_KEY.
# Project slug: aihero-cohort-002-skill-building.
# Profile: jb.
OPENCODE_ZEN_API_KEY=keychain(service="varlock", account="aihero-cohort-002-skill-building:jb:OPENCODE_ZEN_API_KEY")
```

For this course, configure at least one model provider key. Gemini is
the default in most exercises.

Then run `pnpm env:load` once to let Varlock resolve the `jb` profile's
local Keychain entries. Production and CI should set the same exported
env variable names directly in the platform secret manager; they should
not depend on local macOS Keychain items.

## Course Structure

### Day 1-2: Retrieval (Sections 01-04)

- BM25 keyword search, embeddings, rank fusion, query rewriting
- Chunking (fixed-size vs structural), reranking
- Agentic search, metadata-first patterns

### Day 3: Memory (Sections 05-06)

- Semantic and episodic memory
- Working memory with infinite conversations
- CRUD operations on memory store

### Day 4: Evals (Sections 07-08)

- Evalite framework testing
- Deterministic scorers, LLM-as-judge
- A/B testing models and prompts

### Day 5: Human-in-the-Loop (Sections 09-10)

- Approval flows for destructive actions
- Thread-scoped permissions
- MCP server integrations

## Running Exercises

Start by running `pnpm dev`:

```bash
pnpm dev
```

This runs the exercise launcher through
`DEV_ENV=jb varlock run -- ...`, then allows you to choose between the
different course sections.

You can also run `pnpm exercise <exercise-number>` to jump to a specific exercise.

## Exercise Structure

```
exercises/
├── 01-retrieval-skill-building/ (6 exercises)
├── 02-retrieval-project-work/ (3 exercises)
├── 03-retrieval-day-2-skill-building/ (5 exercises)
├── 04-retrieval-day-2-project-work/ (4 exercises)
├── 05-memory-skill-building/ (4 exercises)
├── 06-memory-project-work/ (3 exercises)
├── 07-evals-skill-building/ (6 exercises)
├── 08-evals-project-work/ (2 exercises)
├── 09-human-in-the-loop-skill-building/ (6 exercises)
└── 10-human-in-the-loop-project-work/ (3 exercises)
```

Each exercise follows this learning structure:

### `problem/` folder

- **Your coding playground** - Start here!
- Contains `readme.md` with detailed instructions
- Code files with `TODO` comments for you to implement

### `solution/` folder

- **Reference implementation** - Check when you're stuck
- Complete, working code for each exercise
- Great for comparing approaches and learning best practices

### `explainer/` folder

- **Deep dives** - Additional explanations and concepts
- Extended walkthroughs of complex topics
- Perfect for reinforcing your understanding

## Tech Stack

- **AI SDK v5** - Core LLM interactions
- **React 19 + Vite** - Frontend
- **Hono** - Backend API framework
- **okapibm25, embeddings** - Retrieval techniques
- **Evalite** - Testing framework
- **OpenAI, Anthropic, Google** - AI providers

## Datasets

- `datasets/emails.json` - Email corpus (75-547 emails)
- `datasets/total-typescript-book.md` - TypeScript documentation
- Custom dataset support via Gmail mbox export

## Getting Help

1. **Check the solution** - Each exercise has a completed version
2. **Verify your setup** - Ensure API keys and dependencies are correct
3. **Visit the course** - Full explanations available on [aihero.dev](https://www.aihero.dev/cohorts/build-your-own-ai-personal-assistant-in-typescript)
