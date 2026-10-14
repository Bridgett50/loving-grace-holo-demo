import type { KnowledgeDoc, Persona } from "./types";

/**
 * Private knowledge retrieval: BM25 over paragraph chunks of the owner's uploaded notes. Runs fully
 * locally (demo mode). With an LLM configured, the retrieved chunks become grounding context; the
 * twin still refuses to answer when nothing relevant is found instead of guessing.
 */

const STOP = new Set(
  "a an and are as at be but by can could do does for from has have how i if in into is it its me my of on or our so that the their them there these they this to was we were what when where which who why will with would you your about any".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

export interface Chunk {
  docId: string;
  title: string;
  text: string;
  tokens: string[];
}

export function chunkDocs(docs: KnowledgeDoc[]): Chunk[] {
  return docs.flatMap((d) =>
    d.content
      .split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((text) => ({ docId: d.id, title: d.title, text, tokens: tokenize(`${d.title} ${text}`) })),
  );
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

export function search(query: string, docs: KnowledgeDoc[], k = 3): Hit[] {
  const chunks = chunkDocs(docs);
  if (chunks.length === 0) return [];
  const q = [...new Set(tokenize(query))];
  const N = chunks.length;
  const avgdl = chunks.reduce((a, c) => a + c.tokens.length, 0) / N;
  const k1 = 1.4;
  const b = 0.75;
  const df = new Map<string, number>();
  for (const term of q) df.set(term, chunks.filter((c) => c.tokens.includes(term)).length);
  return chunks
    .map((chunk) => {
      let score = 0;
      for (const term of q) {
        const f = chunk.tokens.filter((t) => t === term).length;
        if (!f) continue;
        const n = df.get(term) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * chunk.tokens.length) / avgdl)));
      }
      return { chunk, score };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export interface GroundedAnswer {
  answer: string;
  sources: Array<{ docId: string; title: string }>;
  confident: boolean;
}

export const MIN_CONFIDENT_SCORE = 1.2;
/** Share of the question's key terms the best note must contain, so incidental word overlap ("two more") is not an answer. */
export const MIN_QUERY_COVERAGE = 0.4;

export function queryCoverage(question: string, chunk: Chunk): number {
  const q = [...new Set(tokenize(question))];
  if (!q.length) return 0;
  return q.filter((t) => chunk.tokens.includes(t)).length / q.length;
}

/** Extractive answer (no LLM). Speaks the best-matching note, or defers. */
export function answerFromKnowledge(question: string, docs: KnowledgeDoc[], persona: Pick<Persona, "deferralPhrase">): GroundedAnswer {
  const hits = search(question, docs, 2);
  if (!hits.length || hits[0].score < MIN_CONFIDENT_SCORE || queryCoverage(question, hits[0].chunk) < MIN_QUERY_COVERAGE) {
    return { answer: persona.deferralPhrase, sources: [], confident: false };
  }
  const best = hits[0].chunk.text.replace(/\s+/g, " ");
  const sentence = best.length > 280 ? `${best.slice(0, 277).trimEnd()}...` : best;
  return {
    answer: `From my notes: ${sentence}`,
    sources: [...new Map(hits.map((h) => [h.chunk.docId, { docId: h.chunk.docId, title: h.chunk.title }])).values()],
    confident: true,
  };
}
