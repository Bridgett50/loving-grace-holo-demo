# Paid services and platform approvals

Demo mode needs none of this. The items below are what's required to run real meetings with real people, ordered roughly by how long they take to come through.

## Platform approvals

| Item | What's needed | Why |
| --- | --- | --- |
| **Zoom App Marketplace review** | A General app with Meeting SDK enabled. **Publish it through Marketplace review** before it can join meetings hosted outside your own Zoom account. | Unpublished SDK apps can only join meetings on the developer's own account. |
| **Zoom raw data / recording consent** | Use the in-meeting recording-consent flow. Raw audio and video access (the native Linux SDK) needs extra approval if you move off the web SDK. | Zoom requires recording disclosure to participants. We show the notice in chat and speak it as well. |
| **Microsoft Teams: Azure Bot registration** | An Azure subscription, an Azure Bot resource with the Teams channel and calling enabled, and a public HTTPS calling webhook. | Required for any Teams calling bot. |
| **Teams tenant admin consent** | A Global/Teams admin in **each customer tenant** grants `Calls.JoinGroupCall.All`, `Calls.JoinGroupCallAsGuest.All`, `Calls.AccessMedia.All` and `OnlineMeetings.Read.All`. | These are application permissions, so a user can't consent to them. |
| **Teams app-hosted media (video)** | A Windows Server VM (Azure, with a public IP, instance-level public IP and certificate) running the .NET media worker built on `Microsoft.Skype.Bots.Media`. | Service-hosted media covers voice only. Live avatar video in Teams needs app-hosted media. |
| **Teams compliance recording policy** (optional) | Needed only if a customer wants policy-based recording rather than ad-hoc joins. | It's an enterprise compliance feature. |
| **Google Meet** | No official participant API exists. The browser bot joins as a guest, and **the host has to admit it**. Workspace admins can block external guests. | This is a policy gray area: automating Meet's UI can break when the UI changes and may conflict with Google's terms. Before scaling, review the Google Workspace terms with counsel, or use Vexa (hosted) or the Meet Media API developer preview when it's available to you. |
| **Google OAuth verification** | Calendar read and Gmail compose are **restricted/sensitive scopes**, so Google requires app verification and, for Gmail, a **CASA security assessment**. | Without verification, the app is capped at 100 test users with an "unverified app" warning. |
| **Slack app distribution** | Turn on public distribution, and submit to the Slack Marketplace if you want listing. | Without it, only your workspace can install the app. |
| **X (Twitter) API** | A paid API tier is required to read mentions (Basic or higher). | The free tier doesn't allow reads. |
| **Instagram Graph API** | Meta App Review plus Business Verification. The Basic Display API is deprecated, so use Instagram API with Instagram Login for professional accounts. | Required to read media for non-test users. |
| **Telegram** | A free bot token from @BotFather. No approval needed. | n/a |

## Paid services

| Service | Use | Notes |
| --- | --- | --- |
| **Identity and liveness vendor** (Stripe Identity, Persona, Onfido, Veriff) | ID document plus liveness check at scan time | Paid per verification. Set `IDENTITY_PROVIDER` and wire the webhook. **Required** for non-demo twins. |
| **GPU hosting** (NVIDIA L4/A10G or better) | OpenVoice, MuseTalk and LivePortrait workers | Needed to stay under the 1-second budget. Plan for one GPU per few concurrent sessions. |
| **LLM** | Answers grounded in notes | Any OpenAI-compatible API, or self-hosted vLLM. Retrieval-only answers work without it. |
| **Speech-to-text** | Transcripts when the platform doesn't provide captions (Teams, Vexa) | Use self-hosted Whisper (MIT) or a paid STT API. |
| **LiveKit Cloud** (optional) | Managed media transport | You can self-host the Apache-2.0 server instead. |
| **Vexa hosted API** (optional) | Google Meet fallback | You can self-host the Apache-2.0 version instead. |
| **Twilio** | SMS alerts and whisper replies | Paid per message, and **A2P 10DLC registration** is required for US numbers. |
| **X API** | Mentions for meeting context | Paid tier (see above). |
| **C2PA signing certificate** | Production content credentials | An X.509 certificate from a CA on the C2PA trust list. The demo uses an HMAC key. |
| **Payments** (Stripe or similar) | Wallet top-ups | Demo top-ups are disabled outside demo mode. |
| **Windows Server VM** | Teams video media worker | Azure compute cost. |
| **Object storage + KMS** | Encrypted storage for scans, voice samples and ID images | Biometric data needs encryption at rest and a retention policy. |

## Legal and compliance (not a service, but blocks launch)

- **Biometric privacy:** under Illinois BIPA, Texas CUBI and Washington's biometric law, you need written consent, a published retention schedule and a destruction policy. The consent vault records versioned consent text and per-scope signatures. Twin deletion erases the stored media.
- **Recording consent laws:** some US states require all parties to consent, and GDPR applies in the EU. The twin announces recording on join and stops transcribing if anyone objects.
- **Voice and likeness rights:** under the Tennessee ELVIS Act, NY digital replica laws and the EU AI Act Article 50 (disclosure of AI-generated content), the AI badge, spoken intro and content credentials address disclosure. Only the verified owner can create a twin of themselves.
