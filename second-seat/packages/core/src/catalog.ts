import type { BackgroundOption, ConnectionDef, Skill } from "./types";

export const SKILLS: Skill[] = [
  { id: "meeting-notes", name: "Meeting notes", description: "Transcript, notes and action items posted after every meeting.", category: "meetings", permissions: ["read_transcript"] },
  { id: "answer-from-notes", name: "Answer from my notes", description: "Answers questions using only the documents you uploaded, and defers when unsure.", category: "knowledge", permissions: ["read_knowledge"] },
  { id: "follow-up-email", name: "Follow-up email draft", description: "Drafts a recap email in Gmail for you to review. Never sends on its own.", category: "communication", permissions: ["gmail_drafts"] },
  { id: "slack-recap", name: "Slack recap", description: "Posts the meeting summary to a Slack channel you choose.", category: "communication", permissions: ["slack_post"] },
  { id: "sms-alert", name: "Needs-you alerts", description: "Texts or Telegrams you when someone asks for something only you can decide.", category: "communication", permissions: ["sms_send", "telegram_send"] },
  { id: "live-captions", name: "Live captions", description: "Streams captions of what your twin says into meeting chat.", category: "accessibility", permissions: ["meeting_chat"] },
  { id: "translate", name: "Live translation", description: "Speaks in another language with matched lip-sync; translated speech is disclosed.", category: "accessibility", permissions: ["translate"] },
  { id: "social-digest", name: "Social digest", description: "Summarises mentions on X and Instagram before a meeting so your twin has context.", category: "knowledge", permissions: ["x_read", "instagram_read"] },
  {
    id: "contract-signing",
    name: "Sign contracts & approve payments",
    description: "Not available. Your twin can never agree to contracts, payments or other binding commitments.",
    category: "meetings",
    permissions: ["sign_contracts", "send_payments"],
    forbidden: true,
  },
];

export const CONNECTIONS: ConnectionDef[] = [
  { id: "google", name: "Gmail & Google Calendar", description: "Read your calendar for auto-join and draft follow-up emails.", requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  { id: "slack", name: "Slack", description: "Post recaps and receive coach-mode whispers from Slack.", requiredEnv: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"] },
  { id: "sms", name: "SMS", description: "Text alerts when your twin needs you. Reply to whisper guidance.", requiredEnv: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"] },
  { id: "telegram", name: "Telegram", description: "Alerts and coach-mode whispers through a Telegram bot.", requiredEnv: ["TELEGRAM_BOT_TOKEN"] },
  { id: "x", name: "X", description: "Read mentions for pre-meeting context. Never posts.", requiredEnv: ["X_CLIENT_ID", "X_CLIENT_SECRET"] },
  { id: "instagram", name: "Instagram", description: "Read your public posts for pre-meeting context. Never posts.", requiredEnv: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"] },
];

export const BACKGROUNDS: BackgroundOption[] = [
  { id: "holo-black", name: "Hologram black", kind: "builtin", css: "radial-gradient(ellipse at 50% 35%, #1b2236 0%, #05060a 70%)" },
  { id: "pastel-glow", name: "Soft pastel", kind: "builtin", css: "linear-gradient(100deg, #cdbfe8 0%, #e3c5e4 55%, #f6cadb 100%)" },
  { id: "studio-warm", name: "Warm studio", kind: "builtin", css: "linear-gradient(160deg, #f6e7d7 0%, #d9b99b 55%, #8f6b55 100%)" },
  { id: "office-soft", name: "Soft office", kind: "builtin", css: "linear-gradient(180deg, #e8eef5 0%, #c6d3e1 60%, #93a6bb 100%)" },
  { id: "grace-sunrise", name: "Sunrise", kind: "builtin", css: "linear-gradient(150deg, #ffd9c2 0%, #f3a6b5 45%, #8a6fd1 100%)" },
  { id: "evergreen", name: "Evergreen", kind: "builtin", css: "linear-gradient(170deg, #d7efe2 0%, #7fb79a 55%, #2f5e4a 100%)" },
];
