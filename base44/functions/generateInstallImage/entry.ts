import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * generateInstallImage — builds a photorealistic installed-curtain image from the model's fabric swatch,
 * guided by the company's own real installation photos (InstallReference) for the same mechanism.
 *
 * Smart fabric engine:
 *  1. Analyzes the swatch image with vision AI — identifies the correct swatch by the model's code
 *     (the image may contain multiple swatches stacked vertically, each labeled with a product code),
 *     and produces a precise fabric description: color, hex, weave, pattern, sheen, and natural repeat.
 *  2. Generates the curtain using that description so the AI reproduces the exact fabric — no manual
 *     repeat count needed; the engine auto-determines the pattern's real-world repeat scale.
 *  3. Reviews the result against the swatch and real installations; regenerates once if it fails.
 * Result is cached on the model — each model costs at most once.
 */

const STYLE_PROMPTS = {
  drape: "classic full-length curtain panels hanging from a decorative curtain rod with finials and rings, two panels parted at the centre, soft natural vertical drapery folds, hem just touching the floor",
  wave: "wave-fold S-curve curtains hanging from a discreet ceiling-mounted wave track, smooth evenly spaced S-shaped folds, full length to the floor",
  panel: "vertical sliding flat fabric panels on a ceiling-mounted multi-channel track, three separate flat panels slightly overlapping",
  roman: "a flat roman shade mounted inside the window recess, neatly stacked horizontal fabric layers at the top, subtle horizontal rod pockets on the flat fabric",
  zebra: "a dual-layer zebra roller blind mounted inside the window recess in a slim cassette, alternating horizontal bands of opaque fabric and sheer voile, aluminium bottom bar",
  "pleated-manual": "a pleated blind with crisp fine horizontal accordion pleats mounted inside the window frame, slim top and bottom rails",
  "pleated-chain": "a pleated blind with crisp fine horizontal accordion pleats in a cassette above the window with a side control chain",
  "pleated-sheer": "a translucent pleated sheer blind with fine accordion pleats in a cassette with side chain, softly backlit by daylight",
  shade: "a premium roller shade in a sleek aluminium cassette above the window, smooth flat fabric panel with a bottom rail and side control chain",
  double: "a double roller shade system above the window: an opaque fabric back layer and a translucent sheer front layer on two cassettes, with side chains",
  roller: "a venetian blind with horizontal slats and visible ladder cords and pull cord, headrail above the window",
};

function resolveStyle(cat, sub) {
  if (cat === 'pleated') return sub === 'chain' ? 'pleated-chain' : 'pleated-manual';
  if (cat === 'pleated-mesh') return 'pleated-sheer';
  const map = { roman: 'roman', shade: 'shade', 'double-shade': 'double', roller: 'roller', zebra: 'zebra', aurora: 'wave', 'turk-panel': 'panel', outdoor: 'shade', motorized: 'shade', accessories: 'shade' };
  return map[cat] || 'drape';
}

function materialHint(model) {
  const hay = `${model.fabric || ''} ${model.name || ''} ${model.texture || ''} ${model.material || ''} ${model.category_slug || ''}`.toLowerCase();
  if (/حریر|توری|تور |شیفون|شيفون|voile|sheer|mesh/.test(hay)) return 'translucent sheer fabric, daylight glowing through it, soft see-through layering';
  if (/مخمل|velvet/.test(hay)) return 'heavy velvet with dense pile: deep dark fold valleys, soft lustrous sheen on fold edges, heavy weighted drape';
  if (/ساتن|ابریشم|silk|satin/.test(hay)) return 'silk/satin with smooth glossy highlights along fold crowns and fluid drape';
  return 'natural woven fabric with visible weave texture and soft matte light';
}

const CRITERIA = ['mechanism', 'hardware', 'fabric_match', 'pattern_alignment', 'realism'];
const PASS_SCORE = 7;

// Normalizes a product code for flexible matching: "PB 301" / "PB-301" / "pb301" → "pb301"
function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[\s\-_]+/g, '');
}

// Analyzes the swatch image with vision AI: finds the correct swatch by the model's code.
// The image may be a catalog page with up to 10-12 swatches in a grid (rows × columns),
// each with a printed text label below it like "PB301 Pleated shade" or "PL 1301 Pleated shade".
// Also handles single-swatch images and vertically-stacked swatch strips.
async function analyzeFabric(core, swatchUrl, modelCode) {
  const norm = normalizeCode(modelCode);
  const r = await core.InvokeLLM({
    prompt: `You are a fabric analyst for a luxury curtain company. The image is a fabric catalog page. It may contain a SINGLE fabric swatch, a few swatches stacked vertically, or up to 10-12 swatches arranged in a GRID (rows and columns). Each swatch has a printed text label below or beside it with a product code and the words "Pleated shade" — e.g. "PB301 Pleated shade", "PL 1301 Pleated shade", "PH 901 Pleated Shade", "PX 2605 Pleated shade".

Your task: find the ONE swatch whose label code matches "${modelCode}" (normalized: "${norm}"). Match flexibly — "PB 301" = "PB-301" = "PB301". Ignore spaces, hyphens and case. If the image has only one swatch, analyze that one regardless of code.

Once you identify the correct swatch, describe ONLY that swatch's visual properties (not the others around it) so a rendering engine can reproduce it perfectly on a pleated shade curtain.
Return JSON with all fields filled.`,
    file_urls: [swatchUrl],
    response_json_schema: {
      type: 'object',
      properties: {
        found: { type: 'boolean', description: 'true if a swatch matching the code was identified' },
        matched_label: { type: 'string', description: 'the exact label text as printed under the matched swatch' },
        swatch_location: { type: 'string', description: 'position of the matched swatch in the image, e.g. "top-left", "row 2 column 1", "center", "bottom-right", "only swatch"' },
        color_description: { type: 'string', description: 'precise color name and tone in English' },
        color_hex: { type: 'string', description: 'estimated hex color of the fabric base' },
        secondary_colors: { type: 'string', description: 'hex codes of any secondary/pattern colors, comma-separated, or empty if solid' },
        texture: { type: 'string', description: 'weave structure, e.g. tight fine grid weave, horizontal linen-like grain, smooth matte, fine ribbed' },
        pattern_type: { type: 'string', enum: ['solid', 'woven', 'printed', 'textured', 'metallic'] },
        pattern_description: { type: 'string', description: 'detailed description of any visible pattern (polka dots, watercolor blotches, wood-grain lines, abstract floral, etc.), or solid color if none' },
        repeat_description: { type: 'string', description: 'the fabric natural pattern repeat in real-world terms, e.g. fine tight weave repeat ~2mm, polka dots spaced ~15mm apart, horizontal grain ~3mm, no visible repeat solid color, large non-repeating watercolor print' },
        sheen: { type: 'string', enum: ['matte', 'soft', 'glossy', 'metallic'] },
        weight_hint: { type: 'string', enum: ['sheer', 'light', 'medium', 'heavy'] },
        opacity_hint: { type: 'string', enum: ['sheer', 'translucent', 'opaque'], description: 'how see-through the fabric appears' },
        full_description: { type: 'string', description: 'one detailed English paragraph combining all the above for a curtain rendering prompt — include exact colors, pattern, texture, sheen and repeat scale' },
      },
      required: ['found', 'matched_label', 'swatch_location', 'color_description', 'color_hex', 'secondary_colors', 'texture', 'pattern_type', 'pattern_description', 'repeat_description', 'sheen', 'weight_hint', 'opacity_hint', 'full_description'],
    },
  });
  return r;
}

// Scores the image against the swatch and the company's real installations; approved only if every criterion passes.
async function review(core, url, refs, swatch, styleDesc, modelCode, analysis) {
  const locHint = analysis?.swatch_location ? ` It is located at: ${analysis.swatch_location}.` : '';
  const r = await core.InvokeLLM({
    prompt: `You are a strict quality inspector for a luxury curtain company. Image 1 is a generated photo. Image 2 is the real fabric swatch reference${modelCode ? ` — it is a catalog page that may contain up to 10-12 swatches in a grid, each with a printed text label; the TARGET swatch is the ONE whose label reads "${modelCode}"${locHint}` : ''}. ${refs.length ? 'Remaining images are the company\'s real installed examples of this mechanism — treat them as ground truth for hardware and mounting.' : ''}
Required installation: ${styleDesc}.
${analysis ? `Target fabric analysis: ${analysis.full_description}. Expected color ~${analysis.color_hex}, ${analysis.sheen} sheen, ${analysis.pattern_description}.` : ''}
Score each criterion 0-10:
- mechanism: correct curtain type and mounting position (inside/outside recess, ceiling/wall), physically plausible operation
- hardware: rod/track/cassette/chain/finials correct and matching the real examples
- fabric_match: color, texture and sheen match the TARGET swatch exactly — not a different swatch from the same catalog page
- pattern_alignment: pattern scale and orientation follow the folds/pleats naturally at the fabric's real-world repeat scale
- realism: real-photo quality, natural gravity, folds, light and shadows, no AI artifacts or text
List concrete issues in English (empty if none).`,
    file_urls: [url, swatch, ...refs],
    response_json_schema: {
      type: 'object',
      properties: { ...Object.fromEntries(CRITERIA.map(c => [c, { type: 'number' }])), issues: { type: 'string' }, summary_fa: { type: 'string', description: 'one-sentence Persian summary of the verdict' } },
      required: [...CRITERIA, 'issues', 'summary_fa'],
    },
  });
  const scores = CRITERIA.map(c => Number(r?.[c]) || 0);
  return { pass: Math.min(...scores) >= PASS_SCORE, score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10, issues: r?.issues || '', summary: r?.summary_fa || '' };
}

const result = (m) => Response.json({ install_status: m.install_status, install_image: m.install_status === 'approved' ? m.install_image : '' });

const PENDING_TTL = 5 * 60 * 1000; // a build in flight is trusted for 5 minutes, then a crashed run is retried

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const modelId = body?.model_id;
    if (!modelId || typeof modelId !== 'string' || modelId.length > 64) {
      return Response.json({ error: 'model_id is required' }, { status: 400 });
    }

    const model = await base44.asServiceRole.entities.CurtainModel.get(modelId);
    if (!model) return Response.json({ error: 'Model not found' }, { status: 404 });

    // regenerating an existing image is admin-only; otherwise return cache (no cost)
    let regenerate = false;
    if (body?.regenerate) {
      const user = await base44.auth.me().catch(() => null);
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      regenerate = true;
    }
    // already reviewed → return cached verdict (no cost); a rejected image is never shown to customers
    if (model.install_status && !regenerate) return result(model);
    if (!model.image) return Response.json({ error: 'Model has no fabric swatch image' }, { status: 422 });

    const style = resolveStyle(model.category_slug || '', (model.subcategory || '').toLowerCase());
    const styleDesc = STYLE_PROMPTS[style];
    const refRows = await base44.asServiceRole.entities.InstallReference.filter({ style }, '-created_date', 3);
    const refs = refRows.map(r => r.image).filter(Boolean);
    const core = base44.asServiceRole.integrations.Core;
    const save = async (url, check) => {
      const data = { install_image: url, install_status: check.pass ? 'approved' : 'rejected', install_score: check.score, install_review: check.summary, install_pending: null };
      await base44.asServiceRole.entities.CurtainModel.update(modelId, data);
      return result(data);
    };

    // another visitor already triggered this build moments ago → piggyback on it instead of paying twice
    if (model.install_pending && !regenerate && Date.now() - Date.parse(model.install_pending) < PENDING_TTL) {
      return Response.json({ install_status: '', install_image: '', pending: true });
    }
    await base44.asServiceRole.entities.CurtainModel.update(modelId, { install_pending: new Date().toISOString() });

    // legacy image that was never reviewed → review it before it can be shown
    if (model.install_image && !regenerate) return save(model.install_image, await review(core, model.install_image, refs, model.image, styleDesc, model.code, null));

    // Smart fabric analysis: identify the correct swatch by code and describe it precisely
    let analysis = null;
    try {
      analysis = await analyzeFabric(core, model.image, model.code);
      if (analysis && analysis.found === false) analysis = null;
    } catch { /* fall back to materialHint */ }

    const fabricDesc = analysis?.full_description || materialHint(model);
    const colorHex = analysis?.color_hex || model.color_code || '';
    const repeatDesc = analysis?.repeat_description || '';

    const swatchLoc = analysis?.swatch_location ? ` It is located at: ${analysis.swatch_location}.` : '';
    const basePrompt =
      `Photorealistic interior photograph, shot on a full-frame camera, natural daylight: ${styleDesc}, professionally installed on a real window. ` +
      `Fabric: ${fabricDesc}. ` +
      `The first reference image is a fabric catalog page${model.code ? ` — it contains multiple fabric swatches in a grid, each with a printed text label; use ONLY the ONE swatch whose label reads "${model.code}".${swatchLoc}` : ''}. ` +
      `Reproduce that specific swatch's exact color${colorHex ? ` (~${colorHex})` : ''}, texture, weave, pattern and sheen on the curtain — do NOT blend or borrow colors from adjacent swatches on the same page. ` +
      `CRITICAL: Do NOT use a fixed or arbitrary pattern repeat. Automatically determine the fabric's natural repeat scale from the swatch${repeatDesc ? ` (${repeatDesc})` : ''} and let the pattern flow across the folds and pleats at its real-world scale — the engine handles the repeat intelligently, no manual repeat count is needed. ` +
      (refs.length ? 'The other reference images are real installations by our company: match their hardware, mounting position, window frame, wall, sill, room style, camera angle and lighting closely, but use the new fabric. ' : 'Elegant warm interior, real window frame with sill, soft natural shadows. ') +
      'Realistic gravity and fold physics, correct proportions, sharp focus, no people, no text, no watermark.';

    let prompt = basePrompt;
    let best = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await core.GenerateImage({ prompt, existing_image_urls: [model.image, ...refs] });
      if (!res?.url) return Response.json({ error: 'Image generation failed' }, { status: 500 });
      const check = await review(core, res.url, refs, model.image, styleDesc, model.code, analysis);
      if (!best || check.score > best.check.score) best = { url: res.url, check };
      if (check.pass) break;
      prompt = `${basePrompt} Fix these problems from the previous attempt: ${check.issues}`;
    }
    return save(best.url, best.check);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}