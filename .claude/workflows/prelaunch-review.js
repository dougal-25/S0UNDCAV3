export const meta = {
  name: 'prelaunch-review',
  description: 'Full-codebase pre-launch sweep: security + duplication + dead-code across all Python and JS',
  whenToUse: 'Run before going live. Reviews every module, verifies security findings, and returns one prioritized report. See wiki/reviews/2026-07-03_prelaunch_review_runbook.md.',
  phases: [
    { title: 'Review', detail: 'one reviewer per module cluster (security/dedupe/dead-code/correctness)' },
    { title: 'Verify', detail: 'adversarially verify each security finding' },
    { title: 'Dedupe', detail: 'cross-module duplication pass with a global view' },
    { title: 'Synthesize', detail: 'merge into one prioritized report' },
  ],
}

// Context every reviewer needs — baked in so no per-agent re-discovery.
const ARCH = `ARCHITECTURE: Flask backend on Railway (gunicorn wsgi:app, --workers 1 --threads 4, APScheduler in-process). Supabase Postgres (migrations in db/, latest 0023). Static JS frontend (Vercel + GH Pages) that calls the backend AND Supabase directly (anon key + JWT, js/lib/supabase.js). LOAD-BEARING: the Flask backend uses the Supabase SERVICE-ROLE key (sb_helpers.supabase()) which BYPASSES RLS — so API endpoints enforce tenant isolation IN CODE via require_user() uid scoping; direct browser->Supabase calls are guarded by RLS. Credits: debit_credits/refund_credits/grant_credits are SECURITY DEFINER SQL fns; content_api._debit and sb_helpers.charge/refund wrap them; ADMIN_EMAILS bypass charges.`

const DONT_REFLAG = `ALREADY FIXED today (commit "Pre-launch security hardening") — DO NOT report these: (1) users RLS UPDATE removed + credits_ledger client read-only (db/0023); (2) credit debits added to avatars generate-v2/forge-character, events generate-flyer, campaigns generate-campaign + generate-v2 dims clamped; (3) Stripe webhook idempotency (stripe_events table + claim/release); (4) SSRF guard in image_composer._safe_get; (5) artist_profiles PATCH claimer/admin only; (6) auth on /api/scheduled-searches; (7) per-IP POST throttle in content_api before_request. KNOWN-OPEN (mention only if you add specifics, don't re-derive): public-read storage buckets need signed URLs; requirements.txt unpinned; debit-before-generate vs 120s timeout; non-transactional generate_campaign; esc() single-quote XSS in js/app.js; video_premium duration underpricing; raw exception strings to clients.`

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          category: { type: 'string', enum: ['security', 'duplication', 'dead-code', 'correctness'] },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          summary: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['file', 'line', 'category', 'severity', 'summary', 'evidence'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['CONFIRMED', 'PLAUSIBLE', 'REFUTED'] },
    reason: { type: 'string' },
  },
  required: ['verdict', 'reason'],
}

const CLUSTERS = [
  { label: 'py:content_api', files: ['content_api.py'] },
  { label: 'py:media_gen', files: ['media_gen.py'] },
  { label: 'py:api-a', files: ['campaigns_api.py', 'events_api.py', 'artist_profiles_api.py'] },
  { label: 'py:api-b', files: ['avatars_api.py', 'tracking_api.py', 'brand_kits_api.py', 'roster_api.py'] },
  { label: 'py:compose', files: ['image_composer.py', 'animation_gen.py', 'conjure_gen.py', 'campaign_template.py'] },
  { label: 'py:pipelines', files: ['scout.py', 'scheduled_scout.py', 'clan_tracker.py', 'tracking_collector.py', 'soundcloud_helpers.py', 'update_manifest.py', 'sb_helpers.py', 'config/voice_presets.py', 'wsgi.py'] },
  { label: 'js:core', files: ['js/app.js', 'js/config.js', 'js/lib/supabase.js', 'js/version.js'] },
  { label: 'js:firepit', files: ['js/firepit.js'] },
  { label: 'js:dashboard', files: ['js/cave.js', 'js/cave_entrance.js', 'js/foraging.js', 'js/footprints.js', 'js/clan.js'] },
  { label: 'js:events', files: ['js/events_form.js', 'js/events_detail.js', 'js/events_post_editor.js', 'js/events_list.js', 'js/events_match.js', 'js/events_shared.js'] },
  { label: 'js:studio', files: ['js/compositor.js', 'js/compositor_templates.js', 'js/beat_segment.js', 'js/stash.js', 'js/stash_picker.js', 'js/forge_refs.js', 'js/spirits.js'] },
  { label: 'js:misc', files: ['js/brands.js', 'js/trail_map.js', 'js/roster_sync.js', 'js/sc_oauth.js', 'js/icons.js'] },
]

const reviewPrompt = (c) => `You are a pre-launch code auditor for The Sound Cave (SaaS opening free public signups). Review THESE files in full, reading each one: ${c.files.join(', ')}.

${ARCH}

${DONT_REFLAG}

Find, with concrete evidence and file:line for each:
- SECURITY: broken access control / missing uid-scoping on service-role queries (IDOR), missing auth, injection, SSRF, XSS (esp. innerHTML with user/API data + inline handlers), secret exposure, unsafe input, cost/credit-bypass on paid provider calls.
- DUPLICATION: logic/helpers re-implemented that already exist elsewhere in the repo (name the existing one); copy-pasted blocks.
- DEAD-CODE: unused functions/vars/routes/branches, unreachable code, commented-out blocks left behind.
- CORRECTNESS: real bugs a careful reviewer would catch.

Read the actual code — do not guess. Return up to 14 findings, most severe first. Skip anything in the ALREADY-FIXED list.`

phase('Review')
const perCluster = await pipeline(
  CLUSTERS,
  (c) => agent(reviewPrompt(c), { label: `review:${c.label}`, phase: 'Review', schema: FINDINGS_SCHEMA })
    .then((r) => ({ cluster: c.label, findings: (r && r.findings) || [] })),
  // Verify only SECURITY findings for this cluster — false criticals are costly.
  (res) => {
    const sec = res.findings.filter((f) => f.category === 'security')
    if (!sec.length) return res
    return parallel(sec.map((f) => () =>
      agent(`Adversarially verify this security finding. Try to REFUTE it by reading the code at ${f.file}:${f.line}. ${ARCH}\nFinding: ${f.summary}\nEvidence: ${f.evidence}\nReturn REFUTED only if provably wrong (quote the code); PLAUSIBLE if realistic; CONFIRMED if clearly real.`,
        { label: `verify:${f.file}:${f.line}`, phase: 'Verify', schema: VERDICT_SCHEMA })
        .then((v) => ({ ...f, verdict: (v && v.verdict) || 'PLAUSIBLE', verdictReason: v && v.reason }))
    )).then((verified) => {
      const nonSec = res.findings.filter((f) => f.category !== 'security')
      const kept = verified.filter(Boolean).filter((f) => f.verdict !== 'REFUTED')
      return { cluster: res.cluster, findings: [...kept, ...nonSec] }
    })
  }
)

const all = perCluster.filter(Boolean).flatMap((r) => r.findings)

phase('Dedupe')
// Cross-module duplication needs a global view — a barrier over all findings + the file list.
const dedupe = await agent(
  `You are the cross-module DE-DUPLICATION pass. Here is the full file inventory:\n${CLUSTERS.map((c) => c.files.join(', ')).join('\n')}\n\nAnd the per-cluster findings so far (JSON):\n${JSON.stringify(all.filter((f) => f.category === 'duplication').slice(0, 60))}\n\nGrep/read across modules to find duplication the per-file reviewers missed because it spans files: shared fetch/auth/format helpers reimplemented per module, repeated Supabase query patterns, copy-pasted DOM builders in js/, parallel Python/JS logic. Return the consolidated duplication list with the canonical version to keep and the sites to collapse.`,
  { phase: 'Dedupe', schema: FINDINGS_SCHEMA }
)

phase('Synthesize')
const report = await agent(
  `Synthesize ONE prioritized pre-launch report from these verified findings. Split into three sections — ## Security (most severe first), ## De-duplication, ## Dead code — each item: file:line, one-line summary, severity, and a one-line fix sketch. Drop duplicates. Lead with a 3-line executive verdict: is it safe to open free public signups, and the top 3 must-fix items.\n\nAll findings (JSON):\n${JSON.stringify(all)}\n\nCross-module dedupe (JSON):\n${JSON.stringify((dedupe && dedupe.findings) || [])}`,
  { phase: 'Synthesize' }
)

return { report, rawFindingCount: all.length, clusters: perCluster.filter(Boolean).map((r) => ({ cluster: r.cluster, n: r.findings.length })) }
