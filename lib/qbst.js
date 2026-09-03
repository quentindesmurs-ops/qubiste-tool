// Algorithme d'extraction et de pondération des termes saillants (QBST).
// Rule-based, sans IA : cohérent avec le choix de rester en free tier.

const STOPWORDS = new Set(
  (
    "le la les de des du un une et en a au aux ce cet cette ces qui que quoi dont ou " +
    "pour par sur sous dans avec sans vers chez entre contre depuis pendant avant apres " +
    "plus moins tres trop peu beaucoup aussi ainsi alors donc mais ou car ni si comme " +
    "quand lorsque puisque afin est sont etait etaient sera seront ai as avons avez ont " +
    "suis es sommes etes fais fait faisons faites font peut peuvent doit doivent va vont " +
    "vais vas allons allez son sa ses leur leurs mon ma mes ton ta tes notre nos votre vos " +
    "on nous vous ils elles il elle je tu se soi meme memes autre autres tout toute tous " +
    "toutes chaque plusieurs quelque quelques aucun aucune certain certains certaine " +
    "certaines tel telle tels telles pas jamais rien personne ici voici voila cependant " +
    "toutefois neanmoins ailleurs enfin ensuite puis abord bien sur peut etre avoir faire " +
    "dire pouvoir vouloir devoir savoir falloir venir aller dont leurs sien sienne " +
    "mentions legales politique confidentialite cookies cookie plan site accueil contact " +
    "connexion inscription inscrire panier newsletter abonnez abonnement partager partagez " +
    "partage commentaire commentaires publie publier auteur redaction credit credits " +
    "photo copyright droits reserves accepter refuser parametres gerer lire suite " +
    "suivant precedent recherche rechercher menu navigation article articles retour haut " +
    "page pages www http https com fr sommaire cette celui celle ceux dune dun quil quelle " +
    "notamment ainsi lors ete etre cas non souvent raison fois forme forment doit plutot " +
    "ceci cela egalement seul seule manque quant tant selon sein voire"
  ).split(/\s+/).filter(Boolean)
);

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeTokens(text) {
  return stripAccents(text.toLowerCase())
    .replace(/[’']/g, " ")
    .replace(/[^a-z]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function filteredTokens(text) {
  return normalizeTokens(text).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function countTermsForPage(text, useBigrams) {
  const toks = filteredTokens(text);
  const uni = new Map();
  for (const t of toks) uni.set(t, (uni.get(t) || 0) + 1);
  const bi = new Map();
  if (useBigrams) {
    for (let i = 0; i < toks.length - 1; i++) {
      const bg = toks[i] + " " + toks[i + 1];
      bi.set(bg, (bi.get(bg) || 0) + 1);
    }
  }
  return { uni, bi };
}

function percentile(sorted, p) {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function unigramScore(docFreq, avg, nbPages) {
  return Math.pow(docFreq / nbPages, 1.6) * avg * 10;
}

/**
 * @param {Object} params
 * @param {string} params.keyword - mot-clé recherché (exclu des résultats)
 * @param {string[]} params.texts - contenu textuel de chaque page positionnée
 * @param {boolean} [params.useBigrams=true]
 * @param {number} [params.minDf=2] - doc frequency minimale pour retenir un concept
 * @param {string} [params.draftText] - brouillon de l'article, optionnel
 */
function analyzeQBST({ keyword, texts, useBigrams = true, minDf = 2, draftText }) {
  const nbPages = texts.length;
  const perPage = texts.map((t) => countTermsForPage(t, useBigrams));

  const uniAgg = new Map();
  perPage.forEach((p) => {
    p.uni.forEach((count, term) => {
      if (!uniAgg.has(term)) uniAgg.set(term, []);
      uniAgg.get(term).push(count);
    });
  });

  const biAgg = new Map();
  perPage.forEach((p) => {
    p.bi.forEach((count, term) => {
      if (!biAgg.has(term)) biAgg.set(term, []);
      biAgg.get(term).push(count);
    });
  });

  const uniScore = new Map();
  uniAgg.forEach((arr, term) => {
    const docFreq = arr.length;
    const avg = arr.reduce((a, b) => a + b, 0) / docFreq;
    uniScore.set(term, unigramScore(docFreq, avg, nbPages));
  });

  const clusters = new Map();
  function getCluster(key) {
    if (!clusters.has(key)) clusters.set(key, { key, members: [] });
    return clusters.get(key);
  }

  uniAgg.forEach((arr, term) => {
    const perPageMap = new Map();
    perPage.forEach((p, idx) => {
      if (p.uni.has(term)) perPageMap.set(idx, p.uni.get(term));
    });
    getCluster(term).members.push({ type: "uni", term, perPageCounts: perPageMap });
  });

  biAgg.forEach((arr, term) => {
    const [w1, w2] = term.split(" ");
    const s1 = uniScore.get(w1) || 0;
    const s2 = uniScore.get(w2) || 0;
    const anchor = s2 >= s1 ? w2 : w1;
    const perPageMap = new Map();
    perPage.forEach((p, idx) => {
      if (p.bi.has(term)) perPageMap.set(idx, p.bi.get(term));
    });
    getCluster(anchor).members.push({ type: "bi", term, perPageCounts: perPageMap });
  });

  const rows = [];
  clusters.forEach((cluster, key) => {
    const perPageTotal = new Array(nbPages).fill(0);
    cluster.members.forEach((m) => {
      m.perPageCounts.forEach((c, idx) => {
        perPageTotal[idx] += c;
      });
    });
    const present = perPageTotal.filter((c) => c > 0);
    const docFreq = present.length;
    if (docFreq < minDf) return;

    const total = present.reduce((a, b) => a + b, 0);
    const avg = total / docFreq;
    const score = unigramScore(docFreq, avg, nbPages);
    const sorted = [...present].sort((a, b) => a - b);
    let lo = Math.round(percentile(sorted, 0.25));
    let hi = Math.round(percentile(sorted, 0.75));
    if (hi < lo) hi = lo;
    if (hi === lo) hi = lo + (avg > lo ? 1 : 0);
    lo = Math.max(1, lo);
    hi = Math.max(lo, hi);

    const subterms = cluster.members
      .filter((m) => m.type === "bi")
      .map((m) => {
        let t = 0;
        m.perPageCounts.forEach((c) => (t += c));
        return { term: m.term, total: t };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((m) => m.term);

    let draftCount = null;
    if (draftText) {
      const draftParsed = countTermsForPage(draftText, useBigrams);
      let dc = draftParsed.uni.get(key) || 0;
      cluster.members.forEach((m) => {
        if (m.type === "bi") dc += draftParsed.bi.get(m.term) || 0;
      });
      draftCount = dc;
    }

    rows.push({ key, docFreq, total, avg, score, lo, hi, subterms, draftCount });
  });

  const kwTokens = new Set(filteredTokens(keyword || ""));
  const filtered = rows.filter((r) => !kwTokens.has(r.key));
  filtered.sort((a, b) => b.score - a.score);

  return { nbPages, rows: filtered.slice(0, 40) };
}

module.exports = { analyzeQBST, filteredTokens, countTermsForPage };
