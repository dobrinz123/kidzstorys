# Phase 2: TTS Integration — Discussion Log

**Session:** 2026-03-27
**Conducted via:** /gsd:discuss-phase 2

---

## Area 1: Action Visibility

**Question:** Should `generatePageAudio` be callable only from Convex server-side, or also from mobile clients?

**Options presented:**
- `internalAction` only — Only the Convex scheduler/mutations can trigger it. Mobile clients never call it directly.
- Public action — Any Convex client (mobile app included) can call it.

**User selected:** `internalAction` only (recommended)

---

## Area 2: Text Source for TTS

**Question:** When `generatePageAudio` is called, how does it get the page text to send to ElevenLabs?

**Options presented:**
- Action reads from DB — Caller passes `bookId + pageIndex + locale`. Action looks up text itself.
- Caller passes text as arg — Scheduler fetches text and passes it as a string.

**User selected:** Action reads from DB (recommended)

---

## Pre-session Clarification

**User clarification (before gray area selection):**
> "THE FACT IS TO LIMIT API LIMIT USAGE IS MORE RELIABLE TO GENERATE THE AUDIO ONCE FOR EACH STORY AND SAVE IT THEN THE USER CAN PLAY IT (EACH PAGE WILL HAVE ITS OWN AUDIO FILE TO BE ABLE TO DETERMINE WHEN THE PAGE IS DONE SO WE CAN TURN THE PAGE)"

**Interpretation:** Confirmed pre-generate + store architecture (already decided in Phase 1). Each page gets its own MP3 file. Rate limiting is the scheduler's concern (Phase 3), not this action's.

---
*Log generated: 2026-03-27*
