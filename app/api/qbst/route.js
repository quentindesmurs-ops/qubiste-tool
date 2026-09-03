import { NextResponse } from "next/server";
import { fetchPageText } from "../../../lib/extract";
import { analyzeQBST } from "../../../lib/qbst";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const {
    keyword,
    draftText,
    useBigrams = true,
    minDf = 2,
    numResults = 8,
  } = body || {};

  if (!keyword || !keyword.trim()) {
    return NextResponse.json({ error: "Mot-clé manquant." }, { status: 400 });
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé Serper.dev absente côté serveur (SERPER_API_KEY)." },
      { status: 500 }
    );
  }

  let serpData;
  try {
    const serpRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: keyword,
        gl: "fr",
        hl: "fr",
        num: numResults,
      }),
    });
    serpData = await serpRes.json();
    if (!serpRes.ok) {
      return NextResponse.json(
        { error: "Serper.dev : " + (serpData.message || serpRes.statusText) },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: "Échec de l'appel à Serper.dev." }, { status: 502 });
  }

  const organic = (serpData.organic || []).slice(0, numResults);
  const urls = organic.map((r) => r.link).filter(Boolean);

  if (urls.length === 0) {
    return NextResponse.json({ error: "Aucun résultat organique trouvé pour ce mot-clé." }, { status: 422 });
  }

  const pageResults = await Promise.all(
    urls.map(async (url) => ({ url, text: await fetchPageText(url) }))
  );

  const validPages = pageResults.filter((p) => p.text && p.text.length > 300);
  const skipped = pageResults.filter((p) => !p.text || p.text.length <= 300).map((p) => p.url);

  if (validPages.length < 2) {
    return NextResponse.json(
      {
        error:
          "Pas assez de pages exploitables — certains sites bloquent le scraping automatique. Réessaie avec un autre mot-clé, ou vérifie les pages ci-dessous.",
        skipped: pageResults.map((p) => p.url),
      },
      { status: 422 }
    );
  }

  const result = analyzeQBST({
    keyword,
    texts: validPages.map((p) => p.text),
    useBigrams,
    minDf,
    draftText,
  });

  return NextResponse.json({
    ...result,
    sources: validPages.map((p) => p.url),
    skipped,
  });
}
