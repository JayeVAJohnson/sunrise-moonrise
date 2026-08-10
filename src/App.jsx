import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Download, Search, X, Flame, Trophy, LayoutGrid, CalendarClock,
  Sparkles, Link as LinkIcon, Trash2, Pencil, ClipboardPaste, ChevronDown,
  Check, CircleMinus, BookmarkPlus, History as HistoryIcon, Lightbulb,
  Heart, Star, Image as ImageIcon, Paperclip, ChevronRight, FileText,
  ExternalLink, AlertTriangle, Clock3, BookOpen, Hourglass, Send,
} from "lucide-react";

/* ---------------------------------------------------------
   OPPORTUNITIES — a soft, personal tracker for people who
   wear a lot of hats. Styled in the spirit of "Pressing
   Matters": pastel, click-to-edit, forgiving of mess,
   built to be lived in during a hard job search.
--------------------------------------------------------- */

const STATUSES = [
  { key: "saved", label: "Saved", color: "var(--muted)" },
  { key: "in_progress", label: "In Progress", color: "var(--amber)" },
  { key: "submitted", label: "Submitted", color: "var(--blue)" },
  { key: "waiting_word", label: "Waiting on Word", color: "var(--blue)" },
  { key: "waiting_action", label: "Waiting on Action Item", color: "var(--amber)" },
  { key: "interview_1", label: "Interview", color: "var(--green)" },
  { key: "interview_2", label: "Interview 2", color: "var(--green)" },
  { key: "offer", label: "Offer", color: "var(--green)" },
  { key: "rejected", label: "Rejected", color: "var(--red)" },
  { key: "reapplying", label: "Reapplying", color: "var(--amber)" },
  { key: "withdrawn", label: "Withdrawn", color: "var(--muted)" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
const BOARD_ORDER = STATUSES.map((s) => s.key);
const NOT_YET_STATUSES = ["saved", "in_progress"];

const CATEGORIES = [
  "Call for Writers", "Call for Papers", "Job Search — FT", "Job Search — PT",
  "Contract", "Proposal", "Bootcamp", "Incubator", "Accelerator",
  "Grant", "Loan", "Partnership", "Education", "Other",
];

const POINTS = {
  saved: 0, in_progress: 5, submitted: 15, waiting_word: 15,
  waiting_action: 18, interview_1: 40, interview_2: 60, offer: 150,
  rejected: 8, reapplying: 20, withdrawn: 0,
};

// A pool of 365 hopeful lines, built by combining two short phrase sets so the
// rotation stays large without turning into hand-written filler by line 200.
// Any SETBACK phrase reads naturally into any REFRAME phrase.
const SETBACK_PHRASES = [
  "A closed door here", "This particular no", "One rejection", "A quiet inbox today",
  "A stalled application", "An unanswered email", "A single setback", "This round not working out",
  "A pass on this one", "A slow week", "A tough interview", "An application still in limbo",
  "Today's silence", "A hard no", "One more form that didn't land", "This particular ending",
  "A door that didn't open", "One more try that didn't land", "A gap in the calendar",
];
const REFRAME_PHRASES = [
  "isn't the whole story.", "doesn't cancel what's still moving.", "is data, not a verdict.",
  "still counts as showing up.", "doesn't get the final word.", "is just today's chapter, not the ending.",
  "means you're still in it, not out of it.", "isn't proof of anything except that you tried.",
  "doesn't erase the effort that got you here.", "is one data point, not a pattern.",
  "still means the pipeline is alive.", "is the cost of putting yourself forward.",
  "doesn't make the next yes less real.", "is survivable, and so are the ones after it.",
  "is something to log, not something to carry.", "still leaves room for what's next.",
  "isn't a referendum on your worth.", "is proof you're in the arena, not on the sidelines.",
  "gets filed, and you keep moving.", "is smaller than the whole pipeline you've built.",
];
const QUOTE_POOL = (() => {
  const pool = [];
  for (const s of SETBACK_PHRASES) {
    for (const r of REFRAME_PHRASES) {
      pool.push(`${s}, ${r}`);
      if (pool.length >= 365) return pool;
    }
  }
  return pool;
})();

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}
function quoteForToday(seed = 0) {
  const idx = (dayOfYear(new Date()) + seed * 37) % QUOTE_POOL.length;
  return QUOTE_POOL[idx];
}
function randomQuote() {
  return QUOTE_POOL[Math.floor(Math.random() * QUOTE_POOL.length)];
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d - now) / 86400000);
}

function urgency(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return { label: "no deadline", cls: "u-none" };
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, cls: "u-over" };
  if (d === 0) return { label: "due today", cls: "u-over" };
  if (d <= 3) return { label: `${d}d left`, cls: "u-hot" };
  if (d <= 7) return { label: `${d}d left`, cls: "u-warm" };
  return { label: `${d}d left`, cls: "u-cool" };
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toICSDate(dateStr) { return dateStr.replaceAll("-", "") + "T090000"; }

function generateICS(opps, events = []) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sunrise Moonrise Opportunities//EN"];
  opps.filter((o) => o.deadline).forEach((o) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${o.id}@sunrise-moonrise`,
      `DTSTAMP:${toICSDate(new Date().toISOString().slice(0, 10))}`,
      `DTSTART:${toICSDate(o.deadline)}`,
      `SUMMARY:${(o.title || "Untitled opportunity").replace(/\n/g, " ")} — deadline`,
      `DESCRIPTION:${(o.org || "").replace(/\n/g, " ")} · ${STATUS_MAP[o.status]?.label || ""}`,
      "END:VEVENT"
    );
  });
  events.filter((e) => e.date).forEach((e) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@sunrise-moonrise`,
      `DTSTAMP:${toICSDate(new Date().toISOString().slice(0, 10))}`,
      `DTSTART:${toICSDate(e.date)}`,
      `SUMMARY:${(e.title || "Untitled").replace(/\n/g, " ")}`,
      `DESCRIPTION:${(e.note || "").replace(/\n/g, " ")}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Parses a .ics file's text into simple {title, date} entries.
// Handles DTSTART with or without time, and VALUE=DATE form.
function parseICS(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0];
    const summaryMatch = body.match(/SUMMARY[^:]*:(.+)/);
    const dtMatch = body.match(/DTSTART[^:]*:(\d{8})/);
    if (!dtMatch) continue;
    const raw = dtMatch[1];
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const title = summaryMatch ? summaryMatch[1].trim().replace(/\\,/g, ",") : "Untitled event";
    events.push({ title, date });
  }
  return events;
}

function blankCalEvent() {
  return { id: uid(), title: "", date: "", note: "", source: "manual" };
}

function daysFromToday(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function sampleOpp(overrides) {
  const base = blankOpp();
  const status = overrides.status || "saved";
  const history = (overrides.historyOffsets || [0]).map((off, i) => ({
    status: (overrides.historySteps || [status])[i] || status,
    date: daysFromToday(off),
  }));
  const reached = Array.from(new Set(history.map((h) => h.status)));
  return { ...base, ...overrides, status, history, reachedStatuses: reached };
}

function buildSampleData() {
  const opps = [
    sampleOpp({
      title: "Fiction & essays open call — Kestrel Review",
      org: "Kestrel Review", category: "Call for Writers", status: "interview_1",
      deadline: daysFromToday(9), link: "https://example.com/kestrel-review",
      guidelines: "3,500 words max, previously unpublished, themed around 'thresholds.' Simultaneous submissions okay with notice.",
      historySteps: ["saved", "submitted", "interview_1"], historyOffsets: [-30, -21, -3],
      customFields: [{ id: uid(), label: "Word count cap", value: "3,500" }],
    }),
    sampleOpp({
      title: "Senior Content Strategist", org: "Lucent & Co.", category: "Job Search — FT",
      status: "waiting_word", deadline: "", link: "",
      guidelines: "5+ years content strategy, portfolio required, remote-friendly.",
      historySteps: ["saved", "submitted", "interview_1", "interview_2", "waiting_word"],
      historyOffsets: [-40, -33, -24, -14, -6],
      notes: "Recruiter said final decision expected within two weeks of the second interview.",
    }),
    sampleOpp({
      title: "Community Design Fellowship", org: "Northgate Foundation", category: "Grant",
      status: "rejected", deadline: "", guidelines: "For early-career designers working in public-interest projects. $8,000 stipend.",
      historySteps: ["saved", "submitted", "rejected"], historyOffsets: [-60, -50, -18],
      notes: "Feedback: strong proposal, cohort was oversubscribed 40:1. Worth reapplying next cycle.",
    }),
    sampleOpp({
      title: "Frontend bootcamp — cohort 14", org: "Bright Path Labs", category: "Bootcamp",
      status: "in_progress", deadline: daysFromToday(4),
      guidelines: "12-week evening program, application includes a short coding sample.",
      historySteps: ["saved", "in_progress"], historyOffsets: [-6, -2],
    }),
    sampleOpp({
      title: "Micro-loan for equipment", org: "Firstline Community Fund", category: "Loan",
      status: "waiting_action", deadline: daysFromToday(2),
      guidelines: "Up to $3,000, requires a one-page business plan and two references.",
      historySteps: ["saved", "submitted", "waiting_action"], historyOffsets: [-14, -10, -3],
      notes: "They asked for a revised budget sheet — due back before the deadline above.",
    }),
    sampleOpp({
      title: "UX Research Contract — Q3", org: "Palmer Studio", category: "Contract",
      status: "offer", deadline: "",
      guidelines: "8-week contract, 20 hrs/week, moderated usability studies.",
      historySteps: ["saved", "submitted", "interview_1", "offer"], historyOffsets: [-25, -20, -12, -2],
      flagged: true, notes: "Great story for interviews — they liked the mixed-methods writing sample most.",
    }),
    sampleOpp({
      title: "Op-ed pitch — housing policy", org: "The Weekly Current", category: "Call for Writers",
      status: "saved", deadline: daysFromToday(21),
      guidelines: "800–1,000 words, pitch first with a two-paragraph summary before full draft.",
    }),
    sampleOpp({
      title: "Small business partnership pitch", org: "Ridgeline Coffee Collective", category: "Partnership",
      status: "reapplying", deadline: daysFromToday(30),
      guidelines: "Looking for a local artist/writer to co-brand a seasonal product line.",
      historySteps: ["saved", "submitted", "rejected", "reapplying"], historyOffsets: [-70, -60, -45, -5],
      notes: "First pitch was too broad — narrowing to one product line this time.",
    }),
  ];

  const resumes = [
    { id: uid(), name: "Writing-focused v3", link: "https://docs.google.com/", tags: ["Call for Writers", "Call for Papers", "Education"], notes: "Leads with published clips, trims the retail job history.", updated: daysFromToday(-10) },
    { id: uid(), name: "Tech/ops generalist v2", link: "https://onedrive.live.com/", tags: ["Job Search — FT", "Job Search — PT", "Contract", "Bootcamp"], notes: "Leads with project outcomes and tools, no publication list.", updated: daysFromToday(-25) },
  ];

  const lessons = [
    { id: uid(), date: daysFromToday(-18), text: "The Northgate rejection feedback said the proposal was strong but the cohort was 40:1 — worth reapplying, not worth rewriting from scratch.", oppId: opps[2].id, oppTitle: opps[2].title },
    { id: uid(), date: daysFromToday(-2), text: "In interviews, leading with the mixed-methods research story lands better than leading with tools/software list.", oppId: opps[5].id, oppTitle: opps[5].title },
    { id: uid(), date: daysFromToday(-45), text: "General: pitches that name a specific section/editor get replies faster than general submissions inbox.", oppId: null, oppTitle: null },
  ];

  const prefs = {
    "Call for Writers": { rating: 5, notes: "The work I actually want more of." },
    "Job Search — FT": { rating: 3, notes: "Applying for stability, not necessarily excitement." },
    Grant: { rating: 4, notes: "Slow, but worth it when they land." },
  };

  const calendarEvents = [
    { id: uid(), title: "Portfolio review with mentor", date: daysFromToday(5), note: "Bring the Palmer Studio case study.", source: "manual" },
    { id: uid(), title: "Follow up with Firstline Fund", date: daysFromToday(1), note: "Confirm they received the revised budget sheet.", source: "manual" },
  ];

  return { opps, resumes, lessons, prefs, calendarEvents };
}

function computeStreak(opps) {
  const submitDates = [];
  opps.forEach((o) => (o.history || []).forEach((h) => {
    if (h.status === "submitted") submitDates.push(new Date(h.date));
  }));
  if (!submitDates.length) return 0;
  const weekOf = (d) => {
    const t = new Date(d); const day = (t.getDay() + 6) % 7;
    t.setDate(t.getDate() - day); t.setHours(0, 0, 0, 0); return t.getTime();
  };
  const weeks = new Set(submitDates.map(weekOf));
  let streak = 0; let cursor = weekOf(new Date());
  while (weeks.has(cursor)) { streak++; cursor -= 7 * 86400000; }
  return streak;
}

function computeBadges(opps, streak) {
  const reached = (key) => opps.some((o) => (o.reachedStatuses || []).includes(key));
  const activeCount = opps.filter((o) => !["saved", "rejected", "withdrawn"].includes(o.status)).length;
  const comeback = opps.some((o) =>
    (o.reachedStatuses || []).includes("rejected") && (o.reachedStatuses || []).includes("reapplying"));
  const catCount = new Set(opps.map((o) => o.category)).size;
  return [
    { id: "first_move", label: "First Move", desc: "Submitted your first opportunity", done: reached("submitted") },
    { id: "in_flight", label: "In Flight ×5", desc: "5 opportunities active at once", done: activeCount >= 5 },
    { id: "bounce_back", label: "Bounce Back", desc: "Reapplied after a rejection", done: comeback },
    { id: "interview_ready", label: "Interview Ready", desc: "Landed a first interview", done: reached("interview_1") },
    { id: "momentum", label: "Momentum", desc: "3-week submission streak", done: streak >= 3 },
    { id: "full_house", label: "Full House", desc: "Active in 5+ categories", done: catCount >= 5 },
  ];
}

// --- local, no-API heuristic parser for Quick Paste ---
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_INDEX = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

function toISO(y, mIdx, d) {
  const dt = new Date(y, mIdx, d);
  if (isNaN(dt)) return null;
  return dt.toISOString().slice(0, 10);
}

function heuristicParse(text) {
  const t = text.trim();
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = t.toLowerCase();

  let deadline = "";
  const near = lower.match(/(deadline|due|closes?|apply by|submissions? close|rolling until)[^\n]{0,40}/);
  const searchZone = near ? near[0] : lower;

  const iso = searchZone.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const slash = searchZone.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  const monthDay = new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(20\\d{2})?\\b`, "i");
  const md = searchZone.match(monthDay);

  if (iso) deadline = `${iso[1]}-${iso[2]}-${iso[3]}`;
  else if (slash) deadline = toISO(+slash[3], +slash[1] - 1, +slash[2]) || "";
  else if (md) {
    const mi = MONTH_INDEX[md[1].slice(0, 3).toLowerCase()];
    const year = md[3] ? +md[3] : new Date().getFullYear();
    deadline = toISO(year, mi, +md[2]) || "";
  }

  const linkMatch = t.match(/https?:\/\/[^\s)"'<>]+/);
  const link = linkMatch ? linkMatch[0] : "";

  const contentLines = lines.filter((l) => !/^https?:\/\//.test(l));
  const title = contentLines[0] || "";
  const org = contentLines[1] && contentLines[1].length < 80 ? contentLines[1] : "";

  const KEYWORDS = [
    [/call for papers|cfp\b/, "Call for Papers"],
    [/call for (writers|submissions|writing|pitches)/, "Call for Writers"],
    [/bootcamp/, "Bootcamp"],
    [/incubator/, "Incubator"],
    [/accelerator/, "Accelerator"],
    [/\bgrant\b/, "Grant"],
    [/\bloan\b/, "Loan"],
    [/partnership/, "Partnership"],
    [/\bcontract\b|contractor|freelance/, "Contract"],
    [/proposal|\brfp\b/, "Proposal"],
    [/scholarship|course|program|degree|fellowship/, "Education"],
    [/part[- ]?time|\bpt\b/, "Job Search — PT"],
    [/full[- ]?time|\bft\b|hiring|job posting|position/, "Job Search — FT"],
  ];
  let category = "Other";
  for (const [re, cat] of KEYWORDS) { if (re.test(lower)) { category = cat; break; } }

  return { title, org, category, deadline, link, guidelines: t };
}

function readImageFile(file, cb) {
  if (!file || !file.type.startsWith("image/")) return;
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}

const STORAGE_KEY = "pm-opportunities-v1";

// window.storage only exists inside a Claude.ai artifact. Outside that
// environment (e.g. this app deployed standalone on GitHub Pages), we
// fall back to the browser's own localStorage so saving/loading still
// works — just scoped to that one browser instead of the person's
// Claude account.
const hasClaudeStorage = typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

async function loadAppState() {
  if (hasClaudeStorage) {
    try {
      const res = await window.storage.get(STORAGE_KEY, false);
      return res?.value ? JSON.parse(res.value) : null;
    } catch (e) { return null; }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

async function saveAppState(data) {
  const blob = JSON.stringify(data);
  if (hasClaudeStorage) {
    try { await window.storage.set(STORAGE_KEY, blob, false); return; } catch (e) { /* fall through */ }
  }
  try { window.localStorage.setItem(STORAGE_KEY, blob); } catch (e) { /* storage unavailable */ }
}

function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <linearGradient id="lmSky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="280">
          <stop offset="0%" stopColor="#EEEDFE" />
          <stop offset="100%" stopColor="#FBEAF0" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#lmSky)" />
      <circle cx="292" cy="110" r="40" fill="#EF9F27" />
      <g>
        <g transform="rotate(-135 108 100)">
          <circle cx="108" cy="100" r="42" fill="#3C3489" />
          <circle cx="126" cy="88" r="38" fill="url(#lmSky)" />
        </g>
        <circle cx="108" cy="100" r="40" fill="none" stroke="#3C3489" strokeWidth="2.5" opacity="0.45" />
      </g>
      <g fill="#7F77DD">
        <path d="M200,332 C176,300 176,254 200,220 C224,254 224,300 200,332 Z" transform="rotate(-72 200 332)" />
        <path d="M200,332 C176,300 176,254 200,220 C224,254 224,300 200,332 Z" transform="rotate(72 200 332)" />
        <path d="M200,332 C179,303 179,262 200,232 C221,262 221,303 200,332 Z" transform="rotate(-44 200 332)" />
        <path d="M200,332 C179,303 179,262 200,232 C221,262 221,303 200,332 Z" transform="rotate(44 200 332)" />
        <path d="M200,332 C182,306 182,270 200,242 C218,270 218,306 200,332 Z" transform="rotate(-20 200 332)" />
        <path d="M200,332 C182,306 182,270 200,242 C218,270 218,306 200,332 Z" transform="rotate(20 200 332)" />
        <path d="M200,332 C184,308 184,276 200,250 C216,276 216,308 200,332 Z" />
      </g>
      <circle cx="200" cy="322" r="9" fill="#EF9F27" />
    </svg>
  );
}

function blankOpp() {
  return {
    id: uid(), title: "", org: "", category: CATEGORIES[0], status: "saved",
    deadline: "", guidelines: "", notes: "", link: "", customFields: [],
    attachmentImage: null, flagged: false, resumeId: "", resumeName: "",
    reachedStatuses: ["saved"], history: [{ status: "saved", date: new Date().toISOString().slice(0, 10) }],
  };
}

function blankResume() {
  return { id: uid(), name: "", link: "", tags: [], notes: "", updated: new Date().toISOString().slice(0, 10) };
}

export default function App() {
  const initialSample = useMemo(() => buildSampleData(), []);
  const [opps, setOpps] = useState(() => initialSample.opps);
  const [lessons, setLessons] = useState(() => initialSample.lessons);
  const [prefs, setPrefs] = useState(() => initialSample.prefs);
  const [resumes, setResumes] = useState(() => initialSample.resumes);
  const [calendarEvents, setCalendarEvents] = useState(() => initialSample.calendarEvents);
  const [mantraCustom, setMantraCustom] = useState("");
  const [mantraSeed, setMantraSeed] = useState(0);
  const [mantraEditing, setMantraEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [editingResume, setEditingResume] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadAppState();
      // Only switch away from the sample defaults once real, non-empty saved
      // data shows up — an empty or missing record (fresh account, cleared
      // storage, or a demo) should always show sample data, never a blank
      // dashboard.
      if (data && Array.isArray(data.opps) && data.opps.length > 0) {
        setOpps(data.opps || []);
        setLessons(data.lessons || []);
        setPrefs(data.prefs || {});
        setResumes(data.resumes || []);
        setCalendarEvents(data.calendarEvents || []);
        setMantraCustom(data.mantraCustom || "");
        setMantraSeed(data.mantraSeed || 0);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveAppState({ opps, lessons, prefs, resumes, calendarEvents, mantraCustom, mantraSeed });
  }, [opps, lessons, prefs, resumes, calendarEvents, mantraCustom, mantraSeed, loaded]);

  function upsertResume(r) {
    setResumes((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev]));
  }
  function removeResume(id) { setResumes((prev) => prev.filter((r) => r.id !== id)); }

  function upsertEvent(e) {
    setCalendarEvents((prev) => (prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [e, ...prev]));
  }
  function removeEvent(id) { setCalendarEvents((prev) => prev.filter((e) => e.id !== id)); }
  function importEvents(parsed, source) {
    const items = parsed.map((e) => ({ id: uid(), title: e.title, date: e.date, note: "", source }));
    setCalendarEvents((prev) => [...items, ...prev]);
    flash(`Imported ${items.length} date${items.length === 1 ? "" : "s"} from your calendar.`);
  }

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  function upsert(opp) {
    setOpps((prev) => {
      const exists = prev.some((o) => o.id === opp.id);
      return exists ? prev.map((o) => (o.id === opp.id ? opp : o)) : [opp, ...prev];
    });
  }
  function removeOpp(id) { setOpps((prev) => prev.filter((o) => o.id !== id)); }

  function changeStatus(opp, newStatus) {
    const now = new Date().toISOString().slice(0, 10);
    const reached = Array.from(new Set([...(opp.reachedStatuses || []), newStatus]));
    const history = [...(opp.history || []), { status: newStatus, date: now }];
    upsert({ ...opp, status: newStatus, reachedStatuses: reached, history });
    if (newStatus === "rejected") flash(randomQuote());
    else if (newStatus === "offer") flash("🎉 Offer. Go update everything else that's been waiting on this news.");
    else if (newStatus === "submitted") flash("Logged. That's one more door pushed open.");
  }

  function toggleFlag(opp) { upsert({ ...opp, flagged: !opp.flagged }); }

  function openFeedItem(item) {
    if (item.kind === "opportunity") { setEditing(item.ref); setShowAdd(true); }
    else { setEditingEvent(item.ref); setShowEventModal(true); }
  }

  const filtered = useMemo(() => {
    return opps.filter((o) => {
      if (catFilter !== "All" && o.category !== catFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!(`${o.title} ${o.org} ${o.notes} ${o.guidelines}`.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [opps, catFilter, search]);

  const streak = computeStreak(opps);
  const totalPoints = opps.reduce((sum, o) => {
    const best = Math.max(0, ...(o.reachedStatuses || ["saved"]).map((s) => POINTS[s] ?? 0));
    return sum + best;
  }, 0);
  const badges = computeBadges(opps, streak);
  const submittedCount = opps.filter((o) => (o.reachedStatuses || []).some((s) => s !== "saved")).length;
  const offerCount = opps.filter((o) => (o.reachedStatuses || []).includes("offer")).length;
  const winRate = submittedCount ? Math.round((offerCount / submittedCount) * 100) : 0;

  const feedItems = useMemo(() => {
    const oppItems = opps.filter((o) => o.deadline).map((o) => ({
      key: "opp-" + o.id, title: o.title || "Untitled", sub: o.org, statusLabel: STATUS_MAP[o.status]?.label,
      date: o.deadline, kind: "opportunity", terminal: ["rejected", "withdrawn", "offer"].includes(o.status), ref: o,
    }));
    const evItems = calendarEvents.filter((e) => e.date).map((e) => ({
      key: "evt-" + e.id, title: e.title || "Untitled",
      sub: e.source === "calendar-import" ? "from calendar" : "added manually",
      date: e.date, kind: "event", terminal: false, ref: e,
    }));
    return [...oppItems, ...evItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [opps, calendarEvents]);

  const deadlineList = feedItems;

  const notYetList = useMemo(() => filtered.filter((o) => o.status === "saved"), [filtered]);
  const inProgressList = useMemo(() => filtered.filter((o) => o.status === "in_progress"), [filtered]);

  const activeFeed = useMemo(() => {
    return feedItems
      .map((item) => ({ item, d: daysUntil(item.date) }))
      .filter((x) => x.d !== null && x.d >= 0 && !x.item.terminal)
      .sort((a, b) => a.d - b.d);
  }, [feedItems]);
  const nextUp = activeFeed[0] || null;
  const urgentList = activeFeed.filter((x) => x.d <= 3);
  const upcomingList = activeFeed.filter((x) => x.d > 3 && x.d <= 14);

  const historyList = useMemo(() => {
    return filtered
      .filter((o) => (o.reachedStatuses || []).some((s) => !NOT_YET_STATUSES.includes(s)))
      .sort((a, b) => {
        const da = (a.history || []).slice(-1)[0]?.date || "";
        const db = (b.history || []).slice(-1)[0]?.date || "";
        return db.localeCompare(da);
      });
  }, [filtered]);

  const TABS = [
    { key: "board", label: "Board", icon: <LayoutGrid size={15} /> },
    { key: "notyet", label: "Not Yet Applied", icon: <BookmarkPlus size={15} /> },
    { key: "inprogress", label: "In Progress", icon: <Hourglass size={15} /> },
    { key: "applied", label: "Applied", icon: <Send size={15} /> },
    { key: "deadlines", label: "Deadlines", icon: <CalendarClock size={15} /> },
    { key: "history", label: "History", icon: <HistoryIcon size={15} /> },
    { key: "lessons", label: "Lessons Learned", icon: <Lightbulb size={15} /> },
    { key: "prefs", label: "Preferred Types", icon: <Heart size={15} /> },
    { key: "resumes", label: "Resumes", icon: <FileText size={15} /> },
    { key: "stats", label: "Stats", icon: <Trophy size={15} /> },
    { key: "manual", label: "Manual", icon: <BookOpen size={15} /> },
  ];

  return (
    <div className="ot-root">
      <style>{CSS}</style>

      <a className="ot-gh-badge" href="https://github.com/JayeVAJohnson/sunrise-moonrise"
        target="_blank" rel="noopener noreferrer">View on GitHub</a>

      <header className="ot-header">
        <div className="ot-header-inner">
          <div className="ot-brand"><span className="ot-logo-frame"><LogoMark size={192} /></span>
            <span className="ot-brand-text"><span className="ot-brand-title">Sunrise Moonrise</span>
              <span className="ot-brand-sub">opportunities, tracked for the early starts and the late nights</span></span>
          </div>

          <div className="ot-clock">
            <div className="ot-clock-date">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
            <div className="ot-clock-time">{now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}</div>
          </div>
          <div className="ot-stat"><Flame size={14} /> <span>{streak}</span><em>wk streak</em></div>
          <div className="ot-stat"><Sparkles size={14} /> <span>{totalPoints}</span><em>pts</em></div>

          <span className="ot-header-divider" />

          <div className="ot-mantra">
            {mantraEditing ? (
              <>
                <input className="ot-mantra-text" autoFocus value={mantraCustom}
                  onChange={(e) => setMantraCustom(e.target.value)}
                  placeholder="Write yourself something true to see every time you open this."
                  onBlur={() => setMantraEditing(false)}
                  onKeyDown={(e) => { if (e.key === "Enter") setMantraEditing(false); }} />
                <button className="ot-mantra-link" onClick={() => { setMantraCustom(""); setMantraEditing(false); }}>
                  Back to rotation
                </button>
              </>
            ) : mantraCustom.trim() ? (
              <>
                <p className="ot-mantra-text ot-mantra-static">{mantraCustom}</p>
                <button className="ot-mantra-link" onClick={() => setMantraEditing(true)}>Edit</button>
              </>
            ) : (
              <>
                <p className="ot-mantra-text ot-mantra-static">{quoteForToday(mantraSeed)}</p>
                <div className="ot-mantra-actions">
                  <button className="ot-mantra-link" onClick={() => setMantraSeed((s) => s + 1)}>Shuffle</button>
                  <button className="ot-mantra-link" onClick={() => setMantraEditing(true)}>Write your own</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="ot-hero-wrap">
        <div className="ot-hero">
          <div className="ot-stamp">
            <div className="ot-stamp-num">{nextUp ? nextUp.d : "—"}</div>
            <div className="ot-stamp-lbl">Days Left</div>
          </div>
          <div className="ot-hero-copy">
            <p className="ot-hero-eyebrow">Next Up</p>
            <h2>{nextUp ? nextUp.item.title : "Nothing on the horizon"}</h2>
            <p>{nextUp ? `${nextUp.item.sub || "—"} · deadline ${nextUp.item.date}` : "Add a deadline and it'll show up here first."}</p>
          </div>
        </div>

        <div className="ot-callouts">
          <div className="ot-callout urgent">
            <div className="ot-callout-head"><AlertTriangle size={14} /> Urgent <em>{urgentList.length}</em></div>
            {urgentList.length ? urgentList.slice(0, 5).map(({ item, d }) => (
              <div className="ot-callout-row" key={item.key} onClick={() => openFeedItem(item)}>
                <span>{item.title}</span><span className="ot-callout-days">{d === 0 ? "today" : `${d}d`}</span>
              </div>
            )) : <div className="ot-callout-empty">Nothing urgent right now.</div>}
          </div>
          <div className="ot-callout upcoming">
            <div className="ot-callout-head"><Clock3 size={14} /> Upcoming <em>{upcomingList.length}</em></div>
            {upcomingList.length ? upcomingList.slice(0, 5).map(({ item, d }) => (
              <div className="ot-callout-row" key={item.key} onClick={() => openFeedItem(item)}>
                <span>{item.title}</span><span className="ot-callout-days">{d}d</span>
              </div>
            )) : <div className="ot-callout-empty">Nothing in the next two weeks.</div>}
          </div>
        </div>
      </div>

      <div className="ot-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={"ot-tab" + (view === t.key ? " active" : "")} onClick={() => setView(t.key)}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="ot-toolbar">
        <div className="ot-search">
          <Search size={14} />
          <input placeholder="Search title, org, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="ot-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="ot-toolbar-spacer" />
        <button className="ot-btn ot-btn-ghost" onClick={() => setShowImport(true)}>
          <ClipboardPaste size={15} /> Paste It In
        </button>
        <button className="ot-btn ot-btn-primary" onClick={() => { setEditing(blankOpp()); setShowAdd(true); }}>
          <Plus size={15} /> Add
        </button>
        <div className="ot-export-wrap">
          <button className="ot-btn ot-btn-ghost" onClick={() => setExportOpen((v) => !v)}>
            <Download size={15} /> Import / Export <ChevronDown size={13} />
          </button>
          {exportOpen && (
            <div className="ot-export-menu">
              <button onClick={() => { downloadFile("opportunities.json", JSON.stringify({ opps, lessons, prefs, resumes, calendarEvents, mantraCustom, mantraSeed }, null, 2), "application/json"); setExportOpen(false); }}>
                Export as JSON
              </button>
              <button onClick={() => { downloadFile("opportunities.ics", generateICS(opps, calendarEvents), "text/calendar"); setExportOpen(false); }}>
                Export deadlines (.ics)
              </button>
              <button onClick={() => {
                if (window.confirm("Load sample data? This replaces your current opportunities, resumes, lessons, and calendar events.")) {
                  const s = buildSampleData();
                  setOpps(s.opps); setResumes(s.resumes); setLessons(s.lessons); setPrefs(s.prefs); setCalendarEvents(s.calendarEvents);
                  flash("Sample data loaded.");
                }
                setExportOpen(false);
              }}>
                Load sample data
              </button>
              <label className="ot-export-import">
                Import from JSON
                <input type="file" accept="application/json" style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files[0]; if (!f) return;
                    const r = new FileReader();
                    r.onload = () => {
                      try {
                        const data = JSON.parse(r.result);
                        if (Array.isArray(data)) { setOpps(data); }
                        else {
                          if (Array.isArray(data.opps)) setOpps(data.opps);
                          if (Array.isArray(data.lessons)) setLessons(data.lessons);
                          if (Array.isArray(data.resumes)) setResumes(data.resumes);
                          if (Array.isArray(data.calendarEvents)) setCalendarEvents(data.calendarEvents);
                          if (data.prefs) setPrefs(data.prefs);
                          if (data.mantraCustom !== undefined) setMantraCustom(data.mantraCustom);
                          if (data.mantraSeed !== undefined) setMantraSeed(data.mantraSeed);
                        }
                        flash("Backup restored.");
                      } catch { flash("Couldn't read that file."); }
                    };
                    r.readAsText(f); setExportOpen(false);
                  }} />
              </label>
            </div>
          )}
        </div>
      </div>

      {view === "board" && (
        <BoardView opps={filtered} onEdit={(o) => { setEditing(o); setShowAdd(true); }}
          onDelete={removeOpp} onStatusChange={changeStatus} />
      )}
      {view === "notyet" && (
        <NotYetView list={notYetList} onEdit={(o) => { setEditing(o); setShowAdd(true); }}
          onSubmit={(o) => changeStatus(o, "submitted")} />
      )}
      {view === "inprogress" && (
        <InProgressView list={inProgressList} onEdit={(o) => { setEditing(o); setShowAdd(true); }}
          onSubmit={(o) => changeStatus(o, "submitted")} />
      )}
      {view === "applied" && (
        <AppliedView list={historyList} onEdit={(o) => { setEditing(o); setShowAdd(true); }} />
      )}
      {view === "deadlines" && (
        <DeadlinesView list={deadlineList} onOpen={openFeedItem}
          onAddEvent={() => { setEditingEvent(blankCalEvent()); setShowEventModal(true); }}
          onImportEvents={importEvents} flash={flash} />
      )}
      {view === "history" && (
        <HistoryView list={historyList} onEdit={(o) => { setEditing(o); setShowAdd(true); }} onToggleFlag={toggleFlag} />
      )}
      {view === "lessons" && <LessonsView lessons={lessons} setLessons={setLessons} opps={opps} />}
      {view === "prefs" && <PrefsView opps={opps} prefs={prefs} setPrefs={setPrefs} />}
      {view === "resumes" && (
        <ResumesView resumes={resumes} onAdd={() => { setEditingResume(blankResume()); setShowResumeModal(true); }}
          onEdit={(r) => { setEditingResume(r); setShowResumeModal(true); }} onDelete={removeResume} />
      )}
      {view === "stats" && (
        <StatsView badges={badges} streak={streak} points={totalPoints} winRate={winRate}
          submittedCount={submittedCount} offerCount={offerCount} opps={opps} />
      )}
      {view === "manual" && <ManualView />}

      {showAdd && (
        <EditModal opp={editing} resumes={resumes} onClose={() => setShowAdd(false)}
          onSave={(o) => { upsert(o); setShowAdd(false); }}
          onDelete={(id) => { removeOpp(id); setShowAdd(false); }} />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)}
          onAccept={(o) => { upsert(o); setShowImport(false); setEditing(o); setShowAdd(true); }} />
      )}
      {showResumeModal && (
        <ResumeModal resume={editingResume} onClose={() => setShowResumeModal(false)}
          onSave={(r) => { upsertResume(r); setShowResumeModal(false); }}
          onDelete={(id) => { removeResume(id); setShowResumeModal(false); }} />
      )}
      {showEventModal && (
        <EventModal event={editingEvent} onClose={() => setShowEventModal(false)}
          onSave={(e) => { upsertEvent(e); setShowEventModal(false); }}
          onDelete={(id) => { removeEvent(id); setShowEventModal(false); }} />
      )}

      {toast && <div className="ot-toast">{toast}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return <button className={"ot-tab" + (active ? " active" : "")} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function AttachmentField({ image, onChange }) {
  const fileRef = useRef(null);
  return (
    <div className="ot-attach">
      {image ? (
        <div className="ot-attach-preview">
          <img src={image} alt="attachment" />
          <div className="ot-attach-actions">
            <button type="button" onClick={() => fileRef.current.click()}>Replace</button>
            <button type="button" onClick={() => onChange(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className="ot-attach-empty" onClick={() => fileRef.current.click()}>
          <ImageIcon size={14} /> Attach a screenshot or image
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => readImageFile(e.target.files[0], onChange)} />
    </div>
  );
}

function BoardView({ opps, onEdit, onDelete, onStatusChange }) {
  const scrollRef = useRef(null);
  const [showFade, setShowFade] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setShowFade(el.scrollWidth > el.clientWidth && !atEnd);
    };
    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [opps]);

  if (!opps.length) {
    return <div className="ot-empty"><p>No opportunities logged yet.</p>
      <p className="ot-empty-sub">Add one, or paste a listing into "Paste It In" to get a head start on the fields.</p></div>;
  }
  return (
    <div className="ot-board-wrap">
      <div className="ot-board" ref={scrollRef}>
        {BOARD_ORDER.map((statusKey) => {
          const col = STATUS_MAP[statusKey];
          const items = opps.filter((o) => o.status === statusKey);
          return (
            <div className="ot-col" key={statusKey}>
              <div className="ot-col-head">
                <span className="ot-dot" style={{ background: col.color }} />
                <span>{col.label}</span>
                <em>{items.length}</em>
              </div>
              <div className="ot-col-body">
                {items.map((o) => (
                  <Card key={o.id} o={o} onEdit={() => onEdit(o)} onDelete={() => onDelete(o.id)}
                    onStatusChange={(s) => onStatusChange(o, s)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {showFade && <div className="ot-board-fade" aria-hidden="true"><ChevronRight size={16} /></div>}
    </div>
  );
}

function Card({ o, onEdit, onDelete, onStatusChange }) {
  const u = urgency(o.deadline);
  return (
    <div className="ot-card">
      <div className="ot-card-top">
        <span className="ot-card-cat">{o.category}</span>
        <div className="ot-card-actions">
          <button onClick={onEdit}><Pencil size={12} /></button>
          <button onClick={onDelete}><Trash2 size={12} /></button>
        </div>
      </div>
      <div className="ot-card-title">{o.title || "Untitled"}</div>
      {o.org && <div className="ot-card-org">{o.org}</div>}
      <div className="ot-card-foot">
        {o.deadline
          ? <span className={"ot-badge " + u.cls}>{u.label}</span>
          : <span className="ot-badge u-none">no deadline</span>}
        {o.link && <a href={o.link} target="_blank" rel="noreferrer" className="ot-link"><LinkIcon size={11} /></a>}
        {o.customFields && o.customFields.length > 0 && (
          <span className="ot-badge u-none">+{o.customFields.length} field{o.customFields.length === 1 ? "" : "s"}</span>
        )}
        {o.attachmentImage && <Paperclip size={12} className="ot-muted-icon" />}
      </div>
      <select className="ot-card-select" value={o.status} onChange={(e) => onStatusChange(e.target.value)}>
        {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
    </div>
  );
}

function InProgressView({ list, onEdit, onSubmit }) {
  if (!list.length) {
    return <div className="ot-empty"><p>Nothing in progress right now.</p>
      <p className="ot-empty-sub">Once you move something from Saved into In Progress, it'll collect here.</p></div>;
  }
  return (
    <div className="ot-deadlines">
      {list.map((o) => {
        const u = urgency(o.deadline);
        return (
          <div className="ot-drow" key={o.id}>
            <span className={"ot-badge " + u.cls}>{u.label}</span>
            <div className="ot-drow-main" onClick={() => onEdit(o)}>
              <div className="ot-drow-title">{o.title || "Untitled"}</div>
              <div className="ot-drow-sub">{o.org} · {o.category}</div>
            </div>
            <button className="ot-btn ot-btn-ghost ot-btn-sm" onClick={() => onSubmit(o)}>Mark submitted</button>
          </div>
        );
      })}
    </div>
  );
}

function AppliedView({ list, onEdit }) {
  if (!list.length) {
    return <div className="ot-empty"><p>Nothing submitted yet.</p>
      <p className="ot-empty-sub">Everything you've sent out — at any stage from submitted through offer or rejected — will collect here.</p></div>;
  }
  return (
    <div className="ot-deadlines">
      {list.map((o) => (
        <div className="ot-drow" key={o.id} onClick={() => onEdit(o)}>
          <span className="ot-badge u-none">{STATUS_MAP[o.status]?.label}</span>
          <div className="ot-drow-main">
            <div className="ot-drow-title">{o.title || "Untitled"}</div>
            <div className="ot-drow-sub">{o.org} · {o.category}</div>
          </div>
          {o.deadline && <div className="ot-drow-date">{o.deadline}</div>}
        </div>
      ))}
    </div>
  );
}
function NotYetView({ list, onEdit, onSubmit }) {
  if (!list.length) {
    return <div className="ot-empty"><p>Nothing bookmarked right now.</p>
      <p className="ot-empty-sub">Things you've saved but haven't sent out yet will collect here.</p></div>;
  }
  return (
    <div className="ot-deadlines">
      {list.map((o) => {
        const u = urgency(o.deadline);
        return (
          <div className="ot-drow" key={o.id}>
            <span className={"ot-badge " + u.cls}>{u.label}</span>
            <div className="ot-drow-main" onClick={() => onEdit(o)}>
              <div className="ot-drow-title">{o.title || "Untitled"}</div>
              <div className="ot-drow-sub">{o.org} · {o.category}</div>
            </div>
            <button className="ot-btn ot-btn-ghost ot-btn-sm" onClick={() => onSubmit(o)}>Mark submitted</button>
          </div>
        );
      })}
    </div>
  );
}

function DeadlinesView({ list, onOpen, onAddEvent, onImportEvents, flash }) {
  const [urlValue, setUrlValue] = useState("");
  const [fetching, setFetching] = useState(false);
  const fileRef = useRef(null);

  function handleFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const parsed = parseICS(String(r.result));
      if (!parsed.length) flash("Couldn't find any dated events in that file.");
      else onImportEvents(parsed, "calendar-import");
    };
    r.readAsText(f);
    e.target.value = "";
  }

  async function handleUrl() {
    if (!urlValue.trim()) return;
    setFetching(true);
    try {
      const res = await fetch(urlValue.trim());
      if (!res.ok) throw new Error("bad response");
      const text = await res.text();
      const parsed = parseICS(text);
      if (!parsed.length) throw new Error("no events");
      onImportEvents(parsed, "calendar-import");
      setUrlValue("");
    } catch {
      flash("That link didn't come through — most calendar providers block this from a browser app. Download the .ics file from your calendar instead and use the file import above.");
    } finally { setFetching(false); }
  }

  return (
    <div className="ot-deadlines-wrap">
      <div className="ot-deadlines-controls">
        <button className="ot-btn ot-btn-primary" onClick={onAddEvent}><Plus size={14} /> Add a deadline</button>
        <button className="ot-btn ot-btn-ghost" onClick={() => fileRef.current.click()}><CalendarClock size={14} /> Import calendar (.ics file)</button>
        <input ref={fileRef} type="file" accept=".ics,text/calendar" style={{ display: "none" }} onChange={handleFile} />
        <div className="ot-deadlines-urlrow">
          <input placeholder="or paste a public calendar link" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} />
          <button className="ot-btn ot-btn-ghost ot-btn-sm" onClick={handleUrl} disabled={fetching}>{fetching ? "Trying…" : "Try link"}</button>
        </div>
      </div>

      {!list.length ? (
        <div className="ot-empty"><p>Nothing with a deadline yet.</p>
          <p className="ot-empty-sub">Opportunity deadlines, imported calendar dates, and anything you add by hand all land here, sorted soonest-first, and export as .ics for your calendar.</p></div>
      ) : (
        <div className="ot-deadlines">
          {list.map((item) => {
            const u = urgency(item.date);
            return (
              <div className="ot-drow" key={item.key} onClick={() => onOpen(item)}>
                <span className={"ot-badge " + u.cls}>{u.label}</span>
                <div className="ot-drow-main">
                  <div className="ot-drow-title">{item.title}</div>
                  <div className="ot-drow-sub">{item.sub}{item.statusLabel ? ` · ${item.statusLabel}` : ""}{item.kind === "event" ? " · calendar" : ""}</div>
                </div>
                <div className="ot-drow-date">{item.date}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventModal({ event, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(event);
  const isNew = !event.title && !event.date;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="ot-modal-backdrop" onClick={onClose}>
      <div className="ot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ot-modal-head"><span>{isNew ? "Add a deadline" : "Edit deadline"}</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="ot-modal-body">
          <label>Title<input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Call the loan officer back" /></label>
          <label>Date<input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
          <label>Note<textarea rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Anything you want to remember" /></label>
        </div>
        <div className="ot-modal-foot">
          {!isNew && <button className="ot-btn ot-btn-danger" onClick={() => onDelete(form.id)}><Trash2 size={14} /> Delete</button>}
          <div className="ot-toolbar-spacer" />
          <button className="ot-btn ot-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ot-btn ot-btn-primary" onClick={() => onSave(form)} disabled={!form.title.trim() || !form.date}>Save</button>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ list, onEdit, onToggleFlag }) {
  if (!list.length) {
    return <div className="ot-empty"><p>No submissions yet.</p>
      <p className="ot-empty-sub">Once you submit something, it'll live here — full guidelines, notes, and timeline, so you can pull it back up before an interview.</p></div>;
  }
  return (
    <div className="ot-history">
      {list.map((o) => <HistoryCard key={o.id} o={o} onEdit={onEdit} onToggleFlag={onToggleFlag} />)}
    </div>
  );
}

function HistoryCard({ o, onEdit, onToggleFlag }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ot-hcard">
      <div className="ot-hcard-head" onClick={() => setOpen((v) => !v)}>
        <ChevronRight size={15} className={"ot-chev" + (open ? " open" : "")} />
        <div className="ot-hcard-main">
          <div className="ot-hcard-title">{o.title || "Untitled"}</div>
          <div className="ot-hcard-sub">{o.org} · {o.category} · <span className="ot-hcard-status">{STATUS_MAP[o.status]?.label}</span></div>
        </div>
        <button className={"ot-flag" + (o.flagged ? " on" : "")} onClick={(e) => { e.stopPropagation(); onToggleFlag(o); }}
          title="Flag as a good interview story">
          <Star size={16} fill={o.flagged ? "currentColor" : "none"} />
        </button>
      </div>
      {open && (
        <div className="ot-hcard-body">
          <div className="ot-timeline">
            {(o.history || []).map((h, i) => (
              <div className="ot-tl-row" key={i}>
                <span className="ot-tl-dot" />
                <span className="ot-tl-label">{STATUS_MAP[h.status]?.label || h.status}</span>
                <span className="ot-tl-date">{h.date}</span>
              </div>
            ))}
          </div>
          {o.resumeName && <div className="ot-hcard-block"><div className="ot-hcard-label">Resume used</div><p>{o.resumeName}</p></div>}
          {o.guidelines && <div className="ot-hcard-block"><div className="ot-hcard-label">Guidelines</div><p>{o.guidelines}</p></div>}
          {o.notes && <div className="ot-hcard-block"><div className="ot-hcard-label">Notes</div><p>{o.notes}</p></div>}
          {o.customFields && o.customFields.length > 0 && (
            <div className="ot-hcard-block">
              <div className="ot-hcard-label">Custom fields</div>
              {o.customFields.map((cf) => <p key={cf.id}><strong>{cf.label}:</strong> {cf.value}</p>)}
            </div>
          )}
          {o.attachmentImage && (
            <div className="ot-hcard-block"><div className="ot-hcard-label">Attachment</div>
              <img className="ot-hcard-img" src={o.attachmentImage} alt="attachment" />
            </div>
          )}
          <button className="ot-btn ot-btn-ghost ot-btn-sm" onClick={() => onEdit(o)}><Pencil size={13} /> Edit</button>
        </div>
      )}
    </div>
  );
}

function LessonsView({ lessons, setLessons, opps }) {
  const [text, setText] = useState("");
  const [linkedId, setLinkedId] = useState("");

  function add() {
    if (!text.trim()) return;
    const opp = opps.find((o) => o.id === linkedId);
    setLessons((prev) => [{ id: uid(), date: new Date().toISOString().slice(0, 10), text: text.trim(), oppId: linkedId || null, oppTitle: opp ? opp.title : null }, ...prev]);
    setText(""); setLinkedId("");
  }
  function remove(id) { setLessons((prev) => prev.filter((l) => l.id !== id)); }

  return (
    <div className="ot-lessons">
      <div className="ot-lessons-add">
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="What did this one teach you? A pattern in feedback, something to prep differently next time, a question you want to be ready for…" />
        <div className="ot-lessons-add-row">
          <select value={linkedId} onChange={(e) => setLinkedId(e.target.value)}>
            <option value="">Not linked to a specific opportunity</option>
            {opps.map((o) => <option key={o.id} value={o.id}>{o.title || "Untitled"}</option>)}
          </select>
          <button className="ot-btn ot-btn-primary" onClick={add}><Plus size={14} /> Add lesson</button>
        </div>
      </div>

      {!lessons.length ? (
        <div className="ot-empty-sub" style={{ marginTop: 18 }}>Nothing logged yet — this is just for you, jot down whatever's useful later.</div>
      ) : (
        <div className="ot-lessons-list">
          {lessons.map((l) => (
            <div className="ot-lesson" key={l.id}>
              <div className="ot-lesson-top">
                <span className="ot-lesson-date">{l.date}</span>
                {l.oppTitle && <span className="ot-badge u-none">{l.oppTitle}</span>}
                <button className="ot-removefield-btn" onClick={() => remove(l.id)}><CircleMinus size={14} /></button>
              </div>
              <p>{l.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="ot-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(value === n ? 0 : n)}>
          <Star size={16} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function PrefsView({ opps, prefs, setPrefs }) {
  const statsByCat = useMemo(() => {
    const m = {};
    CATEGORIES.forEach((c) => { m[c] = { submitted: 0, interviews: 0, offers: 0 }; });
    opps.forEach((o) => {
      const reached = o.reachedStatuses || [];
      if (!m[o.category]) m[o.category] = { submitted: 0, interviews: 0, offers: 0 };
      if (reached.some((s) => s !== "saved")) m[o.category].submitted++;
      if (reached.includes("interview_1") || reached.includes("interview_2")) m[o.category].interviews++;
      if (reached.includes("offer")) m[o.category].offers++;
    });
    return m;
  }, [opps]);

  function setPref(cat, patch) {
    setPrefs((prev) => ({ ...prev, [cat]: { ...(prev[cat] || { rating: 0, notes: "" }), ...patch } }));
  }

  return (
    <div className="ot-prefs">
      <p className="ot-empty-sub" style={{ marginBottom: 16 }}>
        Rate what you actually want more of, separate from what's easiest to get. The numbers are pulled from your own data.
      </p>
      <div className="ot-prefs-grid">
        {CATEGORIES.map((cat) => {
          const s = statsByCat[cat] || { submitted: 0, interviews: 0, offers: 0 };
          const p = prefs[cat] || { rating: 0, notes: "" };
          return (
            <div className="ot-prefcard" key={cat}>
              <div className="ot-prefcard-top">
                <span className="ot-prefcard-name">{cat}</span>
                <StarRating value={p.rating} onChange={(v) => setPref(cat, { rating: v })} />
              </div>
              <div className="ot-prefcard-stats">
                <span>{s.submitted} pursued</span><span>{s.interviews} interviews</span><span>{s.offers} offers</span>
              </div>
              <textarea rows={2} placeholder="Why this one, or why not…" value={p.notes}
                onChange={(e) => setPref(cat, { notes: e.target.value })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResumesView({ resumes, onAdd, onEdit, onDelete }) {
  return (
    <div className="ot-resumes">
      <div className="ot-resumes-head">
        <p className="ot-empty-sub">
          Keep the actual files in Google Docs, OneDrive, or iCloud — just paste the share link here for each version,
          and tag what it's tuned for so you always grab the right one.
        </p>
        <button className="ot-btn ot-btn-primary" onClick={onAdd}><Plus size={14} /> Add version</button>
      </div>
      {!resumes.length ? (
        <div className="ot-empty"><p>No resume versions saved yet.</p>
          <p className="ot-empty-sub">Add one for each flavor — the writing-focused one, the tech one, the "just needs a job" one.</p></div>
      ) : (
        <div className="ot-resume-grid">
          {resumes.map((r) => (
            <div className="ot-resumecard" key={r.id}>
              <div className="ot-resumecard-top">
                <span className="ot-resumecard-name">{r.name || "Untitled version"}</span>
                <div className="ot-card-actions">
                  <button onClick={() => onEdit(r)}><Pencil size={12} /></button>
                  <button onClick={() => onDelete(r.id)}><Trash2 size={12} /></button>
                </div>
              </div>
              {r.link && <a className="ot-resumecard-link" href={r.link} target="_blank" rel="noreferrer">
                <ExternalLink size={12} /> Open file
              </a>}
              {r.tags && r.tags.length > 0 && (
                <div className="ot-resumecard-tags">
                  {r.tags.map((t) => <span key={t} className="ot-badge u-none">{t}</span>)}
                </div>
              )}
              {r.notes && <p className="ot-resumecard-notes">{r.notes}</p>}
              <div className="ot-resumecard-date">updated {r.updated}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeModal({ resume, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(resume);
  const isNew = !resume.name && !resume.link;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function toggleTag(cat) {
    const has = (form.tags || []).includes(cat);
    set("tags", has ? form.tags.filter((t) => t !== cat) : [...(form.tags || []), cat]);
  }
  function save() { onSave({ ...form, updated: new Date().toISOString().slice(0, 10) }); }

  return (
    <div className="ot-modal-backdrop" onClick={onClose}>
      <div className="ot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ot-modal-head"><span>{isNew ? "Add resume version" : "Edit resume version"}</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="ot-modal-body">
          <label>Name<input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Design-focused v3" /></label>
          <label>Link (Google Docs, OneDrive, iCloud, etc.)
            <input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" />
          </label>
          <label>Tuned for
            <div className="ot-tagpicker">
              {CATEGORIES.map((c) => (
                <button type="button" key={c} className={"ot-tagchip" + ((form.tags || []).includes(c) ? " on" : "")}
                  onClick={() => toggleTag(c)}>{c}</button>
              ))}
            </div>
          </label>
          <label>Notes<textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What's different about this version, when to use it…" /></label>
        </div>
        <div className="ot-modal-foot">
          {!isNew && <button className="ot-btn ot-btn-danger" onClick={() => onDelete(form.id)}><Trash2 size={14} /> Delete</button>}
          <div className="ot-toolbar-spacer" />
          <button className="ot-btn ot-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ot-btn ot-btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ManualView() {
  return (
    <div className="ot-manual">
      <section>
        <h3>Welcome</h3>
        <p>Sunrise Moonrise tracks every submission, saved idea, and lesson learned in one place — built for
          people juggling more than one kind of opportunity at once: writing calls, jobs, grants, bootcamps,
          contracts, and everything between.</p>
      </section>

      <section>
        <h3>The top of the page</h3>
        <p><strong>Mantra box</strong> — one of 365 rotating hopeful lines, changing daily. <em>Shuffle</em> gets
          a new one now; <em>Write your own</em> pins a line of your choosing.</p>
        <p><strong>Next Up / Urgent / Upcoming</strong> — a countdown to your nearest deadline, plus everything
          due in 0–3 days and 4–14 days. Pulled from opportunities, imported calendar dates, and anything you've
          added by hand. Click any row to open it.</p>
      </section>

      <section>
        <h3>Tabs</h3>
        <ul>
          <li><strong>Board</strong> — your full pipeline as columns; change status right from a card. Scrolls <strong>horizontally</strong> (11 statuses is wider than one screen) — a fade arrow on the right edge shows when there's more to scroll to.</li>
          <li><strong>Not Yet Applied</strong> — saved or drafted ideas, one click from becoming submitted.</li>
          <li><strong>Deadlines</strong> — every dated item, plus adding your own and importing a calendar.</li>
          <li><strong>History</strong> — everything ever submitted, expandable for interview prep, with a star
            for "good story" entries.</li>
          <li><strong>Lessons Learned</strong> — a free-form journal, optionally linked to a specific opportunity.</li>
          <li><strong>Preferred Types</strong> — star-rate categories against your own real numbers.</li>
          <li><strong>Resumes</strong> — links to your files elsewhere (Docs/OneDrive/iCloud), tagged by use.</li>
          <li><strong>Stats</strong> — streak, points, badges, and a category breakdown.</li>
        </ul>
      </section>

      <section>
        <h3>Adding an opportunity</h3>
        <p><strong>Add</strong> opens a full card. <strong>Paste It In</strong> is faster: paste an email or
          listing and a local, non-AI parser guesses the title, org, category, deadline, and link — you review
          and correct before saving. You can also paste or drop an image to keep as a reference attachment.</p>
      </section>

      <section>
        <h3>Calendars</h3>
        <p>Import an <code>.ics</code> file (downloaded from Google/Outlook/Apple Calendar) to pull in dated
          events. Pasting a live calendar link is a best-effort attempt — most providers block this from a
          browser app for security reasons, so the file import is the reliable path.</p>
      </section>

      <section>
        <h3>Data & privacy</h3>
        <p>Everything is saved privately to your Claude account — nothing is shared, and there is no AI call
          anywhere in this app. <strong>Import / Export → Export as JSON</strong> regularly; restore any time
          from the same menu.</p>
      </section>

      <section>
        <h3>Known limits</h3>
        <ul>
          <li>No live two-way calendar sync — <code>.ics</code> import/export is the substitute.</li>
          <li>Quick Paste is local pattern-matching, not AI — it won't be perfect, and that's by design.</li>
          <li>Data is temporary data to help you organize. Import/Export to pick up where you left off.</li>
        </ul>
      </section>
    </div>
  );
}

function StatsView({ badges, streak, points, winRate, submittedCount, offerCount, opps }) {
  const byCat = useMemo(() => {
    const m = {};
    opps.forEach((o) => { m[o.category] = (m[o.category] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [opps]);
  const max = Math.max(1, ...byCat.map((c) => c[1]));

  return (
    <div className="ot-stats">
      <div className="ot-meter">
        <div className="ot-meter-head">
          <Flame size={18} />
          <div>
            <div className="ot-meter-num">{streak} week{streak === 1 ? "" : "s"}</div>
            <div className="ot-meter-label">submission streak</div>
          </div>
        </div>
        <div className="ot-meter-track">
          {Array.from({ length: 8 }).map((_, i) => <span key={i} className={i < streak ? "on" : ""} />)}
        </div>
      </div>

      <div className="ot-statgrid">
        <div className="ot-stattile"><div className="n">{points}</div><div className="l">points</div></div>
        <div className="ot-stattile"><div className="n">{submittedCount}</div><div className="l">opportunities pursued</div></div>
        <div className="ot-stattile"><div className="n">{offerCount}</div><div className="l">offers</div></div>
        <div className="ot-stattile"><div className="n">{winRate}%</div><div className="l">offer rate</div></div>
      </div>

      <div className="ot-section-label">Badges</div>
      <div className="ot-badges">
        {badges.map((b) => (
          <div key={b.id} className={"ot-badge-tile" + (b.done ? " done" : "")}>
            <div className="ot-badge-icon">{b.done ? <Check size={16} /> : <Trophy size={16} />}</div>
            <div className="ot-badge-name">{b.label}</div>
            <div className="ot-badge-desc">{b.desc}</div>
          </div>
        ))}
      </div>

      <div className="ot-section-label">By category</div>
      <div className="ot-bars">
        {byCat.map(([cat, n]) => (
          <div className="ot-bar-row" key={cat}>
            <span className="ot-bar-label">{cat}</span>
            <div className="ot-bar-track"><div className="ot-bar-fill" style={{ width: `${(n / max) * 100}%` }} /></div>
            <span className="ot-bar-n">{n}</span>
          </div>
        ))}
        {!byCat.length && <div className="ot-empty-sub">Nothing logged yet.</div>}
      </div>
    </div>
  );
}

function EditModal({ opp, resumes, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(opp);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !opp.title && !opp.org;

  function save() {
    const reached = Array.from(new Set([...(form.reachedStatuses || []), form.status]));
    onSave({ ...form, reachedStatuses: reached });
  }

  return (
    <div className="ot-modal-backdrop" onClick={onClose}>
      <div className="ot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ot-modal-head">
          <span>{isNew ? "Add opportunity" : "Edit opportunity"}</span>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ot-modal-body">
          <label>Title
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Fall writers open call" />
          </label>
          <label>Organization
            <input value={form.org} onChange={(e) => set("org", e.target.value)} placeholder="e.g. Kestrel Review" />
          </label>
          <div className="ot-row2">
            <label>Category
              <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Status
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <div className="ot-row2">
            <label>Deadline
              <input type="date" value={form.deadline || ""} onChange={(e) => set("deadline", e.target.value)} />
            </label>
            <label>Link
              <input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://…" />
            </label>
          </div>
          <label>Guidelines / criteria
            <textarea rows={4} value={form.guidelines} onChange={(e) => set("guidelines", e.target.value)} placeholder="Paste the eligibility rules, word count, format, etc." />
          </label>
          <label>Notes
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything you want to remember — who referred you, follow-up dates…" />
          </label>

          {resumes && resumes.length > 0 && (
            <label>Resume version used
              <select value={form.resumeId || ""} onChange={(e) => {
                const r = resumes.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, resumeId: e.target.value, resumeName: r ? r.name : "" }));
              }}>
                <option value="">Not tracked</option>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.name || "Untitled version"}</option>)}
              </select>
            </label>
          )}

          <label>Attachment
            <AttachmentField image={form.attachmentImage} onChange={(img) => set("attachmentImage", img)} />
          </label>

          <div className="ot-customfields">
            <div className="ot-customfields-head">
              <span>Custom fields</span>
              <button type="button" className="ot-addfield-btn" onClick={() =>
                set("customFields", [...(form.customFields || []), { id: uid(), label: "", value: "" }])
              }><Plus size={13} /> Add field</button>
            </div>
            {(form.customFields || []).length === 0 && (
              <div className="ot-empty-sub">Add anything the built-in fields don't cover — a rubric, a referral name, a word count, a required document.</div>
            )}
            {(form.customFields || []).map((cf, i) => (
              <div className="ot-customfield-row" key={cf.id}>
                <input placeholder="Field name" value={cf.label}
                  onChange={(e) => { const next = [...form.customFields]; next[i] = { ...next[i], label: e.target.value }; set("customFields", next); }} />
                <textarea placeholder="Value" rows={1} value={cf.value}
                  onChange={(e) => { const next = [...form.customFields]; next[i] = { ...next[i], value: e.target.value }; set("customFields", next); }} />
                <button type="button" className="ot-removefield-btn" onClick={() =>
                  set("customFields", form.customFields.filter((f) => f.id !== cf.id))
                }><CircleMinus size={15} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="ot-modal-foot">
          {!isNew && <button className="ot-btn ot-btn-danger" onClick={() => onDelete(form.id)}><Trash2 size={14} /> Delete</button>}
          <div className="ot-toolbar-spacer" />
          <button className="ot-btn ot-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ot-btn ot-btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onAccept }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [draft, setDraft] = useState(null);

  function handlePaste(e) {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        readImageFile(item.getAsFile(), setImage);
        break;
      }
    }
  }
  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readImageFile(file, setImage);
  }

  function parse() {
    if (!text.trim() && !image) return;
    const guess = text.trim() ? heuristicParse(text) : { title: "", org: "", category: "Other", deadline: "", link: "", guidelines: "" };
    setDraft({ ...blankOpp(), ...guess, attachmentImage: image });
  }

  return (
    <div className="ot-modal-backdrop" onClick={onClose}>
      <div className="ot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ot-modal-head"><span>Paste It In</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="ot-modal-body">
          {!draft ? (
            <>
              <label>Paste an email, a listing, or an image (⌘V / Ctrl+V) — or drop a file below
                <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} onPaste={handlePaste}
                  placeholder="Paste the call for submissions, job post, grant guidelines, or an email thread…" />
              </label>
              <div className="ot-dropzone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                {image ? (
                  <div className="ot-attach-preview">
                    <img src={image} alt="pasted" />
                    <div className="ot-attach-actions"><button type="button" onClick={() => setImage(null)}>Remove</button></div>
                  </div>
                ) : (
                  <span><ImageIcon size={14} /> Drop an image here, or paste one into the box above</span>
                )}
              </div>
              <div className="ot-import-note">
                This is a plain local guesser — no AI, nothing sent anywhere. It looks for a deadline date, a link,
                and a few keywords, then hands you an editable draft, plus keeps any pasted image attached for reference.
              </div>
            </>
          ) : (
            <>
              <div className="ot-import-note">Review and fix anything before saving — nothing's added yet.</div>
              <label>Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
              <label>Organization<input value={draft.org} onChange={(e) => setDraft({ ...draft, org: e.target.value })} /></label>
              <div className="ot-row2">
                <label>Category
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label>Deadline<input type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} /></label>
              </div>
              <label>Link<input value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} /></label>
              <label>Guidelines / pasted text<textarea rows={5} value={draft.guidelines} onChange={(e) => setDraft({ ...draft, guidelines: e.target.value })} /></label>
              <label>Attachment<AttachmentField image={draft.attachmentImage} onChange={(img) => setDraft({ ...draft, attachmentImage: img })} /></label>
            </>
          )}
        </div>
        <div className="ot-modal-foot">
          <div className="ot-toolbar-spacer" />
          {!draft ? (
            <button className="ot-btn ot-btn-primary" onClick={parse} disabled={!text.trim() && !image}>Guess fields</button>
          ) : (
            <>
              <button className="ot-btn ot-btn-ghost" onClick={() => setDraft(null)}>Back</button>
              <button className="ot-btn ot-btn-primary" onClick={() => onAccept(draft)}>Add to tracker</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const CSS = `
:root{
  --ink:#FAF9FC; --panel:#FFFFFF; --line:#E4E1F5; --line-soft:#EDEBFA;
  --text:#231F3B; --muted:#7A7690;
  --amber:#EF9F27; --green:#1D9E75; --red:#D4537E; --blue:#7F77DD;
  --purple-light:#EEEDFE; --pink-light:#FBEAF0; --purple-dark:#3C3489;
}
*{box-sizing:border-box;}
.ot-root{
  background:var(--ink); color:var(--text); min-height:100vh; width:100%;
  font-family:Inter,ui-sans-serif,system-ui,sans-serif; font-size:14px;
  display:flex; flex-direction:column;
}
.ot-root ::selection{background:var(--purple-light); color:var(--purple-dark);}
.ot-gh-badge{
  position:fixed; top:14px; right:14px; z-index:40;
  font-size:12.5px; font-weight:500; color:#fff; background:var(--text);
  padding:6px 14px; border-radius:6px; text-decoration:none;
  box-shadow:0 2px 8px rgba(0,0,0,0.15); transition:background .15s ease;
}
.ot-gh-badge:hover{ background:var(--blue); }
.ot-header{
  width:100%; background:var(--panel); border-bottom:1px solid var(--line);
}
.ot-header-inner{
  max-width:1300px; margin:0 auto; padding:20px 24px; display:flex;
  align-items:center; gap:14px; flex-wrap:wrap;
}
.ot-brand{
  display:flex; align-items:center; gap:16px; color:var(--purple-dark); flex:0 0 auto;
}
.ot-logo-frame{
  display:flex; border-radius:50%; box-shadow:0 4px 16px rgba(60,52,137,0.22), 0 0 0 1px var(--line);
  flex-shrink:0;
}
.ot-brand-text{ display:flex; flex-direction:column; gap:5px; }
.ot-brand-title{ font-weight:700; font-size:26px; line-height:1; white-space:nowrap; }
.ot-brand-sub{ font-size:12.5px; color:var(--muted); max-width:220px; line-height:1.4; }
.ot-clock{ text-align:right; padding-right:14px; border-right:1px solid var(--line); flex:0 0 auto; }
.ot-clock-date{ font-size:11.5px; color:var(--muted); white-space:nowrap; }
.ot-clock-time{
  font-family:'JetBrains Mono',ui-monospace,monospace; font-size:13.5px; color:var(--purple-dark);
  font-weight:600; margin-top:1px;
}
.ot-stat{
  display:flex; align-items:center; gap:6px; font-family:'JetBrains Mono',ui-monospace,monospace;
  color:var(--amber); font-size:13px; flex:0 0 auto; white-space:nowrap;
}
.ot-stat em{ color:var(--muted); font-style:normal; margin-left:2px; }
.ot-header-divider{ width:1px; align-self:stretch; background:var(--line); flex:0 0 auto; }
.ot-mantra{
  background:linear-gradient(135deg,var(--purple-light),var(--pink-light)); border-radius:12px;
  padding:9px 16px; flex:1 1 220px; min-width:0;
}
.ot-mantra-text{
  width:100%; background:transparent; border:none; outline:none; font-style:italic;
  color:var(--purple-dark); font-size:12.5px; font-family:inherit; text-align:left;
}
.ot-mantra-static{ margin:0 0 5px; }
.ot-mantra-actions{ display:flex; gap:14px; justify-content:flex-start; }
.ot-mantra-link{
  background:transparent; border:none; padding:0; color:var(--purple-dark); opacity:0.7;
  font-size:11px; cursor:pointer; text-decoration:underline;
}
.ot-mantra-link:hover{ opacity:1; }
.ot-hero-wrap{ max-width:1300px; margin:14px auto 0; padding:0 24px; display:flex; gap:16px; flex-wrap:wrap; }
.ot-hero{
  flex:1 1 340px; background:linear-gradient(135deg,var(--purple-light),var(--pink-light));
  border:1px solid var(--line); border-radius:14px; padding:18px 20px; display:flex; align-items:center; gap:20px;
}
.ot-stamp{
  flex:0 0 auto; width:84px; height:84px; border-radius:50%; background:#fff; color:var(--purple-dark);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  box-shadow:0 2px 10px rgba(60,52,137,0.12);
}
.ot-stamp-num{ font-size:26px; font-weight:700; line-height:1; }
.ot-stamp-lbl{ font-size:9px; letter-spacing:0.06em; text-transform:uppercase; margin-top:3px; font-family:'JetBrains Mono',monospace; color:var(--muted); }
.ot-hero-eyebrow{ font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.08em; text-transform:uppercase; color:var(--purple-dark); margin:0 0 5px; }
.ot-hero-copy h2{ margin:0 0 5px; font-size:17px; font-weight:600; color:var(--purple-dark); }
.ot-hero-copy p{ margin:0; font-size:12.5px; color:var(--text); opacity:0.75; }
.ot-callouts{ flex:1 1 320px; display:flex; flex-direction:column; gap:10px; }
.ot-callout{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
.ot-callout.urgent{ border-color:var(--red); }
.ot-callout.upcoming{ border-color:var(--amber); }
.ot-callout-head{
  display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; text-transform:uppercase;
  letter-spacing:0.04em; margin-bottom:6px;
}
.ot-callout.urgent .ot-callout-head{ color:var(--red); }
.ot-callout.upcoming .ot-callout-head{ color:var(--amber); }
.ot-callout-head em{ font-style:normal; margin-left:auto; color:var(--muted); font-family:'JetBrains Mono',monospace; }
.ot-callout-row{
  display:flex; justify-content:space-between; gap:10px; font-size:12.5px; padding:4px 0;
  border-bottom:1px dashed var(--line-soft); cursor:pointer;
}
.ot-callout-row:last-child{ border-bottom:none; }
.ot-callout-row:hover{ color:var(--purple-dark); }
.ot-callout-days{ color:var(--muted); font-family:'JetBrains Mono',monospace; white-space:nowrap; }
.ot-callout-empty{ font-size:12px; color:var(--muted); padding:4px 0; }
.ot-tabs{ display:flex; gap:6px; padding:16px 20px 0; flex-wrap:wrap; }
.ot-tab{
  display:flex; align-items:center; gap:6px; background:var(--panel); border:1px solid var(--line);
  color:var(--muted); padding:7px 12px; border-radius:9px; cursor:pointer; font-size:12.5px;
}
.ot-tab:hover{ color:var(--text); border-color:var(--blue); background:var(--purple-light); }
.ot-tab.active{ background:var(--purple-light); border-color:var(--blue); color:var(--purple-dark); font-weight:600; }
.ot-toolbar{
  display:flex; align-items:center; gap:10px; padding:12px 20px; border-bottom:1px solid var(--line-soft);
  flex-wrap:wrap;
}
.ot-search{
  display:flex; align-items:center; gap:8px; background:var(--panel); border:1px solid var(--line);
  border-radius:8px; padding:7px 10px; color:var(--muted); min-width:220px; flex:1; max-width:320px;
}
.ot-search input{ background:transparent; border:none; outline:none; color:var(--text); font-size:13px; width:100%; }
.ot-select{
  background:var(--panel); border:1px solid var(--line); color:var(--text); border-radius:8px;
  padding:7px 10px; font-size:13px;
}
.ot-toolbar-spacer{ flex:1; }
.ot-btn{
  display:flex; align-items:center; gap:6px; border-radius:8px; padding:8px 13px; font-size:13px;
  cursor:pointer; border:1px solid transparent; font-weight:500; white-space:nowrap;
}
.ot-btn-sm{ padding:5px 10px; font-size:12px; }
.ot-btn-primary{ background:var(--blue); color:#fff; border-color:var(--blue); }
.ot-btn-primary:hover{ filter:brightness(1.06); }
.ot-btn-ghost{ background:var(--panel); color:var(--text); border-color:var(--line); }
.ot-btn-ghost:hover{ border-color:var(--blue); color:var(--purple-dark); }
.ot-btn-danger{ background:transparent; color:var(--red); border-color:var(--red); }
.ot-export-wrap{ position:relative; }
.ot-export-menu{
  position:absolute; right:0; top:calc(100% + 6px); background:var(--panel); border:1px solid var(--line);
  border-radius:10px; padding:6px; display:flex; flex-direction:column; min-width:180px; z-index:20;
  box-shadow:0 10px 28px rgba(124,110,180,0.18);
}
.ot-export-menu button, .ot-export-import{
  background:transparent; border:none; color:var(--text); text-align:left; padding:8px 10px;
  border-radius:6px; font-size:13px; cursor:pointer;
}
.ot-export-menu button:hover, .ot-export-import:hover{ background:var(--purple-light); }
.ot-board-wrap{ position:relative; flex:1; min-height:0; }
.ot-board{ display:flex; gap:14px; padding:18px 20px; overflow-x:auto; height:100%; }
.ot-board-fade{
  position:absolute; top:0; right:0; bottom:0; width:56px; pointer-events:none;
  background:linear-gradient(to right, rgba(250,249,252,0), var(--ink) 78%);
  display:flex; align-items:center; justify-content:flex-end; padding-right:6px; color:var(--muted);
}
.ot-col{ min-width:230px; max-width:230px; display:flex; flex-direction:column; }
.ot-col-head{
  display:flex; align-items:center; gap:7px; font-size:12px; font-weight:600; color:var(--muted);
  text-transform:uppercase; letter-spacing:0.05em; padding:4px 2px 10px;
}
.ot-col-head em{ margin-left:auto; font-style:normal; font-family:'JetBrains Mono',monospace; color:var(--muted); }
.ot-dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.ot-col-body{ display:flex; flex-direction:column; gap:10px; min-height:40px; }
.ot-card{
  background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:11px 12px;
  display:flex; flex-direction:column; gap:6px; box-shadow:0 1px 3px rgba(124,110,180,0.06);
}
.ot-card-top{ display:flex; align-items:center; justify-content:space-between; }
.ot-card-cat{ font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:0.04em; }
.ot-card-actions{ display:flex; gap:4px; }
.ot-card-actions button{ background:transparent; border:none; color:var(--muted); cursor:pointer; padding:2px; }
.ot-card-actions button:hover{ color:var(--text); }
.ot-card-title{ font-weight:600; font-size:13.5px; line-height:1.3; }
.ot-card-org{ font-size:12px; color:var(--muted); }
.ot-card-foot{ display:flex; align-items:center; gap:8px; margin-top:2px; flex-wrap:wrap; }
.ot-badge{
  font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; padding:2px 7px; border-radius:5px;
  border:1px solid; white-space:nowrap;
}
.u-none{ color:var(--muted); border-color:var(--line); }
.u-cool{ color:var(--green); border-color:var(--green); }
.u-warm{ color:var(--amber); border-color:var(--amber); }
.u-hot{ color:var(--red); border-color:var(--red); }
.u-over{ color:#fff; background:var(--red); border-color:var(--red); }
.ot-link{ color:var(--muted); display:flex; }
.ot-muted-icon{ color:var(--muted); }
.ot-card-select{
  margin-top:4px; background:var(--line-soft); border:1px solid var(--line); color:var(--text);
  border-radius:6px; font-size:11.5px; padding:5px 6px;
}
.ot-empty{ padding:60px 20px; text-align:center; color:var(--muted); }
.ot-empty-sub{ font-size:13px; margin-top:6px; }
.ot-deadlines-wrap{ display:flex; flex-direction:column; flex:1; min-height:0; }
.ot-deadlines-controls{
  display:flex; align-items:center; gap:10px; padding:14px 20px 0; flex-wrap:wrap;
}
.ot-deadlines-urlrow{ display:flex; gap:6px; align-items:center; }
.ot-deadlines-urlrow input{
  background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:7px 9px; font-size:12.5px;
  color:var(--text); width:220px;
}
.ot-deadlines{ padding:16px 20px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; }
.ot-drow{
  display:flex; align-items:center; gap:14px; background:var(--panel); border:1px solid var(--line);
  border-radius:10px; padding:10px 14px; cursor:pointer; box-shadow:0 1px 3px rgba(124,110,180,0.06);
}
.ot-drow:hover{ border-color:var(--blue); }
.ot-drow-main{ flex:1; }
.ot-drow-title{ font-weight:600; font-size:13.5px; }
.ot-drow-sub{ font-size:12px; color:var(--muted); margin-top:2px; }
.ot-drow-date{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted); }
.ot-history{ padding:16px 20px; display:flex; flex-direction:column; gap:10px; overflow-y:auto; }
.ot-hcard{ background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(124,110,180,0.06); }
.ot-hcard-head{ display:flex; align-items:center; gap:10px; padding:12px 14px; cursor:pointer; }
.ot-chev{ transition:transform .15s ease; color:var(--muted); flex-shrink:0; }
.ot-chev.open{ transform:rotate(90deg); }
.ot-hcard-main{ flex:1; }
.ot-hcard-title{ font-weight:600; font-size:13.5px; }
.ot-hcard-sub{ font-size:12px; color:var(--muted); margin-top:2px; }
.ot-hcard-status{ color:var(--purple-dark); }
.ot-flag{ background:transparent; border:none; color:var(--line); cursor:pointer; }
.ot-flag.on{ color:var(--amber); }
.ot-hcard-body{ padding:0 14px 14px; border-top:1px solid var(--line-soft); }
.ot-timeline{ margin:12px 0; display:flex; flex-direction:column; gap:6px; }
.ot-tl-row{ display:flex; align-items:center; gap:8px; font-size:12px; }
.ot-tl-dot{ width:6px; height:6px; border-radius:50%; background:var(--blue); flex-shrink:0; }
.ot-tl-label{ flex:1; }
.ot-tl-date{ color:var(--muted); font-family:'JetBrains Mono',monospace; }
.ot-hcard-block{ margin-top:10px; font-size:12.5px; }
.ot-hcard-label{ font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin-bottom:4px; }
.ot-hcard-block p{ margin:0 0 4px; line-height:1.5; white-space:pre-wrap; }
.ot-hcard-img{ max-width:220px; border-radius:8px; border:1px solid var(--line); margin-top:4px; }
.ot-lessons{ padding:18px 20px 40px; max-width:760px; }
.ot-lessons-add{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; }
.ot-lessons-add textarea{
  width:100%; background:var(--line-soft); border:1px solid var(--line); border-radius:8px; padding:9px 10px;
  color:var(--text); font-size:13px; font-family:inherit; resize:vertical;
}
.ot-lessons-add-row{ display:flex; gap:8px; margin-top:8px; align-items:center; }
.ot-lessons-add-row select{
  flex:1; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:7px 9px; font-size:12.5px; color:var(--text);
}
.ot-lessons-list{ display:flex; flex-direction:column; gap:10px; margin-top:18px; }
.ot-lesson{ background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
.ot-lesson-top{ display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.ot-lesson-date{ font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); }
.ot-lesson p{ margin:0; font-size:13px; line-height:1.5; }
.ot-prefs{ padding:18px 20px 40px; }
.ot-prefs-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
.ot-prefcard{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:13px; }
.ot-prefcard-top{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ot-prefcard-name{ font-weight:600; font-size:13px; }
.ot-stars{ display:flex; gap:2px; color:var(--amber); }
.ot-stars button{ background:transparent; border:none; cursor:pointer; color:inherit; padding:1px; }
.ot-prefcard-stats{ display:flex; gap:10px; font-size:11px; color:var(--muted); margin:8px 0; }
.ot-prefcard textarea{
  width:100%; background:var(--line-soft); border:1px solid var(--line); border-radius:7px; padding:7px 8px;
  font-size:12px; font-family:inherit; color:var(--text); resize:vertical;
}
.ot-resumes{ padding:18px 20px 40px; }
.ot-resumes-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:16px; }
.ot-resumes-head .ot-empty-sub{ margin:0; max-width:60ch; }
.ot-resume-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
.ot-resumecard{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; box-shadow:0 1px 3px rgba(124,110,180,0.06); }
.ot-resumecard-top{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ot-resumecard-name{ font-weight:600; font-size:13.5px; }
.ot-resumecard-link{
  display:flex; align-items:center; gap:5px; font-size:12px; color:var(--blue); text-decoration:none; margin-top:6px;
}
.ot-resumecard-link:hover{ text-decoration:underline; }
.ot-resumecard-tags{ display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.ot-resumecard-notes{ font-size:12px; color:var(--muted); margin:8px 0 0; line-height:1.5; }
.ot-resumecard-date{ font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--muted); margin-top:10px; }
.ot-tagpicker{ display:flex; flex-wrap:wrap; gap:6px; }
.ot-tagchip{
  background:var(--line-soft); border:1px solid var(--line); color:var(--muted); border-radius:999px;
  padding:5px 10px; font-size:11.5px; cursor:pointer;
}
.ot-tagchip.on{ background:var(--purple-light); border-color:var(--blue); color:var(--purple-dark); font-weight:600; }
.ot-manual{ padding:18px 20px 50px; max-width:760px; }
.ot-manual section{ margin-bottom:22px; }
.ot-manual h3{ font-size:15px; color:var(--purple-dark); margin:0 0 8px; }
.ot-manual p{ font-size:13px; line-height:1.6; margin:0 0 8px; color:var(--text); }
.ot-manual ul{ margin:0; padding-left:20px; }
.ot-manual li{ font-size:13px; line-height:1.7; color:var(--text); }
.ot-manual code{ background:var(--line-soft); border-radius:4px; padding:1px 5px; font-family:'JetBrains Mono',monospace; font-size:12px; }
.ot-stats{ padding:22px 20px 40px; overflow-y:auto; }
.ot-meter{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px; margin-bottom:18px; }
.ot-meter-head{ display:flex; align-items:center; gap:10px; color:var(--amber); }
.ot-meter-num{ font-family:'JetBrains Mono',monospace; font-weight:700; font-size:16px; color:var(--text); }
.ot-meter-label{ font-size:12px; color:var(--muted); }
.ot-meter-track{ display:flex; gap:5px; margin-top:12px; }
.ot-meter-track span{ height:8px; flex:1; border-radius:3px; background:var(--line-soft); }
.ot-meter-track span.on{ background:var(--amber); }
.ot-statgrid{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:26px; }
.ot-stattile{ background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px; text-align:center; }
.ot-stattile .n{ font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:700; color:var(--text); }
.ot-stattile .l{ font-size:11px; color:var(--muted); margin-top:4px; }
.ot-section-label{ font-size:12px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin:20px 0 10px; }
.ot-badges{ display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; }
.ot-badge-tile{ background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:12px; opacity:0.45; }
.ot-badge-tile.done{ opacity:1; border-color:var(--amber); }
.ot-badge-icon{ color:var(--amber); margin-bottom:6px; }
.ot-badge-name{ font-weight:600; font-size:12.5px; }
.ot-badge-desc{ font-size:11px; color:var(--muted); margin-top:2px; }
.ot-bars{ display:flex; flex-direction:column; gap:8px; }
.ot-bar-row{ display:flex; align-items:center; gap:10px; }
.ot-bar-label{ width:150px; font-size:12px; color:var(--muted); flex-shrink:0; }
.ot-bar-track{ flex:1; background:var(--line-soft); border-radius:4px; height:8px; overflow:hidden; }
.ot-bar-fill{ background:var(--blue); height:100%; }
.ot-bar-n{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted); width:20px; text-align:right; }
.ot-modal-backdrop{
  position:fixed; inset:0; background:rgba(35,31,59,0.35); display:flex; align-items:center; justify-content:center;
  z-index:50; padding:20px;
}
.ot-modal{
  background:var(--panel); border:1px solid var(--line); border-radius:14px; width:100%; max-width:480px;
  max-height:88vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(60,52,137,0.2);
}
.ot-modal-head{
  display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--line);
  font-weight:600; font-size:14px;
}
.ot-modal-head button{ background:transparent; border:none; color:var(--muted); cursor:pointer; }
.ot-modal-body{ padding:16px 18px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; }
.ot-modal-body label{ display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--muted); }
.ot-modal-body input, .ot-modal-body select, .ot-modal-body textarea{
  background:var(--line-soft); border:1px solid var(--line); border-radius:8px; padding:8px 10px; color:var(--text);
  font-size:13px; font-family:inherit;
}
.ot-modal-body textarea{ resize:vertical; }
.ot-row2{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.ot-modal-foot{ display:flex; align-items:center; gap:8px; padding:14px 18px; border-top:1px solid var(--line); }
.ot-dropzone{
  border:1px dashed var(--line); border-radius:10px; padding:14px; text-align:center; color:var(--muted);
  font-size:12.5px; display:flex; align-items:center; justify-content:center; gap:8px;
}
.ot-attach-empty{
  display:flex; align-items:center; gap:8px; background:var(--line-soft); border:1px dashed var(--line);
  border-radius:8px; padding:9px 10px; cursor:pointer; color:var(--muted); font-size:13px; width:100%;
}
.ot-attach-preview img{ max-width:100%; max-height:160px; border-radius:8px; border:1px solid var(--line); display:block; }
.ot-attach-actions{ display:flex; gap:10px; margin-top:6px; }
.ot-attach-actions button{
  background:transparent; border:none; color:var(--purple-dark); font-size:12px; cursor:pointer; padding:0; text-decoration:underline;
}
.ot-import-note{ font-size:12px; color:var(--purple-dark); background:var(--purple-light); padding:8px 10px; border-radius:8px; }
.ot-customfields{ border-top:1px solid var(--line); padding-top:12px; margin-top:2px; }
.ot-customfields-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.ot-customfields-head span{ font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; }
.ot-addfield-btn{
  display:flex; align-items:center; gap:4px; background:transparent; border:1px solid var(--line);
  color:var(--text); border-radius:6px; padding:5px 9px; font-size:12px; cursor:pointer;
}
.ot-addfield-btn:hover{ border-color:var(--blue); color:var(--purple-dark); }
.ot-customfield-row{ display:grid; grid-template-columns:120px 1fr 22px; gap:8px; align-items:start; margin-bottom:8px; }
.ot-customfield-row input, .ot-customfield-row textarea{
  background:var(--line-soft); border:1px solid var(--line); border-radius:7px; padding:7px 9px; color:var(--text);
  font-size:12.5px; font-family:inherit; resize:vertical;
}
.ot-removefield-btn{ background:transparent; border:none; color:var(--muted); cursor:pointer; padding:6px 0 0; }
.ot-removefield-btn:hover{ color:var(--red); }
.ot-toast{
  position:fixed; bottom:22px; left:50%; transform:translateX(-50%); background:var(--panel);
  border:1px solid var(--amber); color:var(--text); padding:12px 18px; border-radius:10px; font-size:13px;
  max-width:420px; text-align:center; box-shadow:0 10px 30px rgba(60,52,137,0.18); z-index:60;
}
`;
