"use client";

import { useState, useMemo } from "react";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [useBigrams, setUseBigrams] = useState(true);
  const [useDraft, setUseDraft] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [sources, setSources] = useState([]);
  const [rows, setRows] = useState(null);
  const [nbPages, setNbPages] = useState(0);
  const [hiddenTerms, setHiddenTerms] = useState(new Set());

  async function analyze() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setRows(null);
    setHiddenTerms(new Set());

    try {
      const res = await fetch("/api/qbst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          useBigrams,
          minDf: 2,
          draftText: useDraft ? draftText : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setSkipped(data.skipped || []);
        return;
      }
      setRows(data.rows);
      setNbPages(data.nbPages);
      setSources(data.sources || []);
      setSkipped(data.skipped || []);
    } catch (err) {
      setError("Impossible de contacter le serveur. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  function hideTerm(key) {
    setHiddenTerms((prev) => new Set(prev).add(key));
  }
  function unhideAll() {
    setHiddenTerms(new Set());
  }

  const visibleRows = useMemo(
    () => (rows ? rows.filter((r) => !hiddenTerms.has(r.key)) : []),
    [rows, hiddenTerms]
  );
  const maxScore = visibleRows.length ? visibleRows[0].score : 1;

  return (
    <div className="wrap">
      <header>
        <h1>
          Extracteur de termes saillants <span className="badge">QBST</span>
        </h1>
        <p>
          Tape un mot-clé : l'outil scanne la page 1 de Google, récupère le contenu des pages positionnées et en
          extrait le champ lexical pondéré, regroupé par concept — sur le principe QBST.
        </p>
      </header>

      <div className="grid">
        <div className="panel">
          <h2>Entrées</h2>
          <label htmlFor="kw">Mot-clé analysé</label>
          <input
            id="kw"
            type="text"
            placeholder="ex : grain de milium"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
          />

          <div className="options">
            <label className="check">
              <input type="checkbox" checked={useBigrams} onChange={(e) => setUseBigrams(e.target.checked)} />
              Inclure les expressions de 2 mots (bigrammes)
            </label>
            <label className="check">
              <input type="checkbox" checked={useDraft} onChange={(e) => setUseDraft(e.target.checked)} />
              Comparer à mon brouillon
            </label>
            {useDraft && (
              <textarea
                placeholder="Colle ici le texte de ton article en cours de rédaction..."
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
              />
            )}
          </div>

          <button className="btn btn-forest analyze-btn" onClick={analyze} disabled={loading}>
            {loading ? "Analyse en cours..." : "Analyser la SERP"}
          </button>
        </div>

        <div className="panel">
          <div className="results-head">
            <h2>Concepts &amp; termes saillants</h2>
            {rows && (
              <span className="meta">
                {nbPages} pages analysées · {visibleRows.length} concepts affichés
                {hiddenTerms.size > 0 && (
                  <>
                    {" "}· {hiddenTerms.size} masqué(s) (
                    <a href="#" onClick={(e) => { e.preventDefault(); unhideAll(); }} style={{ color: "var(--forest)" }}>
                      réafficher
                    </a>
                    )
                  </>
                )}
              </span>
            )}
          </div>

          {error && <div className="error-box">{error}</div>}

          {!error && !rows && !loading && (
            <div className="empty">Tape un mot-clé puis clique sur « Analyser la SERP ».</div>
          )}

          {loading && <div className="empty">Récupération et analyse des pages positionnées...</div>}

          {!error && rows && visibleRows.length === 0 && (
            <div className="empty">Tous les termes ont été masqués.</div>
          )}

          {!error && visibleRows.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Concept</th>
                  <th>Poids</th>
                  <th>Présence</th>
                  {useDraft && <th>Mon brouillon</th>}
                  <th>Fréquence conseillée</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => {
                  const pct = Math.max(4, Math.round((r.score / maxScore) * 100));
                  const rangeText = r.lo === r.hi ? `${r.lo}×` : `${r.lo}–${r.hi}×`;
                  const ok = useDraft && (r.draftCount || 0) >= r.lo;
                  return (
                    <tr key={r.key}>
                      <td className="term">
                        {r.key}
                        {r.subterms.length > 0 && (
                          <span className="subterms">
                            {r.subterms.join(", ")}
                            {r.subterms.length >= 3 ? "…" : ""}
                          </span>
                        )}
                      </td>
                      <td className="bar-cell">
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: pct + "%" }} />
                        </div>
                      </td>
                      <td className="docfreq">{r.docFreq}/{nbPages} pages</td>
                      {useDraft && (
                        <td>
                          <span className="status">
                            <span className={"dot " + (ok ? "dot-ok" : "dot-todo")} />
                            {r.draftCount || 0}
                          </span>
                        </td>
                      )}
                      <td className="range">{rangeText} dans l'article</td>
                      <td>
                        <button className="hide-btn" title="Masquer ce terme" onClick={() => hideTerm(r.key)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {sources.length > 0 && (
            <div className="sources">
              Pages analysées : {sources.map((s, i) => (
                <span key={s}>
                  <a href={s} target="_blank" rel="noreferrer">{new URL(s).hostname}</a>
                  {i < sources.length - 1 ? ", " : ""}
                </span>
              ))}
              {skipped.length > 0 && (
                <> — {skipped.length} page(s) ignorée(s) (scraping bloqué) : {skipped.map((s) => new URL(s).hostname).join(", ")}</>
              )}
            </div>
          )}
        </div>
      </div>

      <footer>
        Les termes sont regroupés en concepts autour de leur mot pivot — une approximation rule-based du
        regroupement sémantique, sans IA. Score = couverture inter-pages × fréquence moyenne d'usage. La plage
        recommandée reprend les occurrences observées sur les pages où le concept apparaît. Certains sites bloquent
        le scraping automatique (ex. anti-bot) — ils apparaissent en pages ignorées ci-dessus.
      </footer>
    </div>
  );
}
