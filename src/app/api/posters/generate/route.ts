import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Prompt builder (mirrors skill/webapp/app/generation.py)
// ---------------------------------------------------------------------------

const TYPOGRAPHY_STYLE_DIRECTIONS: Record<string, string[]> = {
  dinner: [
    "Premium dinner-event treatment: elegant high-contrast serif or refined engraved lettering, champagne/ivory/copper/emerald palette, subtitle in thin sans-serif or script. Do not repeat the same all-gold casino serif look.",
    "Fine-dining poster treatment: warm copper and ivory title, subtle emerald shadows, elegant script subtitle, refined restaurant-menu luxury mixed with casino neon reflections.",
  ],
  party: [
    "Pop celebration treatment: playful rounded 3D lettering, saturated violet/turquoise/lime/pink palette, glossy sticker-like depth, subtitle as a dynamic ribbon or badge.",
    "Confetti party treatment: chunky joyful display font, rainbow neon edge lights, hot-pink/yellow/cyan palette, subtitle as a glowing handwritten party tagline.",
  ],
  sports: [
    "Sports/action treatment: italic block sans-serif, white/red/blue/orange palette, motion streaks, arena-scoreboard influence mixed with casino neon, subtitle in compact athletic lettering.",
    "Championship poster treatment: bold varsity/block lettering, electric blue and red rim lights, scoreboard-style subtitle, metallic but not gold-dominant.",
  ],
  music: [
    "Music/nightlife treatment: club-flyer typography, bold plasma/chrome title, purple/pink/electric-blue palette, subtitle in glowing handwritten script.",
    "Live-show neon treatment: dynamic concert-poster title, cyan/purple laser glow, chrome edges, subtitle as a cursive neon sign integrated into the gaming hall.",
  ],
  gaming: [
    "Electric neon title treatment: bold futuristic sans-serif or rounded display lettering, cyan/magenta/blue glow, chrome or glass edges, subtitle in contrasting cursive neon. Avoid dominant gold serif.",
    "Vintage slot-marquee title treatment: chunky condensed display lettering, red/orange/yellow bulbs, casino sign energy, subtitle on a small illuminated sign. Use gold only as an accent, not the whole title.",
    "Retro gaming treatment: pixel/arcade-inspired display lettering, green/red/yellow LED palette, jackpot-screen influence, subtitle as a digital light-board caption.",
  ],
  default: [
    "Electric neon title treatment: bold futuristic sans-serif or rounded display lettering, cyan/magenta/blue glow, chrome or glass edges, subtitle in contrasting cursive neon. Avoid dominant gold serif.",
    "Vintage slot-marquee title treatment: chunky condensed display lettering, red/orange/yellow bulbs, casino sign energy, subtitle on a small illuminated sign. Use gold only as an accent, not the whole title.",
    "Pop celebration treatment: playful rounded 3D lettering, saturated violet/turquoise/lime/pink palette, glossy sticker-like depth, subtitle as a dynamic ribbon or badge.",
    "Retro gaming treatment: pixel/arcade-inspired display lettering, green/red/yellow LED palette, jackpot-screen influence, subtitle as a digital light-board caption.",
  ],
};

function _typographyCategory(text: string): string {
  const lowered = text.toLowerCase();
  if (["basket", "calcio", "sport", "torneo", "partita", "campionato"].some((w) => lowered.includes(w))) {
    return "sports";
  }
  if (["cena", "chef", "ristorante", "buffet", "aperitivo", "vip", "gala"].some((w) => lowered.includes(w))) {
    return "dinner";
  }
  if (["festa", "party", "compleanno", "coriandoli", "carnevale", "happy"].some((w) => lowered.includes(w))) {
    return "party";
  }
  if (["dj", "musica", "live", "concerto", "karaoke", "disco", "dance"].some((w) => lowered.includes(w))) {
    return "music";
  }
  if (["slot", "jackpot", "casino", "bingo", "gaming", "las vegas"].some((w) => lowered.includes(w))) {
    return "gaming";
  }
  return "default";
}

function _typographyDirection(params: {
  titolo: string;
  sottotitolo?: string;
  tema?: string;
  aspectRatio: string;
  id: string;
}): string {
  const titleCategory = _typographyCategory(params.titolo);
  const eventText = [params.titolo, params.sottotitolo ?? "", params.tema ?? ""].join(" ");
  const category = titleCategory !== "default" ? titleCategory : _typographyCategory(eventText);
  const candidates = TYPOGRAPHY_STYLE_DIRECTIONS[category] ?? TYPOGRAPHY_STYLE_DIRECTIONS.default;
  const seed = [params.id, params.titolo, params.sottotitolo ?? "", params.tema ?? "", params.aspectRatio].join("|");
  const digest = crypto.createHash("sha256").update(seed, "utf-8").digest("hex");
  const style = candidates[parseInt(digest.slice(0, 8), 16) % candidates.length];
  return (
    `Theme typography family: ${category}.\n` +
    `${style}\n` +
    "Variation rule: title and subtitle font family, color palette, material, glow, " +
    "decorative frame, and text effects MUST feel different from poster to poster. " +
    "Do NOT default to the same embossed gold serif title unless the event explicitly " +
    "requires a luxury/VIP gold treatment."
  );
}

const PROMPT_TEMPLATE = `Professional event poster background, aspect ratio {aspect_ratio}, ultra detailed cinematic illustration.

EVENT THEME: {tema}

MANDATORY GAMING HALL BACKGROUND — ALWAYS REQUIRED:
Regardless of the event theme, the poster MUST clearly feel like it belongs inside a modern Italian sala slot / gaming hall. Include multiple recognizable gaming-hall elements in the background and side areas: rows of slot machines or VLT cabinets, glowing reels, jackpot LED screens, neon casino-style signs, colorful machine buttons, gaming lights, chips, cards, roulette-inspired details, reflective floors, and arcade-like luminous aisles.
These elements must be visually present and recognizable in EVERY generated poster, even when the client only provides a generic party, dinner, music, birthday, sports, guest, or collaboration theme.
Do NOT make the background a generic concert stage, empty party room, abstract gradient, or sports arena only. The event theme can dominate the mood, but the sala slot / gaming hall identity must remain obvious.
Keep these gaming-hall elements behind or around the main subject and typography; they must NOT cover the title, guest, collaboration assets, date/time text, or the bottom logo-safe area.

TYPOGRAPHY STYLE DIRECTION — MUST VARY BETWEEN POSTERS:
{typography_direction}

TITLE TEXT (must appear stunning at the TOP-CENTER of the poster, large impact, 3D rendered typography following the typography style direction above — well-proportioned, must not overlap subject):
"{titolo}"
{sottotitolo_block}
{datetime_block}

VISUAL DIRECTION:
- Setting and atmosphere matching the theme described above
- Rich, vibrant, photo-real sala slot / casino / nightlife / event aesthetic
- The background must contain visible slot-machine and gaming-hall objects, not just lights or confetti
- Dramatic cinematic lighting, dominant warm or theme-appropriate palette
- High contrast, dynamic composition

CRITICAL CONSTRAINT — LOGO AREA:
The BOTTOM CENTER of the poster (roughly the bottom 20%) MUST be left completely free of any text, logos, watermarks, signs or placeholder boxes.
Keep it as plain background (e.g. clean floor, ground, sky, grass, or simple gradient) so a real brand logo can be composited there afterwards. Do NOT draw "LAS VEGAS", "PLAYPARK", or any fake brand mark.
`;

function buildPrompt(params: {
  titolo: string;
  sottotitolo?: string;
  dataEvento?: string;
  oraEvento?: string;
  tema?: string;
  aspectRatio: string;
  id: string;
}): string {
  const sottotitoloBlock = params.sottotitolo
    ? `\nSECONDARY TEXT (smaller, below the title, coordinated with the title but using a visibly distinct color/font treatment):\n"${params.sottotitolo}"`
    : "";

  const datetimeParts = [params.dataEvento, params.oraEvento].filter(Boolean);
  const datetimeBlock = datetimeParts.length
    ? `\nDATE/TIME TEXT (clearly readable, integrated into the design):\n"${datetimeParts.join(" — ")}"`
    : "";

  const ratioText = params.aspectRatio === "auto" ? "your choice of orientation" : params.aspectRatio;

  return PROMPT_TEMPLATE.replace("{aspect_ratio}", ratioText)
    .replace("{tema}", params.tema || params.titolo)
    .replace("{typography_direction}", _typographyDirection(params))
    .replace("{titolo}", params.titolo)
    .replace("{sottotitolo_block}", sottotitoloBlock)
    .replace("{datetime_block}", datetimeBlock);
}

// ---------------------------------------------------------------------------
// Kie.ai client (mirrors scripts/generate_image_kie.py)
// ---------------------------------------------------------------------------

const KIE_API_BASE = "https://api.kie.ai/api/v1";
const KIE_SUPPORTED_RATIOS = new Set([
  "auto", "1:1", "5:4", "4:5", "9:16", "16:9", "21:9", "4:3", "3:4", "3:2", "2:3",
]);

async function _kieCreateTask(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  resolution: string
): Promise<string> {
  const payload = {
    model: "gpt-image-2-text-to-image",
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
    },
  };

  const resp = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Kie createTask HTTP ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  if (data.code !== 200) {
    throw new Error(`Kie API error: ${data.msg} (code ${data.code})`);
  }
  return data.data.taskId as string;
}

async function _kiePollTask(
  apiKey: string,
  taskId: string,
  maxWait = 300,
  interval = 5
): Promise<string[]> {
  const start = Date.now();
  while (true) {
    const resp = await fetch(`${KIE_API_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Kie poll HTTP ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    if (data.code !== 200) {
      throw new Error(`Kie API error: ${data.msg} (code ${data.code})`);
    }

    const state = data.data.state as string;
    if (state === "success") {
      const result = JSON.parse(data.data.resultJson || "{}") as { resultUrls?: string[] };
      const urls = result.resultUrls ?? [];
      if (!urls.length) throw new Error("Task succeeded but no resultUrls");
      return urls;
    }

    if (state === "fail") {
      throw new Error(`Kie generation failed: [${data.data.failCode}] ${data.data.failMsg}`);
    }

    if ((Date.now() - start) / 1000 > maxWait) {
      throw new Error(`Kie task did not complete in ${maxWait}s`);
    }

    await new Promise((r) => setTimeout(r, interval * 1000));
  }
}

async function _downloadImage(url: string): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Logo compositing with sharp (mirrors composite_logo.py)
// ---------------------------------------------------------------------------

async function findLogoFile(sede: string): Promise<string | null> {
  const logosDir = path.join(process.cwd(), "public", "logos");
  const files = await fs.readdir(logosDir);
  const target = sede.toLowerCase().replace(/\s+/g, "");
  const match = files.find((f) => f.toLowerCase().replace(/\.png$/, "") === target);
  return match ? path.join(logosDir, match) : null;
}

function parseAspectRatio(ratioStr: string): { w: number; h: number } {
  const map: Record<string, [number, number]> = {
    "1:1": [1, 1],
    "16:9": [16, 9],
    "9:16": [9, 16],
    "4:3": [4, 3],
    "3:4": [3, 4],
    "21:9": [21, 9],
  };
  if (map[ratioStr]) return { w: map[ratioStr][0], h: map[ratioStr][1] };
  const [w, h] = ratioStr.split(":").map(Number);
  if (!w || !h) throw new Error(`Aspect ratio '${ratioStr}' not understood`);
  return { w, h };
}

async function compositePoster(
  posterBuffer: Buffer,
  logoPath: string,
  aspectRatio?: string
): Promise<Buffer> {
  let posterSharp = sharp(posterBuffer);
  const posterMeta = await posterSharp.metadata();
  let posterW = posterMeta.width ?? 0;
  let posterH = posterMeta.height ?? 0;

  // Crop to aspect ratio if requested
  if (aspectRatio && aspectRatio !== "auto") {
    const { w: tw, h: th } = parseAspectRatio(aspectRatio);
    const targetRatio = tw / th;
    const currentRatio = posterW / posterH;

    let left = 0;
    let top = 0;
    let cropW = posterW;
    let cropH = posterH;

    if (currentRatio > targetRatio) {
      cropW = Math.round(posterH * targetRatio);
      left = Math.round((posterW - cropW) / 2);
    } else if (currentRatio < targetRatio) {
      cropH = Math.round(posterW / targetRatio);
      top = Math.round((posterH - cropH) / 2);
    }

    posterSharp = posterSharp.extract({ left, top, width: cropW, height: cropH });
    const croppedBuffer = await posterSharp.toBuffer();
    const croppedMeta = await sharp(croppedBuffer).metadata();
    posterW = croppedMeta.width ?? cropW;
    posterH = croppedMeta.height ?? cropH;
    posterSharp = sharp(croppedBuffer);
  }

  // Load and resize logo
  const logoBuffer = await fs.readFile(logoPath);
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoW = logoMeta.width ?? 0;
  const logoH = logoMeta.height ?? 0;

  const targetLogoWidth = Math.round(posterW * 0.3125);
  let resizedLogoBuffer: Buffer;

  if (logoW > posterW || logoH > posterH) {
    resizedLogoBuffer = await sharp(logoBuffer)
      .resize(Math.round(posterW * 0.3125), Math.round(posterH * 0.3125), { fit: "inside" })
      .toBuffer();
  } else {
    resizedLogoBuffer = await sharp(logoBuffer)
      .resize(targetLogoWidth, null, { withoutEnlargement: false })
      .toBuffer();
  }

  const resizedMeta = await sharp(resizedLogoBuffer).metadata();
  const rLogoW = resizedMeta.width ?? targetLogoWidth;
  const rLogoH = resizedMeta.height ?? 0;

  const padding = Math.round(posterH * 0.05);
  let x = Math.round((posterW - rLogoW) / 2);
  let y = posterH - rLogoH - padding;

  x = Math.max(0, Math.min(x, posterW - rLogoW));
  y = Math.max(0, Math.min(y, posterH - rLogoH));

  const finalBuffer = await posterSharp
    .composite([{ input: resizedLogoBuffer, left: x, top: y }])
    .png()
    .toBuffer();

  return finalBuffer;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      titolo: string;
      sottotitolo?: string;
      dataEvento?: string;
      oraEvento?: string;
      tema?: string;
      aspectRatio?: string;
      sede: string;
    };

    const {
      titolo,
      sottotitolo,
      dataEvento,
      oraEvento,
      tema,
      aspectRatio = "16:9",
      sede,
    } = body;

    if (!titolo || !sede) {
      return NextResponse.json({ error: "Titolo e sede sono obbligatori." }, { status: 400 });
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "KIE_API_KEY not configured." }, { status: 500 });
    }

    const logoPath = await findLogoFile(sede);
    if (!logoPath) {
      return NextResponse.json({ error: `Logo non trovato per la sede: ${sede}` }, { status: 400 });
    }

    const ratio = KIE_SUPPORTED_RATIOS.has(aspectRatio) ? aspectRatio : "auto";
    const id = crypto.randomUUID();

    const prompt = buildPrompt({
      titolo,
      sottotitolo,
      dataEvento,
      oraEvento,
      tema,
      aspectRatio: ratio,
      id,
    });

    const taskId = await _kieCreateTask(apiKey, prompt, ratio, "2K");
    const urls = await _kiePollTask(apiKey, taskId);
    const bgBuffer = await _downloadImage(urls[0]);

    const finalBuffer = await compositePoster(bgBuffer, logoPath, ratio === "auto" ? undefined : ratio);

    return new Response(new Uint8Array(finalBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore durante la generazione.";
    console.error("[POSTERS GENERATE]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
