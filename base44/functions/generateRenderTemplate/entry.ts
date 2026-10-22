import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const STYLES = {
  drape: 'two full-length classic pinch-pleat curtain panels hanging from a decorative brass rod above the window, partly open, deep soft natural vertical folds pooling slightly on the floor',
  wave: 'full-length wave-fold (S-fold) curtains hanging from a discreet ceiling track, perfectly regular deep S-shaped vertical waves, partly open',
  panel: 'four flat vertical sliding fabric panels on a multi-channel ceiling track, panels perfectly flat and taut with weighted bottom bars, slightly overlapping',
  roman: 'a flat roman shade mounted inside the window recess, lowered to about two thirds, the top part neatly folded into 3 soft horizontal stacked folds, flat fabric below with subtle horizontal rod lines',
  zebra: 'a zebra (day-night) roller blind in a white cassette mounted inside the window recess, alternating horizontal bands of opaque fabric and see-through sheer mesh, each band about 7 cm',
  'pleated-manual': 'a pleated blind mounted inside the window recess with crisp fine vertical-stacked horizontal accordion pleats about 2 cm deep, white top and bottom aluminum rails',
  'pleated-chain': 'a chain-operated pleated blind mounted outside the window frame with crisp horizontal accordion pleats about 2 cm deep, aluminum headrail, metal bead chain on the side',
  'pleated-sheer': 'a translucent sheer pleated blind mounted outside the window frame, crisp horizontal accordion pleats, daylight shining through the fabric, side bead chain',
  shade: 'a roller shade in a sleek aluminum cassette mounted above the window, perfectly flat smooth fabric lowered to two thirds, slim aluminum bottom rail, side bead chain',
  double: 'a double roller shade above the window: an opaque back roller shade and a translucent sheer front roller shade on twin aluminum cassettes, both lowered',
  roller: 'a venetian blind with 50 mm wide horizontal fabric-covered slats tilted slightly open, visible ladder tapes and pull cords, mounted above the window',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { style } = await req.json();
    if (!STYLES[style]) return Response.json({ error: 'Invalid style' }, { status: 400 });

    const prompt =
      'Professional photorealistic interior photograph, eye-level straight-on view of a single large window in an elegant room with warm beige plaster walls and light oak floor. Window treatment: ' + STYLES[style] +
      ', professionally installed, real fabric physics and gravity, realistic soft daylight with natural shadows inside the folds. ' +
      'CRITICAL: the curtain/blind fabric is a solid, plain, matte chroma-key green (#00B140) with no pattern and no print, so it can be replaced in post-production; keep realistic light and shadow on the green fabric. ' +
      'Nothing else in the image is green: no plants, no green objects; the view outside the window is a bright overcast sky with blurred buildings. Architectural Digest photography, 35mm lens, sharp, no people, no text, no watermark.';

    const res = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    if (!res?.url) return Response.json({ error: 'Image generation failed' }, { status: 500 });

    const existing = await base44.entities.RenderTemplate.filter({ style });
    if (existing[0]) await base44.entities.RenderTemplate.update(existing[0].id, { image: res.url });
    else await base44.entities.RenderTemplate.create({ style, image: res.url });
    return Response.json({ image: res.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}