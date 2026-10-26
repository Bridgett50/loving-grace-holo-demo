# Second Seat: Meta Model Playbook (researched Oct 26, 2026)

Sources were read on Oct 26, 2026: dev.meta.ai/docs (models, quickstart, pricing-rate-limits, structured-output, reasoning, protocols/chat-completions, protocols/responses, image-understanding, tool-calling, prompt-caching, error-handling, media-segmentation, sam/*, speech-to-text, api-reference/voice/transcribe, image-generation, muse-glimmer/*, muse-spark-open/*, muse-code/*); dev.meta.ai/models/muse-wonder; huggingface.co/meta-models/Muse-Glimmer-30B (model card + API); docs.baseten.co/inference/model-apis/overview; baseten.co/library/muse-spark-open; modal.com/library/meta/muse-spark-open; dev.meta.ai/events/global-hackathon.
"Not documented" means I could not find it in those official sources. **Cerebral Valley participant resources are not public.** I found no public page, so anything that comes only from Discord is labeled "Discord, unverified".


## Oct 26 v2 update (re-verified today)
- **Live check (1 free call, `GET /v1/models`, key not printed):** our team sees exactly 9 IDs: muse-wonder-1.0, sam-3.1, muse-spark-1.3, muse-spark-1.3-contributor, muse-spark-1.2, muse-spark-1.2-contributor, muse-spark-1.1, muse-image-1.0, muse-voice-transcribe-1.0. This matches dev.meta.ai/docs/models. No Glimmer or Spark Open on the Model API (those are open weights only). Note: the docs use env `MODEL_API_KEY`, but our box uses `META_API_KEY`. Map one to the other in config.
- **Baseten:** the library page and docs still show only `meta-models/muse-spark-open`. **`-1026` is still unverified.** Docs confirm no structured output/JSON mode for Muse Spark Open, plus tools, audio input, and ~60 req/min per `x-session-affinity` session.
- **Fireworks:** a catalog search for "muse" today returned no Muse models (only DeepSeek/GLM/MiniMax/Qwen/etc.), even though Meta's partner list names `accounts/fireworks/models/muse-spark-open`. **Do not plan on Fireworks**, because neither Glimmer nor Spark Open appears in its catalog. Fine-tuning and serverless pricing for Meta models: not verifiable.
- **Meeting audio:** Meta's only ASR is Muse Voice Transcribe (diarization A/B, turn timestamps, 10 min / 32 MB files). Spark 1.3 audio is degraded (docs say to use 1.2 or Voice Transcribe instead).

### Which model does which job (one page)
| Job | Model | Key params |
|---|---|---|
| Decisions/action items brief with cited lines | muse-spark-1.3 (Standard) | Chat `response_format` json_schema strict:true; `developer` role; reasoning_effort medium; max_completion_tokens ~16k; stream |
| Pressure-tactic flags (canonical labeler) | muse-spark-1.3 | same, effort low/medium, one batched call |
| Support judge (is each item backed by its cited line?) | muse-spark-1.3 | effort medium; entry + span only |
| PII redaction before any cloud call (Open Weights bonus) | Muse Glimmer 30B on Modal A100-80GB | temp 1.0/top_p 0.95/top_k 64; never temp 0; validate JSON in code |
| Screenshot slide/whiteboard regions | sam-3.1 (Responses) + Spark picks the noun phrase | one noun phrase per call; 0 matches → full-frame cite |
| Optional audio → transcript | muse-voice-transcribe-1.0 | DIARIZATION; ≤10 min WAV; conflicts with the privacy claim |
| Optional adjudicator | muse-wonder-1.0 | first to cut; ~3-5x cost |
| Optional fallback/cross-check | Muse Spark Open (Baseten `meta-models/muse-spark-open`) | always set reasoning_effort (default xhigh); no schema enforcement |
| Skip | Muse Image, contributor IDs, Fireworks | — |

## 0. Rules that apply to every Model API call (api.meta.ai)
- Base URL `https://api.meta.ai/v1`, `Authorization: Bearer $MODEL_API_KEY`, OpenAI-SDK compatible. Endpoints: `/chat/completions`, `/responses`, `/messages` (Anthropic format, base `https://api.meta.ai`), `/files`, `/images/generations|edits`, `/asr/transcribe`, `wss://api.meta.ai/v1/asr/realtime`, `/models`.
- **Roles (Chat Completions):** `developer` has the highest precedence you can set. `system` is accepted for compatibility at the same level, so it gets no extra precedence. **Prefer `developer`.** (The structured-output doc example uses `system`. Either works, but we standardize on `developer`.)
- **Sampling:** temperature defaults to 1.0 and top_p to 1.0. Muse Spark is "tuned to run at the default… leave it unset." To make output more focused, write clearer instructions instead of lowering temperature. Never change both. `top_p: 0` returns 400.
- **seed:** best effort only. "Determinism is not guaranteed."
- **Output cap:** Chat Completions uses `max_completion_tokens` (`max_tokens` is a deprecated alias). Sending `max_output_tokens` to Chat Completions returns 400. On Responses, `max_output_tokens` has a minimum of 16. **Reasoning tokens count against this cap and are billed as output.** Input plus the requested output must fit inside the context window, otherwise you get 400.
- **n:** only 1. **logprobs:** returns 400 on Spark and Wonder (they are reasoning models). `modalities`/audio output: 400.
- **Structured output:** Chat uses `response_format: {type:"json_schema", json_schema:{name, schema, strict}}`. Responses uses `text.format`. **Sending a parameter from the wrong endpoint returns 400.** Decoding is constrained, so output conforms to the schema. `strict` defaults to **false**. With `strict:true`: the root must be a plain object (no top-level anyOf/oneOf/allOf/enum/not); `allOf`/`oneOf` are banned everywhere (`anyOf` is OK below the root); every object needs `additionalProperties:false`; and `required` must list every property (model optional fields as nullable). Limits: nesting depth 10, 5,000 properties, 120,000 chars of total strings. Recursive (`$ref` cycle) schemas return 400.
- **Tool calling:** OpenAI function format. `parallel_tool_calls` defaults to true. Names must match `^[a-zA-Z0-9_.-]+$`. The API validates tool-call replay pairing more strictly than other providers.
- **Images (Spark/Wonder):** supported on Chat Completions (`image_url`, a URL or base64 data URL) and on Responses (`input_image`, the recommended path). Max **50 images/request**, 50 MB inline, 1 GiB via the Files API. A PDF contributes its first 50 page-images.
- **Prompt caching:** automatic prefix cache. Put the stable developer prompt and schema first and the variable transcript last. Read `cached_tokens`.
- **Timeouts:** non-streaming requests get a 504 when the whole response is too slow. Streaming requests only need the first event to arrive in time. **Stream long-reasoning calls.**
- **Errors:** retry 429/5xx with exponential backoff plus jitter, and honor `Retry-After`. Read the `x-ratelimit-*` headers. Do not retry a 400 unchanged.
- **Hidden steering:** Meta injects a small, unbilled system prompt into every request.
- **Rate limits are per team, not per key.**

## 1. Muse Spark: the workhorse
- **IDs:** `muse-spark-1.3` (recommended, Standard mode), `muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-spark-1.2-contributor`, `muse-spark-1.1`.
- **Endpoints:** Responses, Chat Completions, Messages. Input: text, image, video, audio, PDF. Output: text.
- **Context:** 1,048,576 tokens, with no long-context premium. **Max output tokens per request: not documented** (described as "model-dependent").
- **Structured output / JSON / tools:** yes / yes / yes (including parallel calls). Search grounding (`web_search`) costs $2.50 per 1k queries. Second Seat does not use it.
- **Reasoning:** `reasoning_effort` (Chat) or `reasoning.effort` (Responses): minimal | low | medium | high | xhigh | max. `"none"` returns 400. `max` works on 1.3 Standard only, not on contributor. If you omit it, the model reasons at a level it picks. Reasoning summaries are available on Responses only.
- **Prompting guidance:** instructions go in `developer`; keep default sampling; get focus from clear instructions; caching-friendly ordering. Official prompting guidance specific to hosted Muse Spark beyond this: not documented. The Muse Spark Open guide's system-prompt template (rules first: Objective, Priority rules, Scope check, Decision procedure, Output, Completion) is the closest official pattern, and we reuse it.
- **Pricing per 1M tokens (Standard):** input $1.25, cached $0.15, output $4.25. Contributor: $0.10 / $0.002 / $0.20.
- **Rate limits:** 3,000 RPM and 4M TPM (contributor: 150 RPM, 3M TPM).
- **Gotchas:** (a) **Contributor mode lets Meta train on your prompts. Never use it with real meeting data.** It is fixtures/synthetic only, if at all. (b) **Audio input on 1.3 is "not fully supported" and quality may degrade.** Never send audio to 1.3. (c) Reasoning eats the `max_completion_tokens` budget. If the cap is too low you get an empty or truncated answer, so cap generously (for example 16k) and log `reasoning_tokens`. (d) Seed is not deterministic, so freeze the prompt and record responses as fixtures. (e) There are no logprobs, so confidence must be a schema field and not a token probability.
- **Job in Second Seat:** (1) the evidence-linked brief (structured output; `reasoning_effort:"medium"`; fixed seed; `developer` role); (2) the Persuasion Shield tactic/ask/target/span classifier (the ONE canonical labeler; the tool map's "second commitment classifier" is this same call) (one batched structured call per meeting; `low` or `medium`); (3) the semantic support judge (entry plus cited span only → supported/partial/unsupported; `medium`); (4) the SAM concept picker per frame (image input; `low`); (5) the second commitment classifier (it can only add flags). Model: `muse-spark-1.3`, Standard mode.

## 2. Muse Wonder and Muse Wonder Full
- **IDs:** `muse-wonder-1.0` (Model API, Standard only, preview). **Muse Wonder Full has no API ID.** It is available only in Muse Code on the Power Usage and Maximum Usage subscriptions. `reasoning_effort:"max"` on Wonder does **not** select Full.
- **Endpoints/inputs:** the same as Spark (same request shape, so switching is just a model ID change). Context is 1,048,576 tokens. Max output: not documented.
- **Structured output and tools:** yes. Reasoning runs minimal through max.
- **Pricing per 1M tokens:** input $4.00, cached $0.20, output $20.00. That is about 3.2x Spark on input and 4.7x on output. There is no Contributor mode on the API.
- **Rate limits:** 3,000 RPM and 4M TPM.
- **Gotchas:** it is in preview; it is not available in South Korea; it costs about 3–5x Spark; and Full cannot be called from code.
- **Job:** optional adjudicator (Phase 08, the first thing to cut). It makes one pass over flagged and owner-review entries and can only add flags. Wonder Full is skipped in the product. It is usable only as a coding agent inside a Muse Code subscription.

## 3. Muse Image
- **ID:** `muse-image-1.0`. Endpoints: Responses (multi-turn), `/v1/images/generations`, `/v1/images/edits`. Input: text and image. Output: an image.
- **Params:** `size` "WxH" sets the aspect ratio only (more than 16:1 returns 400); `reasoning_strength` high (default) or low; `output_format` webp/png/jpeg; built-in web search and shell. **Unknown fields such as `seed` return 400.**
- **Pricing:** $0.01 per image. Rate limit: 150 RPM.
- **Job:** **skip.** Generated-image recaps are out of pitch scope. It *could* be used only for marketing assets (thumbnails for the viral clip), never inside the product.

## 4. Muse Voice Transcribe
- **ID:** `muse-voice-transcribe-1.0`. Endpoints: `POST /v1/asr/transcribe` (multipart: a `request` JSON part plus an `audio` part; WAV; **10 min max, 32 MB max**) and `wss://api.meta.ai/v1/asr/realtime` (auth goes in the handshake frame, not the header).
- **Modes:** PUSH_TO_TALK (default), ENDPOINTING, DIARIZATION (speaker labels A/B). 25 languages with code-switching; vocabulary biasing. **Turn-level timestamps only**: no word timestamps, no confidence scores, no emotion detection.
- **Pricing:** $0.18 per audio hour. No Contributor mode; ZDR is at the same price.
- **Limits:** 256 concurrent streams and 16,000 streams per hour. A rejected realtime stream closes with 1013; the file endpoint returns 429. There are no `x-ratelimit` headers.
- **Gotchas:** `speechEnd` is not the transcript (wait for `speechComplete`); turns can overlap, so key on `turnId`; speaker labels are A/B, not names.
- **Job:** **skipped in the core build.** Transcripts are owner-supplied, and live capture is out of scope. Optional in the Phase 02 normalizer: turn an owner-uploaded WAV of 10 minutes or less into INPUT_FORMAT. **This conflicts with the "raw audio never leaves our server" claim**, because it sends audio to Meta's API. If the privacy story is used, do not use Voice Transcribe on real audio. Use a provided transcript, or local ASR that would need verifying (Glimmer has no audio input).

## 5. SAM 3.1
- **ID:** `sam-3.1`. Called only through `POST /v1/responses`. One user message holds an `input_text` (a noun phrase **or** box/point prompts, never both) plus one `input_image`/`input_video`. Streaming is recommended for video and optional for images.
- **Output:** special-token text in `output_text`: `<0f>0<|box;x1;y1;x2;y2;w;h|><|mask;…|>`. x2 and y2 are **inclusive**. Parse it with `@meta-sam/parser` (`parseImageStream`, `decodeMaskToRaster`). The metadata option is `mask_encoding:"one_bit"`.
- **Prompting:** a short concrete noun phrase, **one concept per request** ("bus, bicycle" returns zero matches; "and" segments only one concept). No commands or questions, no negation, OR, or spatial phrasing. Filter by position in code. Attributes narrow matches predictably.
- **Zero matches** is an empty `output_text` plus `response.completed`. That is a normal result, not an error.
- **Box prompts:** `w` and `h` must equal the media's displayed pixel size. A mismatched aspect ratio returns 400.
- **Pricing:** $2.50 per 1,000 images; video is $0.20 per 1,000 frames with a 50-frame minimum. Rate limit: 3,000 RPM.
- **Structured output/tools:** not applicable (fixed output grammar).
- **Job:** Phase 07. Find "slide"/"document"/"whiteboard" regions in owner screenshots, with Muse Spark picking the concept. Any frame that gets zero matches or fails the spot-check falls back to a full-frame citation.

## 6. Muse Glimmer 30B (open weights)
- **Repos:** `meta-models/Muse-Glimmer-30B` (bf16, about 60 GB, transformers ≥ 5.15, not gated, Apache-2.0), `-GGUF` (Q4_K_M about 17 GB for 24 GB VRAM; Q4_K_XL about 20 GB for 32 GB; mmproj vision projector 1.4 GB), `-assistant` (DFlash drafter), `-ExecuTorch-PTE`.
- **Model:** dense, 29.6B parameters, text and image input, text output. **128K context by default** (the card says 131,072+). Max output: not documented. Knowledge cutoff Jan 4, 2026. Up to 4,096 visual tokens per image. **No audio input.**
- **Serving:** vLLM `vllm/vllm-openai:muse-glimmer` image, `--tool-call-parser muse_glimmer --reasoning-parser muse_glimmer --enable-auto-tool-choice --generation-config auto`. The vLLM recipe budgets **72 GB VRAM** for bf16. Also SGLang, llama.cpp, Ollama, LM Studio, and Unsloth. Hosted option: Together AI `meta-models/Muse-Glimmer-30B`.
- **Prompting:** always use `apply_chat_template`. The `system` role is supported. Be specific about the task and state constraints up front. Reasoning is set with the template arg `reasoning_strength` (low/medium/high/xhigh; default high). Tools use the native ATEM format through `tools`.
- **Sampling:** temp 1.0, top_p 0.95, top_k 64. **Don't run it greedy (temperature 0).** If you set sampling, send all three values.
- **Structured output:** the docs do not name JSON-schema/guided decoding for Glimmer. vLLM's generic guided decoding probably works but is **not documented for this model. Verify it in the spike** and validate the JSON in code.
- **Pricing:** free weights; you pay for GPU time. Modal and Baseten pricing for Glimmer: **not documented** (I found no Glimmer listing on either). Rate limits: yours to set.
- **Gotchas:** long reasoning traces need streaming; never stop on `<|eom|>`; the bf16 build needs about 72 GB, so use a single 80 GB GPU or a quantized build.
- **Job:** the private layer (Phase 04/05). It does PII redaction (and an optional tactic pre-label, `source:"glimmer"`) on our own GPU (Modal or Baseten credits), so Muse Spark only sees redacted text. **Round 2: Muse Spark is the canonical tactic classifier; Glimmer is NOT the labeler.** Screenshots are PII-masked on the server before going to SAM 3.1/Spark. If hosting isn't ready, use a mock behind the same interface, marked `TODO(glimmer-hosting)`. This targets the Open Weights bonus.

## 7. Muse Spark Open
- **Weights:** HF `meta-models/Muse-Spark-Open-816B-A42B` (BF16 about 1.65 TB on 8×B300; `-NVFP4` about 537 GB on 4×B300). Muse Model License plus the AUP, with a license accept step for the Meta download. 816B MoE, 42B active. Text, image, video, and audio input. 1,048,576 context. Knowledge cutoff 2026-01-04.
- **Hosted IDs (official):** Baseten `meta-models/muse-spark-open` at `https://inference.baseten.co/v1`; Together `meta-models/muse-spark-open`; Fireworks `accounts/fireworks/models/muse-spark-open`; Groq and Nebius `meta-models/muse-spark-open`; Modal Shared Endpoint (model ID `meta-models/Muse-Spark-Open-816B-A42B`; the endpoint URL is in Modal's guide). **The `meta-models/muse-spark-open-1026` string in our brief (from Discord) does not appear in any official doc.** Confirm it with `GET https://inference.baseten.co/v1/models` before use, and fall back to `meta-models/muse-spark-open`.
- **Pricing:** Baseten and Modal both list $1.25 input / $0.15 cached / $4.25 output per 1M tokens. Rate limits: not documented on the pages I read (Baseten points to its "Pricing and limits" page).
- **Reasoning:** `reasoning_effort` low (8) / medium (32) / high (256) / **xhigh (512, the default)**. `none` and `max` are rejected, and reasoning cannot be turned off. A `Reasoning strength: N` line in the system prompt overrides the parameter. **The default is the most expensive level, so always set it.**
- **Roles:** `system` or `developer` as the first message. Your text is appended to the template's own system block. Put the must-hold rules first.
- **Structured output:** self-hosted vLLM/TRT-LLM supports `response_format` (json_object or json_schema through xgrammar). **The Baseten docs say Muse Spark Open does NOT support structured outputs or JSON mode on Baseten.** Tools and reasoning are supported there. Baseten also ignores logprobs, rejects `n>1` with 400, and neither seed nor temp 0 is reproducible.
- **Sampling:** temp 1.0, top_p 1.0.
- **Job:** an optional open-weights cross-check of support grading, or an outage fallback (Phase 08 or skip). On Baseten, parse the JSON from content and validate it in code, because there is no schema enforcement. It is the same model family as Spark, not an independent family, and it is never the "second reader" (that is a person).

## 8. Muse Code
- **Install:** `curl -fsSL https://dev.meta.ai/install.sh | sh` gives the `muse` binary. Interactive `muse`; headless `muse exec "<prompt>"`; `muse serve` with the SDK `@muse-code/sdk`.
- **Auth:** browser sign-in or `META_API_KEY` (note: **not** `MODEL_API_KEY`). `muse auth set`. An API key takes priority over a browser sign-in.
- **Default model:** `muse-spark-1.2`. Set 1.3 or Wonder explicitly in the configuration.
- **Billing:** pay-as-you-go at API rates, or subscriptions (Everyday, High 5x, Power 20x with Wonder Full, Maximum 80x). Subscription dollar prices: not documented on the pages I read. **Subscriptions default to Contributor mode** (Meta trains on your code and prompts). Turn it off for the private repo or any real data. Muse Wonder Full is only here.
- **Safety:** approvals and an OS sandbox are on from the first run.
- **Job:** a coding agent alongside Cursor for phases 01–08. Note in commits which agent did what (it is "Use of Meta AI tooling" evidence).

## 9. Llama / Prompt Guard 2
Not covered by the dev.meta.ai model list. The tool map leaves them on the cut list.

## Top 5 gotchas (ranked for Second Seat)
1. **Contributor mode trains on your content.** This covers the `-contributor` IDs and Muse Code subscriptions, which default to it. Real meeting data must use Standard mode only (Charter: Stewardship).
2. **Reasoning tokens consume `max_completion_tokens`, and Spark Open defaults to xhigh.** A tight cap leaves an empty answer (`finish_reason: length`), and a missing effort setting overspends. Always set the effort, cap generously, stream, and log reasoning tokens against the $5/day guard.
3. **Structured-output parameters are endpoint-specific, and strict mode is off by default.** Use `response_format` on Chat and `text.format` on Responses. Set `strict:true` and design the schema to the strict subset: every object `additionalProperties:false`, every key required, no oneOf/allOf. That means the brief's `Citation` union must use `anyOf` below the root (or a flat `kind` + nullable fields).
4. **Baseten's Muse Spark Open has no structured output, and the `-1026` slug is unverified.** The official slug is `meta-models/muse-spark-open`.
5. **SAM: one noun phrase per request, and zero matches is not an error.** No lists or commands. Box w/h must match the media pixels. x2/y2 are inclusive. Plus: **Muse Spark 1.3 audio is degraded**, and **Glimmer has no audio input**, so the "raw audio never leaves our server" story needs a local ASR path or owner-supplied transcripts.

## Not documented (as of Oct 26)
(Round 2: judging criteria/weights/bonuses are now CONFIRMED: Impact, Meta AI Tooling, Technical Depth & Execution, Demo, equal weight; Open Weights $10K, Agentic $5K, Most Viral $20K, Community $10K.)
Max output tokens for Spark, Wonder, and Glimmer; official Muse Spark (hosted) prompting guide beyond role and sampling advice; Glimmer JSON-schema decoding support; Glimmer pricing on Modal and Baseten; Spark Open rate limits on Baseten and Modal; the `muse-spark-open-1026` slug; Muse Code subscription prices; Cerebral Valley participant resources (not public); hackathon credit amount ($150 appears only in a search summary, not confirmed on the page).

## Glimmer hosting decision (researched Oct 26, 2026)
Sources read on Oct 26, 2026: the HF model card plus the HF API (model search and inferenceProviderMapping), modal.com/pricing, baseten.co/pricing, baseten.co/library, fireworks.ai/models?search=glimmer, and huggingface.co/docs/inference-providers/pricing. Anything marked **UNVERIFIED** was not confirmed in those sources.

**Facts**
- License: Apache-2.0, not gated. Official artifacts: BF16, "4-bit quantized weights (2 variants)" (GGUF K-Quant-Dynamic about 0.2% degradation for 32 GB, K-Quant-17GB about 1.0% for 24 GB), the DFlash drafter, and ExecuTorch. **There is no smaller official Glimmer variant; 30B is the only size.** The official 4-bit builds are GGUF (llama.cpp), not vLLM-native.
- Well-known third-party quants (**not Meta**): `RedHatAI/Muse-Glimmer-30B-FP8-block` (vLLM/llm-compressor, about 46k downloads), `RedHatAI/Muse-Glimmer-30B-INT4`, `RedHatAI/Muse-Glimmer-30B-NVFP4` (Blackwell only), `nvidia/Muse-Glimmer-30B-NVFP4`, `unsloth/Muse-Glimmer-30B-GGUF`, `bartowski/Muse-Glimmer-30B-GGUF`. **Avoid** the heretic/abliterated/uncensored repos.
- Modal (per second, list price): H100 $0.001097 (= $3.95/hr); A100-80GB $0.000694 (= $2.50/hr); L40S 48 GB $0.000542 (= $1.95/hr). Billing covers load time plus a 60 s default idle window, then scales to zero. The Starter plan includes $30/month of compute. Region selection is 1.15–1.75x and non-preemptible is 3x, so avoid both.
- Baseten dedicated (per minute): A100 80 GB $0.06667 (= $4.00/hr); H100 $0.10833 (= $6.50/hr). Idle time is not billed. **Baseten's model library has no Glimmer** (only Muse Spark Open), so it would need a custom Truss deploy.
- Fireworks: **Glimmer is not listed** in its model catalog search, so the $25 does not help with Glimmer.
- HF Inference Providers: Glimmer is **live on Together, Featherless AI, and DeepInfra** (conversational). **Free HF accounts get $0 monthly credits** (PRO gets $2/month), so this path is not free. Per-token prices: UNVERIFIED (not read).
- HF Inference Endpoints: dedicated GPU, paid. No free credits apply. Hourly price: UNVERIFIED (page not read).

**Cost for about 20 GPU-hours (GPU only; CPU/RAM add a little)**
| Option | $/hr | 20 h | Fits? |
|---|---|---|---|
| Modal L40S + RedHatAI FP8-block | 1.95 | ~$39 | yes, but **the fit and the vLLM path for FP8 on L40S are UNVERIFIED** |
| **Modal A100-80GB, BF16 (official)** | 2.50 | **~$50** | yes (the 72 GB recipe fits in 80 GB) |
| Modal H100, BF16 | 3.95 | ~$79 | yes, tight margin |
| Baseten A100 80 GB, BF16 | 4.00 | ~$80 | yes, tight margin |
| Baseten H100 | 6.50 | ~$130 | **NO, over $100** |
Cold start: **UNVERIFIED** for every option (no provider documents a figure for Glimmer). Estimate: about 60 GB of weights plus vLLM startup, likely several minutes on the first boot, faster once the weights are cached in a Modal Volume. **Measure it in the spike.** Budget the cold starts inside the 20 h.

**Decision**
- **PRIMARY: Modal, 1x A100-80GB, official BF16, vLLM, scale-to-zero.** About $50 for 20 h, leaving about 50% headroom under $100. This depends on the Modal account being approved.
  1. Once the account is approved, `pip install modal && modal setup`. Set a **workspace budget/spend limit at or below the credit amount** and confirm no card is charged beyond the credits.
  2. Create a Volume (`glimmer-weights`) and pre-download `meta-models/Muse-Glimmer-30B` into it with a CPU-only function, so weights load from the Volume instead of from HF on every cold start.
  3. Build the image from `vllm/vllm-openai:muse-glimmer` (see §6). Add an `@app.function(gpu="A100-80GB", volumes=..., scaledown_window=300, timeout=...)` with `@modal.web_server` that runs `vllm serve /weights --tool-call-parser muse_glimmer --reasoning-parser muse_glimmer --enable-auto-tool-choice --generation-config auto --max-model-len 32768` (a lower context length keeps the KV cache within 80 GB; **this value is our choice and UNVERIFIED**). Set `min_containers=0`.
  4. Run `modal deploy`. Protect the endpoint (proxy auth/token). Point Second Seat's Glimmer client at the URL. Log cold-start time and tokens/s.
  5. Keep the warm window short (for example 300 s). Pre-warm about 10 minutes before the demo. Check usage daily and stop at about $80.
- **FALLBACK: Baseten, custom Truss, 1x A100 80 GB, BF16, scale-to-zero** (about $80 for 20 h, a tighter margin, so cap it at about 15 h). Use this if Modal is not approved or the $100 Baseten credit arrives first. Steps: `pip install truss`; write a Truss config using the same vLLM image/command (custom server), `resources.accelerator: A100`, autoscaling min replicas 0, and a short scale-down delay; `truss push`; confirm the credit balance and that no card is on file for overage (**Baseten billing behavior beyond credits: UNVERIFIED**).
- **Cheaper experiment (optional):** Modal L40S with `RedHatAI/Muse-Glimmer-30B-FP8-block` (third-party, flagged) at about $39 for 20 h, if the spike shows it loads and quality holds.
- **Last-resort (not free):** HF Inference Providers (Together/DeepInfra/Featherless) needs purchased credits or PRO. Use it only with explicit approval. The mock behind `TODO(glimmer-hosting)` stays as the zero-cost fallback.
- Fireworks $25: not usable for Glimmer.
