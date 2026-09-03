const cheerio = require("cheerio");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Récupère le HTML d'une URL et en extrait le texte du corps d'article,
// en retirant la navigation, le footer, les scripts et le bruit habituel.
async function fetchPageText(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    $(
      "script, style, nav, footer, header, aside, form, noscript, iframe, svg, " +
        "[role='navigation'], [role='banner'], [role='contentinfo'], .cookie, .cookies, " +
        "#cookie, #cookies, .menu, .breadcrumb, .breadcrumbs, .newsletter, .social, .share"
    ).remove();

    // Priorité au conteneur d'article si on en trouve un, sinon le body entier.
    const main =
      $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");

    const text = main
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return text;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchPageText };
