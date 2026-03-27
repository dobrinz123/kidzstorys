# Audio Storage Research

## Recommendation

Use **Convex File Storage** for simplicity and zero extra infrastructure. Convex natively supports file uploads and serves files via authenticated or public URLs. For ~2-4GB of audio files at this scale, Convex storage is cost-effective and integrates cleanly with existing Convex actions.

If Convex storage proves limiting at scale (>10GB), migrate to **Cloudflare R2** as the CDN layer — R2 is $0.015/GB/month with zero egress fees and integrates cleanly with Convex via HTTP actions.

---

## Storage Options Comparison

| Option | Cost/GB/month | Egress Cost | Convex Integration | Complexity | Verdict |
|--------|--------------|-------------|-------------------|------------|---------|
| **Convex File Storage** | Included in plan | Included | Native | None | **Recommended (start here)** |
| Cloudflare R2 | $0.015 | $0 | Via HTTP action | Low | Recommended if scaling |
| AWS S3 | $0.023 | $0.09/GB | Via HTTP action | Medium | Overkill for this scale |
| Firebase Storage | $0.026 | $0.12/GB | Via HTTP action | Medium | No advantage over R2 |

---

## Scale Estimate

- 500 books × 20 pages × 2 languages = **20,000 audio files**
- Average page audio: ~30 seconds = ~500KB at 128kbps MP3
- Total storage: **~10 GB**
- Convex Pro plan: 1GB included, then pay-as-you-go
- R2: 10GB = $0.15/month — negligible

---

## Implementation Pattern — Convex File Storage

```typescript
// In a Convex action after TTS generation:
const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
const storageId = await ctx.storage.store(audioBlob);
const audioUrl = await ctx.storage.getUrl(storageId);

// Store URL in database
await ctx.db.patch(pageId, {
  [`audioUrl_${language}`]: audioUrl,
  [`audioStorageId_${language}`]: storageId,
});
```

```typescript
// In mobile app — just use the URL directly in expo-av:
const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
```

## Convex File Storage Notes
- Files stored as blobs, retrieved via `ctx.storage.getUrl(storageId)`
- URLs are stable and publicly accessible (no auth needed for audio playback)
- Max file size: 20MB (MP3 pages are ~500KB — well within limit)
- Storage is automatically replicated by Convex

---

## Schema Design

```typescript
// convex/schema.ts additions
pages: defineTable({
  // ... existing fields ...
  audioUrl_en: v.optional(v.string()),      // ElevenLabs EN audio URL
  audioUrl_ro: v.optional(v.string()),      // ElevenLabs RO audio URL
  audioStorageId_en: v.optional(v.id("_storage")),
  audioStorageId_ro: v.optional(v.id("_storage")),
  audioStatus_en: v.optional(v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("done"),
    v.literal("failed")
  )),
  audioStatus_ro: v.optional(v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("done"),
    v.literal("failed")
  )),
  audioGeneratedAt_en: v.optional(v.number()),
  audioGeneratedAt_ro: v.optional(v.number()),
})
```

---

## URL Serving Strategy

- Convex returns permanent public URLs for stored files
- Mobile app plays directly from URL via `expo-av`
- No presigned URLs needed (audio is not sensitive content)
- URLs are CDN-backed by Convex's infrastructure
