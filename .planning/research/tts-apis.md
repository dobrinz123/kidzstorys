# TTS API Research

## Summary Recommendation

**ElevenLabs** is the best fit for this project: it has the highest-quality children's voices in both English and Romanian, a simple REST API, and per-character pricing that is cost-effective at the pre-generation scale of ~20,000 audio files. Google Cloud TTS Neural2 is the runner-up if cost is a priority.

---

## Comparison Table

| API | Romanian | EN Children Quality | Pricing (per 1M chars) | Complexity | Verdict |
|-----|----------|--------------------|-----------------------|------------|---------|
| **ElevenLabs** | ✅ Yes (multiple voices) | ⭐⭐⭐⭐⭐ Exceptional | ~$300 (Starter) | Low | **Recommended** |
| Google Cloud Neural2 | ✅ Yes (ro-RO) | ⭐⭐⭐⭐ Very Good | ~$16 | Low | Runner-up |
| Azure Neural | ✅ Yes (ro-RO: Alina, Emil) | ⭐⭐⭐ Good | ~$15 | Medium | Viable |
| Amazon Polly | ❌ No Romanian | ⭐⭐⭐ Good | ~$4 | Low | Not viable |
| OpenAI TTS | ❌ No Romanian | ⭐⭐⭐⭐ Good | ~$15 | Very Low | Not viable |

---

## Detailed Notes

### ElevenLabs ✅ RECOMMENDED
- Romanian: Full support, multiple neural voices, natural intonation
- English: Best-in-class children's voices (warm, expressive, age-appropriate)
- Output: MP3 (128kbps default, up to 192kbps)
- API: Simple REST endpoint, returns audio binary or stream
- Pricing: Free tier (10k chars/month), Starter $5/month (30k chars), Scale $22/month (100k chars)
  - For 20,000 pages × ~500 chars avg = ~10M chars total generation = ~$30 one-time at Scale tier
- Latency: 0.5–2s per request (pre-generation so latency doesn't matter)
- Rate limits: Starter = 2 concurrent, Scale = 10 concurrent
- Notable: Supports voice cloning, SSML-like prosody tags, multilingual models

### Google Cloud Text-to-Speech (Neural2)
- Romanian: `ro-RO-Standard-A` (standard), Neural2 not available for Romanian as of 2024
- English: Neural2 voices are excellent, `en-US-Neural2-C` is warm and suitable for children
- Output: MP3, OGG_OPUS, LINEAR16
- Pricing: Neural2 = $16/1M chars, Standard = $4/1M chars
- API: Google Cloud SDK or REST, requires GCP project setup
- Con: Romanian only has Standard (not Neural2) voices — quality gap vs English

### Azure Cognitive Services Neural TTS
- Romanian: `ro-RO-AlinaNeural` (female), `ro-RO-EmilNeural` (male) — both neural quality
- English: Many children-friendly voices available
- Output: MP3, OGG, WAV
- Pricing: ~$15/1M chars (neural)
- API: Requires Azure account, more complex auth (subscription key + region)
- Con: More infrastructure overhead than ElevenLabs

### Amazon Polly
- Romanian: ❌ Not supported — eliminates this option

### OpenAI TTS
- Romanian: ❌ Not supported — eliminates this option

---

## Integration Approach (ElevenLabs from Convex Action)

```typescript
// convex/actions/generateAudio.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generatePageAudio = action({
  args: {
    pageText: v.string(),
    language: v.union(v.literal("en"), v.literal("ro")),
    pageId: v.id("pages"),
  },
  handler: async (ctx, { pageText, language, pageId }) => {
    const voiceId = language === "en"
      ? process.env.ELEVENLABS_EN_VOICE_ID   // e.g., children's EN voice
      : process.env.ELEVENLABS_RO_VOICE_ID;  // e.g., Romanian voice

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: pageText,
          model_id: "eleven_multilingual_v2", // supports both EN and RO
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    const audioBuffer = await response.arrayBuffer();
    // Upload to storage (Convex or R2)...
  },
});
```

**Key:** Use `eleven_multilingual_v2` model — single model handles both English and Romanian naturally.

---

## Voice Selection Recommendations

- **English:** `Rachel` or `Bella` voices (ElevenLabs) — warm, clear, child-friendly
- **Romanian:** `Alina` or custom Romanian voice — test a few from ElevenLabs voice library
- **Test first:** Generate 5-10 sample pages before committing to voices
