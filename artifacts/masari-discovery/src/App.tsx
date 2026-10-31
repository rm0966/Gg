import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useAnalyzeDiscovery,
  useDeleteDiscovery,
  useGetAssessment,
  useGetDiscovery,
  useGetDiscoverySummary,
  useListAssessments,
  useListDiscoveries,
  getListDiscoveriesQueryKey,
  getGetDiscoverySummaryQueryKey,
} from '@workspace/api-client-react';
import type { AssessmentSummary, Discovery, DiscoveryListItem } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft, ArrowRight, Bookmark, Check, ChevronLeft, ChevronRight, Clock3, Compass,
  Download, FileText, Lightbulb, LoaderCircle, Moon, Sparkles, Sun, Trash2, TrendingUp,
  Wrench, BookOpen, Menu, X, RotateCcw, CircleHelp, Heart, Target,
} from 'lucide-react';

type Language = 'ar' | 'en';
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });
const assessmentGroups = [
  { id: 'self', ar: 'افهم نفسك', en: 'Know yourself', introAr: 'ابدأ من الداخل: ما الذي يحفّزك، وما الذي يجعلك أنت؟', introEn: 'Start from within: what drives you, and what makes you you?', icon: Compass },
  { id: 'future', ar: 'استكشف مستقبلك', en: 'Explore your future', introAr: 'قرّب الصورة بين اهتماماتك وخياراتك القادمة.', introEn: 'Connect your interests to the possibilities ahead.', icon: TrendingUp },
  { id: 'abilities', ar: 'اكتشف قدراتك', en: 'Find your strengths', introAr: 'قدراتك تظهر بأشكال كثيرة؛ بعضها عملي وبعضها إبداعي.', introEn: 'Strength takes many forms: practical, creative, and more.', icon: Wrench },
];
const knownAssessmentNames: Record<string, { ar: string; en: string }> = {
  personality: { ar: 'ملامح شخصيتك', en: 'Personality' }, passion: { ar: 'ما يثير شغفك', en: 'Passions' },
  talents: { ar: 'مواهبك الطبيعية', en: 'Natural talents' }, 'thinking-style': { ar: 'أسلوب تفكيرك', en: 'Thinking style' },
  'motivations-values': { ar: 'دوافعك وقيمك', en: 'Motivations & values' }, profession: { ar: 'المهن التي تناسبك', en: 'Career fit' },
  'academic-interests': { ar: 'اهتماماتك الدراسية', en: 'Academic interests' }, 'business-ideas': { ar: 'أفكار ومشاريع', en: 'Business ideas' },
  'career-direction': { ar: 'اتجاهك المهني', en: 'Career direction' }, leadership: { ar: 'طريقتك في القيادة', en: 'Leadership' },
  'social-skills': { ar: 'مهاراتك الاجتماعية', en: 'Social skills' }, 'problem-solving': { ar: 'حل المشكلات', en: 'Problem solving' },
  creativity: { ar: 'التفكير الإبداعي', en: 'Creative thinking' }, 'practical-technical': { ar: 'مهارات عملية وتقنية', en: 'Practical & technical' },
  'learning-style': { ar: 'طريقة تعلّمك', en: 'Learning style' }, 'work-environment': { ar: 'بيئة العمل المناسبة', en: 'Work environment' },
};
const labelGroup = (group: string, lang: Language) => assessmentGroups.find((g) => g.id === group)?.[lang] ?? group;
const copy = (lang: Language) => ({
  navExplore: lang === 'ar' ? 'الاستكشاف' : 'Explore', navSaved: lang === 'ar' ? 'تقاريري المحفوظة' : 'Saved reports',
  noAccount: lang === 'ar' ? 'مساحة خاصة، بلا حساب' : 'Private by design. No account.',
  hello: lang === 'ar' ? 'خذ وقتك. اكتشف ما يناسبك.' : 'Take your time. Find what fits.',
  intro: lang === 'ar' ? 'مساري مساحة هادئة لتفهم نقاط قوتك، وتستكشف عملاً يشبهك — من الأفكار إلى المهن العملية.' : 'A quiet space to understand your strengths and explore work that feels like you—from big ideas to hands-on trades.',
  start: lang === 'ar' ? 'ابدأ استكشافك' : 'Begin exploring', saved: lang === 'ar' ? 'التقارير المحفوظة' : 'Saved reports',
  recent: lang === 'ar' ? 'آخر ما اكتشفته' : 'Your recent discoveries', viewAll: lang === 'ar' ? 'عرض الكل' : 'View all',
  mins: lang === 'ar' ? 'دقيقة' : 'min', questions: lang === 'ar' ? 'سؤال' : 'questions',
  back: lang === 'ar' ? 'السابق' : 'Back', next: lang === 'ar' ? 'التالي' : 'Continue',
  review: lang === 'ar' ? 'مراجعة الإجابات' : 'Review answers', finish: lang === 'ar' ? 'أنشئ تقريرك' : 'Create my report',
  savedDraft: lang === 'ar' ? 'إجاباتك محفوظة على هذا الجهاز' : 'Your answers are saved on this device',
  loading: lang === 'ar' ? 'لحظات، نجهّز مساحتك…' : 'Getting your space ready…',
  retry: lang === 'ar' ? 'حاول مرة أخرى' : 'Try again',
});

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('masari-language') as Language) || 'ar');
  const [dark, setDark] = useState(() => localStorage.getItem('masari-theme') !== 'light');
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('masari-language', language);
    localStorage.setItem('masari-theme', dark ? 'dark' : 'light');
  }, [language, dark]);
  const c = copy(language);
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <div className="app-shell">
          <header className="no-print sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
            <div className="content-wrap flex h-[76px] items-center justify-between">
              <Link href="/" className="flex items-center gap-3" data-testid="link-home">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><Compass size={21}/></span>
                <span className="leading-tight"><strong className="block text-[20px] tracking-tight">مساري</strong><small className="text-[11px] text-muted-foreground">MASARI</small></span>
              </Link>
              <nav className="hidden items-center gap-2 md:flex">
                <Link href="/" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted" data-testid="link-explore">{c.navExplore}</Link>
                <Link href="/saved" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted" data-testid="link-saved">{c.navSaved}</Link>
              </nav>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground sm:inline-flex">{c.noAccount}</span>
                <button className="grid size-10 place-items-center rounded-full transition hover:bg-muted" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} aria-label="Switch language" data-testid="button-language"><span className="text-xs font-semibold">{language === 'ar' ? 'EN' : 'عربي'}</span></button>
                <button className="grid size-10 place-items-center rounded-full transition hover:bg-muted" onClick={() => setDark(!dark)} aria-label="Toggle theme" data-testid="button-theme">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
                <button className="grid size-10 place-items-center rounded-full md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" data-testid="button-menu">{menuOpen ? <X size={19}/> : <Menu size={19}/>}</button>
              </div>
            </div>
            {menuOpen && <nav className="content-wrap flex gap-2 border-t border-border py-3 md:hidden"><Link onClick={() => setMenuOpen(false)} href="/" className="flex-1 rounded-xl bg-muted px-4 py-3 text-center text-sm" data-testid="mobile-link-explore">{c.navExplore}</Link><Link onClick={() => setMenuOpen(false)} href="/saved" className="flex-1 rounded-xl bg-muted px-4 py-3 text-center text-sm" data-testid="mobile-link-saved">{c.navSaved}</Link></nav>}
          </header>
          <RoutedErrorBoundary><Switch>
            <Route path="/" component={() => <Home language={language}/>}/>
            <Route path="/assessments/:assessmentId" component={() => <AssessmentWizard language={language}/>}/>
            <Route path="/results/:id" component={() => <ResultPage language={language}/>}/>
            <Route path="/saved" component={() => <SavedPage language={language}/>}/>
            <Route component={NotFound}/>
          </Switch></RoutedErrorBoundary>
          <footer className="no-print mt-16 border-t border-border/70 py-8">
            <div className="content-wrap flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>مساري · MASARI</span><span>{language === 'ar' ? 'رحلتك لك وحدك. إجاباتك تبقى في هذه المساحة الخاصة.' : 'Your journey is yours. Your answers stay in this private space.'}</span></div>
          </footer>
        </div>
      </WouterRouter>
      <Toaster/>
    </TooltipProvider>
  </QueryClientProvider>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Home({ language }: { language: Language }) {
  const c = copy(language);
  const assessments = useListAssessments();
  const summary = useGetDiscoverySummary();
  const discoveries = useListDiscoveries();
  const list = assessments.data ?? [];
  const loading = assessments.isLoading;
  const savedCount = summary.data?.totalResults ?? discoveries.data?.length ?? 0;
  const visibleGroup = (groupId: string) => list.filter((item) => item.group === groupId);
  return <main className="content-wrap pb-10">
    <section className="fade-in relative mt-8 overflow-hidden rounded-[30px] border border-border/70 bg-card px-6 py-9 sm:mt-12 sm:px-12 sm:py-14">
      <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full border border-primary/10"/><div className="pointer-events-none absolute -left-7 -top-12 size-48 rounded-full border border-primary/10"/>
      <div className="relative max-w-[690px]">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles size={14}/>{language === 'ar' ? 'مساحة اكتشافك الخاصة' : 'Your own space to explore'}</div>
        <h1 className="max-w-[680px] text-[clamp(2.2rem,6vw,4.25rem)] font-semibold leading-[1.18] tracking-tight">{c.hello}</h1>
        <p className="mt-5 max-w-[570px] text-base leading-8 text-muted-foreground sm:text-lg">{c.intro}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#explore" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90" data-testid="link-begin">{c.start}{language === 'ar' ? <ArrowLeft size={17}/> : <ArrowRight size={17}/>}</a>
          <Link href="/saved" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3.5 text-sm font-semibold transition hover:bg-muted" data-testid="link-saved-hero"><Bookmark size={16}/>{c.saved} <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{savedCount}</span></Link>
        </div>
      </div>
      <div className="mt-10 flex items-center gap-4 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:mt-12">
        <span className="grid size-9 place-items-center rounded-full bg-accent/20 text-foreground"><Heart size={16}/></span>
        <span>{language === 'ar' ? 'لا توجد إجابات صحيحة أو خاطئة. فقط ما يشبهك.' : 'No right or wrong answers. Just what feels true to you.'}</span>
      </div>
    </section>
    <section id="explore" className="mt-14 scroll-mt-28">
      <div className="mb-7 flex items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">{language === 'ar' ? 'مسارات الاستكشاف' : 'PATHS TO EXPLORE'}</p><h2 className="text-2xl font-semibold sm:text-3xl">{language === 'ar' ? 'اختر ما يلفت انتباهك' : 'Follow what catches your attention'}</h2></div><span className="hidden text-sm text-muted-foreground sm:block">{language === 'ar' ? 'كل خطوة بداية جيدة' : 'Every step is a good start'}</span></div>
      {assessments.isError ? <ErrorMessage language={language} onRetry={() => assessments.refetch()}/> : loading ? <div className="grid gap-5">{[1,2,3].map((i)=><div key={i} className="h-44 animate-pulse rounded-3xl bg-muted"/>)}</div> : <div className="space-y-8">
        {assessmentGroups.map((group, idx) => {
          const rows = visibleGroup(group.id);
          const Icon = group.icon;
          return <section key={group.id} className={`fade-in stagger-${idx+1} rounded-[26px] border border-border/75 bg-card/60 p-5 sm:p-7`}>
            <div className="mb-5 flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={22}/></div>
              <div><h3 className="text-xl font-semibold">{group[language]}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{group[`intro${language === 'ar' ? 'Ar' : 'En'}`]}</p></div>
              <span className="ms-auto mt-1 hidden rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground sm:block">{rows.length.toString().padStart(2,'0')}</span>
            </div>
            {rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">{language === 'ar' ? 'تُحمّل المسارات عند الاتصال بالخدمة.' : 'Paths will appear when the service is available.'}</div> :
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((a) => <AssessmentCard key={a.id} assessment={a} language={language}/>)}</div>}
          </section>;
        })}
      </div>}
    </section>
    <section className="mt-14 rounded-[26px] bg-primary px-6 py-7 text-primary-foreground sm:flex sm:items-center sm:justify-between sm:px-9">
      <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10"><Wrench size={20}/></div><div><h3 className="text-lg font-semibold">{language === 'ar' ? 'العمل الجيد له أشكال كثيرة' : 'Good work comes in many forms'}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-primary-foreground/75">{language === 'ar' ? 'من إصلاح السيارات والكهرباء والنجارة إلى الطبخ والزراعة والخياطة والتقنية. كل مهارة تستحق أن تُكتشف.' : 'From car mechanics, electrical work, carpentry and cooking to agriculture, sewing, and technology. Every skill is worth discovering.'}</p></div></div>
      <a href="#explore" className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-semibold text-foreground sm:mt-0" data-testid="link-practical-trades"><BookOpen size={16}/>{language === 'ar' ? 'استكشف قدراتك' : 'Explore your abilities'}</a>
    </section>
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary">{language === 'ar' ? 'مساحتك الخاصة' : 'YOUR PRIVATE SPACE'}</p><h2 className="text-2xl font-semibold">{c.recent}</h2></div><Link href="/saved" className="text-sm font-semibold text-primary" data-testid="link-view-all">{c.viewAll}</Link></div>
      {discoveries.isLoading ? <div className="h-28 animate-pulse rounded-3xl bg-muted"/> : discoveries.isError ? <ErrorMessage language={language} onRetry={() => discoveries.refetch()}/> : (discoveries.data?.length ?? 0) === 0 ?
        <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-8 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><FileText size={19}/></span><p className="mt-3 font-medium">{language === 'ar' ? 'ستجد تقاريرك هنا' : 'Your reports will live here'}</p><p className="mt-1 text-sm text-muted-foreground">{language === 'ar' ? 'ابدأ استكشافاً واحفظ أول اكتشاف لك.' : 'Complete an exploration to save your first discovery.'}</p></div> :
        <div className="grid gap-3 sm:grid-cols-2">{discoveries.data?.slice(0,4).map(d => <DiscoveryCard item={d} language={language} key={d.id}/>)}</div>}
    </section>
  </main>;
}

function AssessmentCard({ assessment, language }: { assessment: AssessmentSummary; language: Language }) {
  const name = knownAssessmentNames[assessment.id];
  const title = language === 'ar' ? (name?.ar ?? assessment.titleAr) : (name?.en ?? assessment.titleEn);
  const description = language === 'ar' ? assessment.descriptionAr : assessment.descriptionEn;
  return <Link href={`/assessments/${assessment.id}`} className="group rounded-2xl border border-border/70 bg-card px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40" data-testid={`card-assessment-${assessment.id}`}>
    <div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold">{title}</h4><p className="mt-1.5 min-h-[40px] text-xs leading-5 text-muted-foreground">{description}</p></div><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">{language === 'ar' ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}</span></div>
    <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><CircleHelp size={13}/>{assessment.questionCount} {copy(language).questions}</span><span className="flex items-center gap-1"><Clock3 size={13}/>{assessment.estimatedMinutes} {copy(language).mins}</span></div>
  </Link>;
}

function AssessmentWizard({ language }: { language: Language }) {
  const params = useParams<{ assessmentId: string }>();
  const id = params.assessmentId ?? '';
  const query = useGetAssessment(id, { query: { queryKey: ['/api/assessments', id], enabled: !!id } });
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(false);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const analyze = useAnalyzeDiscovery();
  const assessment = query.data;
  const questions = assessment?.questions ?? [];
  const item = questions[step];
  const currentAnswer = item ? answers[item.id] : undefined;
  useEffect(() => {
    if (!id) return;
    try { const raw = localStorage.getItem(`masari-draft-${id}`); setAnswers(raw ? JSON.parse(raw) as Record<string,string> : {}); }
    catch { setAnswers({}); }
    setHydrated(true);
  }, [id]);
  useEffect(() => { if (hydrated) localStorage.setItem(`masari-draft-${id}`, JSON.stringify(answers)); }, [answers, hydrated, id]);
  const title = language === 'ar' ? (knownAssessmentNames[id]?.ar ?? assessment?.titleAr) : (knownAssessmentNames[id]?.en ?? assessment?.titleEn);
  const answered = questions.filter(q => answers[q.id] !== undefined).length;
  const isReview = !!assessment && step >= questions.length;
  const choose = (value: string) => item && setAnswers(prev => ({ ...prev, [item.id]: value }));
  const submit = () => {
    if (!assessment || answered < questions.length) return;
    setAnalyzeError(false);
    analyze.mutate({ data: { assessmentId: id, language, answers: questions.map(q => ({ questionId: q.id, value: answers[q.id] })) } }, {
      onSuccess: async discovery => {
        localStorage.removeItem(`masari-draft-${id}`);
        await Promise.all([
          qc.invalidateQueries({ queryKey: getListDiscoveriesQueryKey() }),
          qc.invalidateQueries({ queryKey: getGetDiscoverySummaryQueryKey() }),
        ]);
        navigate(`/results/${discovery.id}`);
      },
      onError: () => setAnalyzeError(true),
    });
  };
  if (query.isLoading) return <main className="content-wrap py-12"><div className="h-8 w-40 animate-pulse rounded bg-muted"/><div className="mt-8 h-72 animate-pulse rounded-3xl bg-muted"/></main>;
  if (query.isError || !assessment) return <main className="content-wrap py-12"><ErrorMessage language={language} onRetry={() => query.refetch()}/></main>;
  const options = item?.type === 'scale' && (!item.options || item.options.length === 0) ? Array.from({length:5},(_,i)=>({value:String(i+1),labelAr:['لا يشبهني','قليلًا','أحيانًا','غالبًا','يشبهني كثيرًا'][i],labelEn:['Not like me','A little','Sometimes','Often','Very much'][i]})) : item?.options ?? [];
  return <main className="content-wrap max-w-[900px] pb-16 pt-7 sm:pt-12">
    <Link href="/" className="no-print inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" data-testid="link-back-explore">{language === 'ar' ? <ArrowRight size={16}/> : <ArrowLeft size={16}/>} {language === 'ar' ? 'كل المسارات' : 'All paths'}</Link>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{labelGroup(assessment.group, language)}</p><h1 className="mt-2 text-3xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{assessment.estimatedMinutes} {copy(language).mins} · {questions.length} {copy(language).questions}</p></div><span className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary"><Check size={14}/>{copy(language).savedDraft}</span></div>
    <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{width:`${Math.max(4, (Math.min(step,questions.length)/Math.max(questions.length,1))*100)}%`}}/></div>
    <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{isReview ? (language === 'ar' ? 'مراجعة إجاباتك' : 'Review your answers') : `${language === 'ar' ? 'السؤال' : 'Question'} ${step+1} ${language === 'ar' ? 'من' : 'of'} ${questions.length}`}</span><span>{answered} / {questions.length} {language === 'ar' ? 'مكتمل' : 'answered'}</span></div>
    <div className="mt-7 rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-9">
      {isReview ? <>
        <div className="mb-7"><span className="grid size-12 place-items-center rounded-2xl bg-accent/20"><FileText size={21}/></span><h2 className="mt-4 text-2xl font-semibold">{language === 'ar' ? 'راجع إجاباتك على راحتك' : 'Take a moment to review'}</h2><p className="mt-2 text-sm text-muted-foreground">{language === 'ar' ? 'يمكنك العودة لأي إجابة وتغييرها قبل إعداد تقريرك.' : 'You can go back and change any answer before creating your report.'}</p></div>
        <div className="divide-y divide-border">{questions.map((q,i)=>{ const value=answers[q.id]; const selected=q.options?.find(o=>o.value===value); return <button key={q.id} onClick={()=>setStep(i)} className="flex w-full items-start justify-between gap-4 py-4 text-start hover:bg-muted/40" data-testid={`button-review-${q.id}`}><span className="flex gap-3"><span className="mt-0.5 text-xs text-muted-foreground">{String(i+1).padStart(2,'0')}</span><span><span className="block text-sm leading-6">{language==='ar'?q.promptAr:q.promptEn}</span><span className="mt-1 block text-xs font-medium text-primary">{selected ? (language==='ar'?selected.labelAr:selected.labelEn) : value}</span></span></span><span className="shrink-0 text-xs text-primary">{language==='ar'?'تغيير':'Edit'}</span></button>;})}</div>
        {analyzeError && <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{language==='ar'?'تعذّر إعداد التقرير الآن. إجاباتك محفوظة، حاول مرة أخرى.':'We could not create your report just now. Your answers are saved; try again.'}</p>}
      </> : <>
        <div className="mb-8"><span className="text-xs font-semibold tracking-wide text-primary">{String(step+1).padStart(2,'0')} <span className="text-muted-foreground">/ {String(questions.length).padStart(2,'0')}</span></span><h2 className="mt-4 max-w-3xl text-[clamp(1.35rem,3vw,2rem)] font-semibold leading-relaxed">{language==='ar'?item?.promptAr:item?.promptEn}</h2></div>
        <div className={item?.type==='scale'?'grid grid-cols-1 gap-2 sm:grid-cols-5':'grid gap-3 sm:grid-cols-2'}>
          {options.map((option, idx)=>{const selected=currentAnswer===option.value; return <button key={option.value} onClick={()=>choose(option.value)} className={`group flex min-h-[62px] items-center gap-3 rounded-2xl border px-4 py-3 text-start transition ${selected?'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30':'border-border bg-background hover:border-primary/40 hover:bg-muted/40'}`} data-testid={`button-answer-${item?.id}-${option.value}`}>
            {item?.type==='scale' ? <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${selected?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{idx+1}</span> : <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected?'border-primary bg-primary text-primary-foreground':'border-border text-transparent'}`}><Check size={12}/></span>}
            <span className="text-sm leading-6">{language==='ar'?option.labelAr:option.labelEn}</span>
          </button>;})}
        </div>
      </>}
      <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <button disabled={step===0 || analyze.isPending} onClick={()=>setStep(Math.max(0,step-1))} className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40" data-testid="button-step-back">{language==='ar'?<ArrowRight size={17}/>:<ArrowLeft size={17}/>} {copy(language).back}</button>
        {isReview ? <button disabled={answered<questions.length || analyze.isPending} onClick={submit} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-assessment">{analyze.isPending?<><LoaderCircle className="animate-spin" size={16}/>{language==='ar'?'نرتّب أفكارك…':'Preparing your report…'}</>:<>{copy(language).finish}<Sparkles size={16}/></>}</button> :
          <button disabled={!currentAnswer} onClick={()=>setStep(step+1)} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-step-next">{step===questions.length-1?copy(language).review:copy(language).next}{language==='ar'?<ArrowLeft size={16}/>:<ArrowRight size={16}/>}</button>}
      </div>
    </div>
    <p className="mt-5 text-center text-xs text-muted-foreground">{language==='ar'?'إجاباتك محفوظة تلقائيًا في هذا المتصفح. يمكنك العودة في أي وقت.':'Your answers are saved in this browser. You can return any time.'}</p>
  </main>;
}

function ResultPage({ language }: { language: Language }) {
  const params = useParams<{id:string}>();
  const query = useGetDiscovery(params.id ?? '', { query: { queryKey: ['/api/discoveries', params.id], enabled: !!params.id } });
  if (query.isLoading) return <main className="content-wrap max-w-[900px] py-12"><div className="h-64 animate-pulse rounded-3xl bg-muted"/></main>;
  if (query.isError || !query.data) return <main className="content-wrap max-w-[900px] py-12"><ErrorMessage language={language} onRetry={() => query.refetch()}/></main>;
  return <DiscoveryReportPage discovery={query.data} language={language}/>;
}

function DiscoveryReportPage({ discovery, language }: { discovery: Discovery; language: Language }) {
  const report = discovery.report;
  const title = language==='ar'?discovery.assessmentTitleAr:discovery.assessmentTitleEn;
  const date = new Intl.DateTimeFormat(language==='ar'?'ar':'en',{dateStyle:'long'}).format(new Date(discovery.createdAt));
  const section = (heading: string, items: string[], icon: ReactNode, test: string) => items?.length ? <section className="report-section rounded-3xl border border-border bg-card p-5 sm:p-7" data-testid={test}><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><h2 className="text-lg font-semibold">{heading}</h2></div><ul className="space-y-3">{items.map((text,i)=><li key={i} className="flex gap-3 text-sm leading-7"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"/><span>{text}</span></li>)}</ul></section> : null;
  return <main className="content-wrap max-w-[900px] pb-12 pt-7 sm:pt-12">
    <div className="no-print flex flex-wrap items-center justify-between gap-3"><Link href="/saved" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-saved">{language==='ar'?<ArrowRight size={16}/>:<ArrowLeft size={16}/>} {language==='ar'?'تقاريري':'My reports'}</Link><button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted" data-testid="button-download-pdf"><Download size={16}/>{language==='ar'?'تنزيل التقرير PDF':'Download PDF'}</button></div>
    <div className="print-only mb-8"><strong className="text-xl">مساري · MASARI</strong></div>
    <header className="mt-7 rounded-[28px] bg-primary px-6 py-8 text-primary-foreground sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center gap-2 text-xs text-primary-foreground/70"><span>{labelGroup(discovery.group,language)}</span><span>·</span><span>{date}</span></div><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-primary-foreground/90">{report.summary}</p>
    </header>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {section(language==='ar'?'أنماط لاحظناها':'Patterns we noticed',report.observedPatterns,<Sparkles size={19}/>,'report-patterns')}
      {section(language==='ar'?'نقاط قوة تبرز':'Strengths that stand out',report.strengths,<Target size={19}/>,'report-strengths')}
      {section(language==='ar'?'ما يحفّزك':'What motivates you',report.motivations,<TrendingUp size={19}/>,'report-motivations')}
      {section(language==='ar'?'قيمك':'Your values',report.values,<Heart size={19}/>,'report-values')}
    </div>
    {report.possibleTensions?.length>0 && <div className="mt-5">{section(language==='ar'?'مساحات للتوازن':'Things to balance',report.possibleTensions,<Lightbulb size={19}/>,'report-tensions')}</div>}
    <section className="report-section mt-5 rounded-3xl border border-border bg-card p-5 sm:p-7" data-testid="report-recommendations">
      <div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent/20"><Compass size={19}/></span><div><h2 className="text-lg font-semibold">{language==='ar'?'مسارات قد تناسبك':'Paths worth exploring'}</h2><p className="mt-1 text-xs text-muted-foreground">{language==='ar'?'اقتراحات للتجربة، وليست أحكامًا نهائية.':'Ideas to try, not conclusions about who you are.'}</p></div></div>
      <div className="space-y-4">{report.recommendations?.map((rec,i)=><article key={i} className="rounded-2xl bg-muted/60 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-background text-xs font-semibold text-primary">{String(i+1).padStart(2,'0')}</span><div><h3 className="font-semibold">{rec.title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{rec.whyItMayFit}</p>{rec.practicalNextSteps?.length>0&&<ul className="mt-3 space-y-2">{rec.practicalNextSteps.map((s,j)=><li key={j} className="flex gap-2 text-sm leading-6"><Check className="mt-1 shrink-0 text-primary" size={14}/>{s}</li>)}</ul>}</div></div></article>)}</div>
    </section>
    {section(language==='ar'?'خطواتك القادمة':'A few next steps',report.nextSteps,<ArrowRight size={19}/>,'report-next-steps') && <div className="mt-5">{section(language==='ar'?'خطواتك القادمة':'A few next steps',report.nextSteps,<ArrowRight size={19}/>,'report-next-steps')}</div>}
    <section className="report-section mt-5 rounded-2xl border border-border/70 bg-muted/40 p-5" data-testid="report-uncertainty"><h2 className="text-sm font-semibold">{language==='ar'?'ملاحظة مهمة':'A gentle note'}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{report.uncertaintyNote}</p></section>
    <details className="no-print mt-6 rounded-3xl border border-border bg-card p-5 sm:p-7" data-testid="details-answers"><summary className="cursor-pointer list-none text-base font-semibold">{language==='ar'?'إجاباتك الأصلية':'Your original answers'} <span className="ms-2 text-xs font-normal text-muted-foreground">{language==='ar'?'(منفصلة عن التفسيرات)':'(separate from interpretations)'}</span></summary><div className="mt-5 divide-y divide-border">{discovery.answers.map((answer,i)=><div key={answer.questionId} className="py-4"><p className="text-xs text-muted-foreground">{String(i+1).padStart(2,'0')}</p><p className="mt-1 text-sm leading-6">{language==='ar'?answer.promptAr:answer.promptEn}</p><p className="mt-1 text-sm font-medium text-primary">{language==='ar'?answer.answerLabelAr:answer.answerLabelEn}</p></div>)}</div></details>
    <div className="no-print mt-6 flex justify-center"><button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground" data-testid="button-print-report"><Download size={16}/>{language==='ar'?'حفظ كملف PDF':'Save as PDF'}</button></div>
  </main>;
}

function SavedPage({ language }: { language: Language }) {
  const c = copy(language);
  const query = useListDiscoveries();
  const remove = useDeleteDiscovery();
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<string|null>(null);
  const confirmDelete = (id:string) => {
    if (pendingDelete !== id) { setPendingDelete(id); return; }
    remove.mutate({id}, { onSuccess: async()=>{setPendingDelete(null); await Promise.all([qc.invalidateQueries({queryKey:getListDiscoveriesQueryKey()}),qc.invalidateQueries({queryKey:getGetDiscoverySummaryQueryKey()})]);}, onError:()=>setPendingDelete(null) });
  };
  const data = query.data ?? [];
  return <main className="content-wrap max-w-[1000px] pb-14 pt-8 sm:pt-12">
    <div className="fade-in flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{language==='ar'?'مساحتك الخاصة':'YOUR PRIVATE SPACE'}</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{c.saved}</h1><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{language==='ar'?'كل تقرير هنا يخص هذا المتصفح فقط. افتحه متى أردت، أو احذفه في أي وقت.':'Every report here belongs to this browser. Open it whenever you like, or remove it at any time.'}</p></div><span className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">{data.length} {language==='ar'?'تقرير':'reports'}</span></div>
    {query.isLoading ? <div className="mt-8 grid gap-3">{[1,2,3].map(i=><div key={i} className="h-32 animate-pulse rounded-3xl bg-muted"/>)}</div> : query.isError ? <div className="mt-8"><ErrorMessage language={language} onRetry={()=>query.refetch()}/></div> : data.length===0 ?
      <div className="mt-10 rounded-[28px] border border-dashed border-border bg-card/60 px-6 py-12 text-center sm:py-16"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Bookmark size={24}/></span><h2 className="mt-5 text-xl font-semibold">{language==='ar'?'مساحة جديدة تنتظرك':'A fresh page, ready for you'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">{language==='ar'?'عندما تكمل استكشافًا، سيظهر تقريرك هنا. لا حاجة إلى حساب؛ هذه المساحة محفوظة لهذا المتصفح.':'Complete an exploration and your report will appear here. No account needed—this space belongs to this browser.'}</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground" data-testid="link-empty-explore">{c.start}<Compass size={16}/></Link></div> :
      <div className="mt-8 space-y-3">{data.map(item=><article key={item.id} className="rounded-3xl border border-border bg-card p-5 transition hover:border-primary/30 sm:flex sm:items-center sm:justify-between sm:gap-6" data-testid={`saved-report-${item.id}`}>
        <div className="flex min-w-0 items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText size={19}/></span><div className="min-w-0"><p className="text-xs text-muted-foreground">{labelGroup(item.group,language)} · {new Intl.DateTimeFormat(language==='ar'?'ar':'en',{dateStyle:'medium'}).format(new Date(item.createdAt))}</p><h2 className="mt-1 truncate text-lg font-semibold">{language==='ar'?item.assessmentTitleAr:item.assessmentTitleEn}</h2><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p></div></div>
        <div className="mt-4 flex shrink-0 items-center gap-2 sm:mt-0">
          {pendingDelete===item.id && <span className="text-xs text-destructive">{language==='ar'?'اضغط مرة أخرى للتأكيد':'Press again to confirm'}</span>}
          <button disabled={remove.isPending} onClick={()=>confirmDelete(item.id)} className={`grid size-10 place-items-center rounded-full transition ${pendingDelete===item.id?'bg-destructive/10 text-destructive':'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'}`} aria-label={language==='ar'?'حذف التقرير':'Delete report'} data-testid={`button-delete-${item.id}`}>{remove.isPending&&remove.variables?.id===item.id?<LoaderCircle size={16} className="animate-spin"/>:<Trash2 size={16}/>}</button>
          <Link href={`/results/${item.id}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" data-testid={`link-open-${item.id}`}>{language==='ar'?'افتح التقرير':'Open report'}{language==='ar'?<ArrowLeft size={15}/>:<ArrowRight size={15}/>}</Link>
        </div>
      </article>)}</div>}
     <div className="mt-8 flex items-start gap-3 rounded-2xl bg-muted/60 p-4 text-xs leading-6 text-muted-foreground"><span className="mt-1 text-primary"><Heart size={15}/></span><p>{language==='ar'?'خصوصيتك مهمة: لا يوجد حساب، والتقارير مرتبطة بهذه المساحة في متصفحك. قد لا تبقى ملفات التقارير بعد إعادة تشغيل أو إعادة نشر بعض الاستضافات؛ نزّل نسخة PDF للاحتفاظ بها.':'Your privacy matters: no account is required, and reports belong to this browser space. Local report files may not survive restarts or redeployments on some hosts; download a PDF to keep a copy.'}</p></div>
  </main>;
}

function DiscoveryCard({item,language}:{item:DiscoveryListItem;language:Language}) {
  return <Link href={`/results/${item.id}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40" data-testid={`card-discovery-${item.id}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText size={18}/></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{language==='ar'?item.assessmentTitleAr:item.assessmentTitleEn}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{new Intl.DateTimeFormat(language==='ar'?'ar':'en',{dateStyle:'medium'}).format(new Date(item.createdAt))} · {item.summary}</span></span>{language==='ar'?<ChevronLeft size={17}/>:<ChevronRight size={17}/>}</Link>;
}
function ErrorMessage({language,onRetry}:{language:Language;onRetry:()=>void}) {
  return <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center" role="alert" data-testid="status-error"><p className="font-semibold">{language==='ar'?'لم نتمكن من تحميل هذه المساحة':'We could not load this space'}</p><p className="mt-1 text-sm text-muted-foreground">{language==='ar'?'تحقق من اتصالك وحاول مرة أخرى.':'Check your connection and try again.'}</p><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted" data-testid="button-retry"><RotateCcw size={14}/>{copy(language).retry}</button></div>;
}

export default App;
