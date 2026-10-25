# Day-10 held-out cases: sealed hashes

Sealed: **Sunday, October 25, 2026, 09:40 CDT (America/Chicago, UTC-5)**, before the hackathon kickoff (Oct 26, 11 AM CT) and before any prompt tuning.

Three synthetic meetings (fictional people and companies, no real personal data) in the format of
`second-seat/hackathon-evidence/INPUT_FORMAT.md`, plus one answer key per case. The files are **not** in this
repository. They are held privately and will be **released on Mon, Nov 2, 2026**, alongside the day-10 run, so anyone can
re-compute these hashes (`sha256sum`) and confirm that the cases were not changed after this commit.

The commit timestamp of this file is the public proof of the seal time.

## Per-file SHA-256

| File | SHA-256 |
| :--- | :--- |
| `answer-keys/case-A-SYNTHETIC-spirits-distributor-pricing-answer-key.md` | `f6ac7fc5ed37d242a870c7485265be66ea27d389724a93d5e13fb14faef6f038` |
| `answer-keys/case-B-SYNTHETIC-software-contractor-kickoff-answer-key.md` | `8a7085c47d02639602cc0011f22f1f76eb808713d145f294edb20b8f1bc5cd15` |
| `answer-keys/case-C-SYNTHETIC-nonprofit-grant-planning-answer-key.md` | `6d92a44eba98ebcd7c7f13f82c6c8201c05c17a853190ff478a3d95cbc203d75` |
| `case-A-SYNTHETIC-spirits-distributor-pricing/CASE.md` | `c4ac74c92941c51d6c5ca0f6cff3a0260b362db0e88323e1a161a422c31cdb75` |
| `case-A-SYNTHETIC-spirits-distributor-pricing/frame-02-11.png` | `c2df055f212e4851d3c66a56b415835062fe529fb16af83d269c251202bf1305` |
| `case-A-SYNTHETIC-spirits-distributor-pricing/frame-12-18.png` | `b630d139d95fd615932b7f392d58a52b4923ee76b77d17cf491028ee4cf2de42` |
| `case-A-SYNTHETIC-spirits-distributor-pricing/frames.txt` | `61888ae5645801ffa02bf4a57af5265189224a00b4276cd841847d3e204e1cb6` |
| `case-A-SYNTHETIC-spirits-distributor-pricing/transcript.txt` | `d9744e0aec4595d04047afcdca4abe27c66846d87916b3e92066034ec944be31` |
| `case-B-SYNTHETIC-software-contractor-kickoff/CASE.md` | `807b80591bd21d6af24797cff73390934ccd2fd61b3277d5ea0ded31f3fc585e` |
| `case-B-SYNTHETIC-software-contractor-kickoff/frame-02-53.png` | `f288f47fa9cb8a4125dcddc707c18ef17004c1ac332970c531741728ad28e1a9` |
| `case-B-SYNTHETIC-software-contractor-kickoff/frame-10-28.png` | `26d0bbbc26490126fdb095cf3ca42cd17082629beca5bb3feeda0bc6a734c259` |
| `case-B-SYNTHETIC-software-contractor-kickoff/frames.txt` | `84cfdd71e578f344deb1e3e558ad0219c9e786e7d96cc35e47da925d4ef12981` |
| `case-B-SYNTHETIC-software-contractor-kickoff/transcript.txt` | `34d9f9ee01296db3b97a5394c2d967a686d9faab3a2fdcce3e2d1640aee359eb` |
| `case-C-SYNTHETIC-nonprofit-grant-planning/CASE.md` | `2887d5a709a6b286ffded05b6718227a1f3b3c87972abf551523dc7d227b1b4b` |
| `case-C-SYNTHETIC-nonprofit-grant-planning/frame-05-03.png` | `11a2a3966170e7ff44ff307a8e344801d6ed4439f8d76b9a7b0ebc151d826406` |
| `case-C-SYNTHETIC-nonprofit-grant-planning/frame-10-42.png` | `82728ada942d9b34e3de6275ca525a82c947f46f23f5f465edc6c5e2d3c53413` |
| `case-C-SYNTHETIC-nonprofit-grant-planning/frames.txt` | `80e74625bc26ff19c93619d0a5dd18cf7797ea856d6a97445ca8f815b7aefa75` |
| `case-C-SYNTHETIC-nonprofit-grant-planning/transcript.txt` | `75ee84e3c45ca1ff8214e7701d7610c656e6cd885e858a41e6d82426b3f0724e` |

## Archive

| File | SHA-256 |
| :--- | :--- |
| `heldout-sealed.tar.gz` (all of the above, under `heldout-sealed/`) | `4fe3a3b1ffff6e8a21ba09d46fb75481733ac575edc8901abd869689b1518a27` |

Released: Nov 2, 2026 (day-10 run). Until then, the cases are not used for building, tuning, or red-team work.
