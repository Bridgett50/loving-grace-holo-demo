#!/usr/bin/env python3
"""Mechanical citation check for the Oct 15 Muse Spark brief.
Verifies, for every brief entry: (1) the cited timestamp exists in the input
transcript, and (2) lexical support - the share of the entry's content words
that appear in the cited transcript line. This is a structural/lexical check,
not semantic proof; semantic support needs human inspection of held-out cases.
"""
import re, sys
STOP = set("the a an to of and or in on for by with was were is are it its as at from that this".split())
def words(s): return [w for w in re.findall(r"[a-z']+", s.lower()) if w not in STOP and len(w) > 2]
src = open(sys.argv[1]).read()
transcript = {}
for m in re.finditer(r"^\[(\d{2}:\d{2})\]\s*([^:\n]+):\s*(.+)", src, re.M):
    transcript[m.group(1)] = (m.group(2).strip(), m.group(3).strip())
entries = []
in_output = False
for line in src.splitlines():
    if line.startswith("## Output"): in_output = True
    elif line.startswith("## ") and in_output: break
    elif in_output:
        m = re.match(r"-\s+(.+?)\s*\[(\d{2}:\d{2})\]\s*$", line.strip())
        if m: entries.append((m.group(1), m.group(2)))
print(f"transcript lines: {len(transcript)} | brief entries: {len(entries)}")
ok = 0
for text, ts in entries:
    if ts not in transcript:
        print(f"FAIL [{ts}] timestamp not in transcript :: {text[:60]}"); continue
    speaker, said = transcript[ts]
    ew, sw = set(words(text)), set(words(said)) | set(words(speaker))
    support = len(ew & sw) / max(len(ew), 1)
    flag = "OK " if support >= 0.35 else "LOW"
    if support >= 0.35: ok += 1
    print(f"{flag} [{ts}] support={support:.2f} :: {text[:70]}")
print(f"RESULT: {ok}/{len(entries)} entries pass timestamp-existence + lexical-support (>=0.35)")
