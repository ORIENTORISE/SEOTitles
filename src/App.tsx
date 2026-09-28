import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Key,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Info,
  Sliders,
  Cpu,
  Terminal,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface SeoTitleItem {
  id: number;
  title: string;
  charCount: number;
  angle?: string;
}

export default function App() {
  // Récupération de la clé API depuis les variables d'environnement Cloudflare Pages / Vite
  const envApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || '';

  // Possibilité de renseigner une clé temporaire dans l'UI si la variable d'env n'est pas encore définie
  const [manualKey, setManualKey] = useState<string>(() => {
    return localStorage.getItem('seo_gemini_key') || '';
  });
  const [showKeyModal, setShowKeyModal] = useState(false);

  const activeApiKey = envApiKey || manualKey;

  // États du formulaire et de la génération
  const [keyword, setKeyword] = useState('');
  const [intent, setIntent] = useState<'tous' | 'guide' | 'liste' | 'commercial' | 'questions'>('tous');
  const [isLoading, setIsLoading] = useState(false);
  const [titles, setTitles] = useState<SeoTitleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // État de copie
  const [copiedId, setCopiedId] = useState<number | 'all' | null>(null);

  // Aperçu SERP Google
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);

  // Accordeon info Cloudflare
  const [showCloudflareHelp, setShowCloudflareHelp] = useState(false);

  // Sauvegarde clé manuelle
  const handleSaveManualKey = (key: string) => {
    const cleanKey = key.trim();
    setManualKey(cleanKey);
    localStorage.setItem('seo_gemini_key', cleanKey);
    setShowKeyModal(false);
    setError(null);
  };

  // Copie d'un titre dans le presse-papiers
  const copyToClipboard = async (text: string, id: number | 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Copier tous les titres d'un coup
  const handleCopyAll = () => {
    if (titles.length === 0) return;
    const textAll = titles.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
    copyToClipboard(textAll, 'all');
  };

  // Génération des 5 titres SEO via Google Gemini API
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      setError('Veuillez renseigner un mot-clé ou un sujet avant de lancer la génération.');
      return;
    }

    if (!activeApiKey) {
      setError(
        'Clé API manquante : La variable d\'environnement VITE_GEMINI_API_KEY n\'est pas configurée dans Cloudflare Pages ou votre fichier .env.'
      );
      setShowKeyModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const intentPrompt =
      intent === 'guide'
        ? 'Privilégie des angles de guides, tutoriels pas-à-pas et méthodes pratiques.'
        : intent === 'liste'
        ? 'Privilégie des angles de listes chiffrées (ex: 7 astuces, 10 meilleurs outils).'
        : intent === 'commercial'
        ? 'Privilégie des angles transactionnels, comparatifs et axés conversion/bénéfices.'
        : intent === 'questions'
        ? 'Privilégie des angles interrogatifs résolvant un problème concret de l\'internaute.'
        : 'Varie les approches : guide, chiffres, bénéfice direct, curiosité, formule percutante.';

    const systemPrompt = `Tu es un expert SEO senior et copywriter spécialisé dans l'optimisation des balises <title> pour Google.
Objectif : Génère exactement 5 titres SEO percutants, captivants et optimisés pour le mot-clé : "${trimmedKeyword}".

Directives strictes :
1. Chaque titre doit faire idéalement entre 50 et 60 caractères (ne dépasse jamais 65 caractères pour éviter la troncature sur Google).
2. Le mot-clé principal ou sa variante directe doit apparaître naturellement (de préférence en début de titre).
3. Utilise des déclencheurs de clics (chiffres, années en cours, bénéfices concrets, parenthèses ou crochets).
4. ${intentPrompt}
5. Réponds UNIQUEMENT avec un tableau JSON valide contenant exactement 5 objets avec les clés "title" (string) et "angle" (court libellé de 1 ou 2 mots comme "Guide", "Chiffré", "Action", "Comparatif", "Direct").
Exemple de format attendu :
[
  {"title": "Titre SEO optimisé 1", "angle": "Guide"},
  {"title": "Titre SEO optimisé 2", "angle": "Chiffré"},
  {"title": "Titre SEO optimisé 3", "angle": "Bénéfice"},
  {"title": "Titre SEO optimisé 4", "angle": "Curiosité"},
  {"title": "Titre SEO optimisé 5", "angle": "Question"}
]`;

    try {
      // Modèle officiel demandé : gemini-1.5-flash via fetch POST
      const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
        activeApiKey
      )}`;

      let response = await fetch(primaryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
          },
        }),
      });

      // Gestion de bascule si gemini-1.5-flash est introuvable ou renvoie une erreur de version
      if (!response.ok && (response.status === 404 || response.status === 400)) {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          activeApiKey
        )}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
          }),
        });

        if (fallbackResponse.ok) {
          response = fallbackResponse;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errMsg = errorData?.error?.message || `Erreur HTTP ${response.status} (${response.statusText})`;

        if (response.status === 400 && errMsg.includes('API key not valid')) {
          throw new Error('La clé API Google Gemini fournie est invalide. Vérifiez votre clé.');
        } else if (response.status === 429) {
          throw new Error('Limite de requêtes atteinte (Quota Exceeded). Veuillez patienter quelques secondes.');
        } else {
          throw new Error(`Échec de l'appel API Google Gemini : ${errMsg}`);
        }
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Réponse vide reçue de l\'API Google Gemini.');
      }

      // Nettoyage et extraction JSON
      let cleanedJson = rawText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      let parsedItems: Array<{ title: string; angle?: string }> = [];

      try {
        const parsed = JSON.parse(cleanedJson);
        if (Array.isArray(parsed)) {
          parsedItems = parsed.map((item) => {
            if (typeof item === 'string') {
              return { title: item.replace(/^["'\d\.\-\s]+/, '').trim(), angle: 'SEO' };
            }
            return {
              title: (item.title || item.name || String(item)).replace(/^["'\d\.\-\s]+/, '').trim(),
              angle: item.angle || 'SEO',
            };
          });
        }
      } catch {
        // Fallback par analyse ligne par ligne si le modèle a renvoyé une liste numérotée
        const lines = rawText
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0 && !l.startsWith('```') && !l.startsWith('[') && !l.startsWith(']'));

        parsedItems = lines
          .map((line: string) => ({
            title: line.replace(/^(\d+[\.\)\-]|[-*•])\s*/, '').replace(/^"|"$/g, '').trim(),
            angle: 'SEO',
          }))
          .filter((item: { title: string }) => item.title.length > 10)
          .slice(0, 5);
      }

      if (parsedItems.length === 0) {
        throw new Error('Impossible d\'extraire les titres du format renvoyé par l\'IA.');
      }

      const formattedTitles: SeoTitleItem[] = parsedItems.slice(0, 5).map((item, index) => ({
        id: index + 1,
        title: item.title,
        charCount: item.title.length,
        angle: item.angle || 'SEO',
      }));

      setTitles(formattedTitles);
      setPreviewTitle(formattedTitles[0].title);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getCharBadge = (count: number) => {
    if (count >= 50 && count <= 60) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
        text: `${count} car. • Optimal Google`,
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
      };
    }
    if (count < 50) {
      return {
        bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
        text: `${count} car. • Court`,
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
      };
    }
    if (count <= 68) {
      return {
        bg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
        text: `${count} car. • Acceptable`,
        dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
      text: `${count} car. • Risque de coupure`,
      dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    };
  };

  const quickKeywords = [
    'création site web',
    'recettes saines faciles',
    'voyage japon pas cher',
    'formation copywriting',
    'perte de poids durable',
  ];

  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between overflow-hidden bg-grid-pattern selection:bg-cyan-500 selection:text-black">
      {/* Halos de lumière ambiante futuriste (Glow spots) */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[128px]"></div>
      <div className="pointer-events-none absolute -top-20 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[140px]"></div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px]"></div>
      <div className="pointer-events-none absolute -bottom-32 right-1/4 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-[140px]"></div>

      {/* Barre de navigation futuriste en verre dépoli */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#090d16]/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all group-hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]">
                <div className="w-full h-full bg-[#0b101b] rounded-[11px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white font-display">
                  SEO TITLE LAB
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 uppercase tracking-widest">
                  v2.5
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                IA Neural Engine
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {envApiKey ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"></span>
                <span>VITE_KEY CONNECTÉE</span>
              </span>
            ) : manualKey ? (
              <button
                onClick={() => setShowKeyModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/30 backdrop-blur-md hover:bg-amber-900/40 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.15)] cursor-pointer"
              >
                <Key className="w-3 h-3 text-amber-400" />
                <span>CLÉ ACTIVE</span>
              </button>
            ) : (
              <button
                onClick={() => setShowKeyModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer backdrop-blur-md"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configurer Clé API</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenu principal centré */}
      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Titre & Sous-titre façon cyber-technologique */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider bg-white/[0.04] text-cyan-300 border border-cyan-500/30 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Google Gemini Flash Neural Core</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 font-display">
            Générateur de Titres SEO
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Boostez votre taux de clic organique avec 5 propositions à fort impact algorithmique,
            formatées pour la SERP Google.
          </p>
        </div>

        {/* Message d'erreur visuel cyberpunk / glass */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 backdrop-blur-xl shadow-[0_0_25px_rgba(244,63,94,0.15)] animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-100 font-display">Interruption de flux</p>
              <p className="mt-0.5 text-rose-300 text-xs sm:text-sm leading-relaxed">{error}</p>
              {!activeApiKey && (
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className="mt-2 text-xs font-mono font-semibold text-cyan-300 hover:text-cyan-200 underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3" />
                  Renseigner la clé API Gemini maintenant
                </button>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 p-1 text-xs cursor-pointer"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Panneau de recherche en verre dépoli (Glass Panel) */}
        <div className="glass-panel rounded-3xl p-5 sm:p-7 mb-8 transition-all relative overflow-hidden">
          {/* Ligne néon supérieure décorative */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent"></div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="keyword-input"
                  className="text-xs font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Requête cible / Mot-clé</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">Prompt optimisé SEO</span>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cyan-400/80">
                  <Search className="w-5 h-5 group-focus-within:text-cyan-300 transition-colors" />
                </div>
                <input
                  id="keyword-input"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ex : dropshipping 2025, recettes saines, formation seo..."
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-4 glass-input rounded-2xl text-white placeholder-slate-400 text-base focus:outline-none transition-all disabled:opacity-60"
                  autoFocus
                />
              </div>
            </div>

            {/* Suggestions en pilules de verre */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-0.5">
              <span className="font-mono text-slate-400 text-[11px]">Exemples :</span>
              {quickKeywords.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setKeyword(tag)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-200 border border-white/[0.06] hover:border-cyan-500/40 transition-all font-mono text-[11px] cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>

            {/* Filtre d'intention / Angle SEO en verre */}
            <div className="pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-300 mb-2.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Format algorithmique :</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { id: 'tous', label: 'Équilibré (Varié)' },
                  { id: 'guide', label: 'Guide & Tuto' },
                  { id: 'liste', label: 'Top & Chiffres' },
                  { id: 'commercial', label: 'Bénéfice & CTR' },
                  { id: 'questions', label: 'Question / Soluce' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIntent(opt.id as typeof intent)}
                    className={`py-2.5 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer backdrop-blur-md ${
                      intent === opt.id
                        ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-200 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-semibold'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 border-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton de génération futuriste avec effet de halo */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="relative group w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer overflow-hidden font-display tracking-wide"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-200" />
                    <span>Calcul neuronal des 5 balises Title...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-cyan-200" />
                    <span>Générer 5 titres SEO optimisés</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des résultats avec cartes glass effect */}
        {titles.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>5 Titres Optimisés</span>
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Calibrage idéal : 50 à 60 caractères (zone d'or SERP Google)
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium text-cyan-300 bg-white/[0.04] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all self-start sm:self-auto cursor-pointer backdrop-blur-md"
              >
                {copiedId === 'all' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">TOUS LES 5 COPIÉS !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copier tout le pack (5)</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3">
              {titles.map((item) => {
                const badge = getCharBadge(item.charCount);
                const isCopied = copiedId === item.id;

                return (
                  <div
                    key={item.id}
                    className="glass-card rounded-2xl p-4 sm:p-5 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Numéro style cyber */}
                        <span className="shrink-0 w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center mt-0.5 group-hover:border-cyan-400 group-hover:text-white transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                          0{item.id}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-slate-100 leading-snug break-words group-hover:text-white transition-colors">
                            {item.title}
                          </p>

                          {/* Metas : longueur & angle */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 font-mono">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg border backdrop-blur-md ${badge.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              {badge.text}
                            </span>

                            {item.angle && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                                {item.angle}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setPreviewTitle(item.title)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1 ml-auto cursor-pointer hover:underline"
                            >
                              <Eye className="w-3 h-3" />
                              Visualiser SERP
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bouton de copie avec indicateur visuel temporaire "Copié !" */}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.title, item.id)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium transition-all border cursor-pointer backdrop-blur-md ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.08] hover:border-cyan-400/50'
                        }`}
                        title="Copier ce titre"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400 animate-in zoom-in-50 duration-150" />
                            <span className="font-bold">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simulation de la SERP Google version Dark Holographic */}
            {previewTitle && (
              <div className="mt-8 glass-panel rounded-2xl p-5 border border-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.1)] relative">
                <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Aperçu Réel • Simulation Google SERP</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Desktop / Mobile Preview</span>
                </div>

                <div className="space-y-1.5 bg-[#090d16]/80 p-4 rounded-xl border border-white/[0.05]">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                    <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 text-[9px] font-bold">
                      G
                    </div>
                    <span className="truncate text-slate-400">
                      https://votresite.com › {keyword ? encodeURIComponent(keyword) : 'guide'}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-medium text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer leading-snug">
                    {previewTitle}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
                    Découvrez toutes les clés indispensables et méthodes avancées pour optimiser votre visibilité sur{' '}
                    <strong className="text-slate-200">{keyword || 'votre thématique'}</strong>. Conseils pratiques,
                    analyse complète et résultats mesurables.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accordéon Accord Clé d'API & Déploiement Cloudflare Pages en Dark Glass */}
        <div className="mt-10 glass-panel rounded-2xl border border-white/[0.08] overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowCloudflareHelp(!showCloudflareHelp)}
            className="w-full p-4 flex items-center justify-between font-mono text-slate-300 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Guide Déploiement Cloudflare Pages & Variables d'environnement</span>
            </div>
            {showCloudflareHelp ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showCloudflareHelp && (
            <div className="p-4 pt-0 border-t border-white/[0.06] text-slate-300 space-y-3 bg-black/20">
              <p className="leading-relaxed">
                Cette application est 100% autonome (SPA Client-Side) et prête pour un déploiement instantané sur{' '}
                <strong className="text-cyan-300">Cloudflare Pages</strong>.
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-1 font-mono text-[11px] text-slate-300">
                <li>
                  Sur votre tableau de bord <strong>Cloudflare Dashboard</strong> &gt; <em>Workers &amp; Pages</em>.
                </li>
                <li>Sélectionnez votre projet Cloudflare Pages relié à votre repo GitHub.</li>
                <li>Naviguez dans <strong>Settings &gt; Environment variables</strong>.</li>
                <li>
                  Ajoutez la variable <code className="text-cyan-300 bg-cyan-950/50 px-1 py-0.5 rounded border border-cyan-800/40">VITE_GEMINI_API_KEY</code> avec votre clé d'API Google Gemini.
                </li>
                <li>
                  Redéployez le build : Vite injecte la variable au moment de la compilation sans exposer de secrets de backend !
                </li>
              </ol>
            </div>
          )}
        </div>
      </main>

      {/* Modal futuriste en Dark Glass pour la clé API */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="glass-panel bg-[#0d131f]/95 rounded-3xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-cyan-500/30 relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-display text-lg">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3>Configuration Clé API Gemini</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Pour tester immédiatement en local ou sur un aperçu sans recompiler, vous pouvez saisir votre clé Google Gemini. Elle reste sécurisée et stockée localement dans votre navigateur.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('api_key') as HTMLInputElement;
                handleSaveManualKey(input.value);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="modal-key-input" className="block text-xs font-mono text-cyan-300 mb-1.5">
                  Clé Google Gemini (AIzaSy...)
                </label>
                <input
                  id="modal-key-input"
                  name="api_key"
                  type="password"
                  defaultValue={manualKey}
                  placeholder="Collez votre clé API Gemini ici..."
                  className="w-full px-3.5 py-3 text-sm glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1 hover:underline"
                >
                  Obtenir une clé Google AI Studio
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>

                {manualKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualKey('');
                      localStorage.removeItem('seo_gemini_key');
                      setShowKeyModal(false);
                    }}
                    className="text-rose-400 hover:text-rose-300 font-mono cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-mono font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-mono font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer minimaliste futuriste */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#07090e]/80 backdrop-blur-xl py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>100% Client-Side • Cloudflare Pages & GitHub Ready</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <span>MODÈLE : GEMINI-1.5-FLASH</span>
            <span>•</span>
            <span className="text-cyan-400">NEURAL ENGINE ACTIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
