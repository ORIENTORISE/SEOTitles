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
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: `${count} car. (Optimal Google)`,
        dot: 'bg-emerald-500',
      };
    }
    if (count < 50) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        text: `${count} car. (Court)`,
        dot: 'bg-amber-500',
      };
    }
    if (count <= 68) {
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        text: `${count} car. (Acceptable)`,
        dot: 'bg-blue-500',
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      text: `${count} car. (Risque de coupure)`,
      dot: 'bg-rose-500',
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Barre de navigation minimaliste */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-none">SEO Title Lab</h1>
              <span className="text-xs text-slate-500 font-medium">Générateur de Titres Google</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {envApiKey ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Cloudflare VITE_KEY connectée
              </span>
            ) : manualKey ? (
              <button
                onClick={() => setShowKeyModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Key className="w-3 h-3 text-amber-600" />
                Clé manuelle active
              </button>
            ) : (
              <button
                onClick={() => setShowKeyModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                Configurer Clé API
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenu principal centré */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Titre & Sous-titre */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Propulsé par Google Gemini (gemini-1.5-flash)
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            5 Titres SEO Accrocheurs en 1 Clic
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Saisissez votre mot-clé cible pour générer instantanément des balises Title percutantes,
            calibrées pour le CTR et le référencement Google.
          </p>
        </div>

        {/* Message d'erreur visuel */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-900">Une attention est requise</p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">{error}</p>
              {!activeApiKey && (
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className="mt-2 text-xs font-semibold text-rose-900 underline hover:text-rose-950 inline-flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  Renseigner votre clé Gemini maintenant
                </button>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-600 p-1 text-xs"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Formulaire de recherche et options */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/90 mb-8 transition-all">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="keyword-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Mot-clé principal ou thématique
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  id="keyword-input"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ex : dropshipping 2025, formation seo, recettes saines..."
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-60"
                  autoFocus
                />
              </div>
            </div>

            {/* Suggestions de mots-clés rapides */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pt-1">
              <span className="font-medium text-slate-400">Exemples :</span>
              {quickKeywords.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setKeyword(tag)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Filtre d'intention / Angle SEO */}
            <div className="pt-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span>Angle éditorial souhaité :</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { id: 'tous', label: 'Équilibré (Varié)' },
                  { id: 'guide', label: 'Guide & Tuto' },
                  { id: 'liste', label: 'Top & Chiffres' },
                  { id: 'commercial', label: 'Bénéfice & CTR' },
                  { id: 'questions', label: 'Question / Problème' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIntent(opt.id as typeof intent)}
                    className={`py-2 px-3 rounded-lg font-medium border text-center transition-all ${
                      intent === opt.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton de génération avec état de chargement */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Génération des 5 titres SEO en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Générer 5 titres SEO optimisés</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des résultats */}
        {titles.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Titres générés pour Google</h3>
                <p className="text-xs text-slate-500">
                  Idéalement entre 50 et 60 caractères pour éviter toute troncature dans la SERP.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all self-start sm:self-auto cursor-pointer"
              >
                {copiedId === 'all' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tous copiés !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copier tous les 5 titres</span>
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
                    className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Numéro */}
                        <span className="shrink-0 w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center mt-0.5 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          {item.id}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-slate-900 leading-snug break-words">
                            {item.title}
                          </p>

                          {/* Metas : longueur & angle */}
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 text-2xs sm:text-xs font-medium px-2 py-0.5 rounded-md border ${badge.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              {badge.text}
                            </span>

                            {item.angle && (
                              <span className="text-2xs sm:text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {item.angle}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setPreviewTitle(item.title)}
                              className="text-2xs sm:text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 ml-auto"
                            >
                              <Eye className="w-3 h-3" />
                              Aperçu Google
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bouton de copie avec indicateur visuel temporaire "Copié !" */}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.title, item.id)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-400/20'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                        title="Copier ce titre"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600 animate-in zoom-in-50 duration-150" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-500" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simulation de la SERP Google (Aperçu direct du résultat sélectionné) */}
            {previewTitle && (
              <div className="mt-8 p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-indigo-600" />
                    Simulation d'affichage Google SERP (Mobile & Desktop)
                  </span>
                  <span className="text-2xs text-slate-400">Aperçu en direct</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-2xs font-bold">
                      G
                    </div>
                    <span className="truncate">https://votre-site.com › {keyword ? encodeURIComponent(keyword) : 'guide'}</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-medium text-blue-800 hover:underline cursor-pointer leading-snug">
                    {previewTitle}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    Découvrez tous les secrets et astuces indispensables pour réussir avec {keyword || 'votre sujet'}.
                    Guide complet, conseils d'experts et méthodes prouvées étape par étape.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accordéon Accord Clé d'API & Déploiement Cloudflare Pages */}
        <div className="mt-10 border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowCloudflareHelp(!showCloudflareHelp)}
            className="w-full p-4 flex items-center justify-between font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Guide de déploiement Cloudflare Pages & Variable d'environnement</span>
            </div>
            {showCloudflareHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCloudflareHelp && (
            <div className="p-4 pt-0 border-t border-slate-100 text-slate-600 space-y-3 bg-slate-50/50">
              <p>
                Cette application est configurée pour fonctionner nativement avec <strong>Cloudflare Pages</strong> sans
                aucun backend nécessaire.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li>
                  Rendez-vous dans votre tableau de bord <strong>Cloudflare Dashboard</strong> &gt; <em>Workers &amp; Pages</em>.
                </li>
                <li>Sélectionnez votre projet Cloudflare Pages.</li>
                <li>Allez dans <strong>Settings &gt; Environment variables</strong>.</li>
                <li>
                  Ajoutez la variable <code>VITE_GEMINI_API_KEY</code> avec votre clé d'API Google Gemini (obtenue sur{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline font-medium"
                  >
                    Google AI Studio
                  </a>
                  ).
                </li>
                <li>Redéployez le projet : la variable sera injectée automatiquement au build Vite.</li>
              </ol>
            </div>
          )}
        </div>
      </main>

      {/* Modal de configuration manuelle de la clé API */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3>Configuration de la Clé API Gemini</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Pour des tests en local ou un aperçu immédiat sans recompiler vos variables d'environnement, vous pouvez
              saisir temporairement votre clé ici. Elle ne quittera jamais votre navigateur.
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
                <label htmlFor="modal-key-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Clé Google Gemini (AIzaSy...)
                </label>
                <input
                  id="modal-key-input"
                  name="api_key"
                  type="password"
                  defaultValue={manualKey}
                  placeholder="Collez votre clé API Gemini ici..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                >
                  Obtenir une clé gratuite
                  <ExternalLink className="w-3 h-3" />
                </a>

                {manualKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualKey('');
                      localStorage.removeItem('seo_gemini_key');
                      setShowKeyModal(false);
                    }}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    Effacer la clé
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer épuré */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Prêt pour déploiement Cloudflare Pages & GitHub</span>
          </div>
          <div>
            <span>100% Client-Side • Modèle gemini-1.5-flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
