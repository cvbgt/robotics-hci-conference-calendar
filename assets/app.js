// confcal — 학회 일정 대시보드 (data-driven, no build, file://-friendly)
// 데이터는 data/items.js 가 window.DATA 로 주입. 상태/D-day는 '오늘' 기준으로 매번 자동 계산.
// 단일 보기: 날짜별 아젠다(월 그룹 세로 목록). 행에 카드 수준 정보를 풍부하게 담는다.
const search = document.getElementById('search');
const catBox = document.getElementById('category-filter');
const tagBox = document.getElementById('tag-filters');
const countEl = document.getElementById('count');
const todayEl = document.getElementById('today');
const hidePastEl = document.getElementById('hidePast');
const hideTbdEl = document.getElementById('hideTbd');
const tierOnlyEl = document.getElementById('tierOnly');
const agendaEl = document.getElementById('agenda');
const deadlinesEl = document.getElementById('deadlines');
const searchModeEl = document.getElementById('search-mode');
const figureEl = document.getElementById('figure');

const DATA = (window.DATA || []).slice();

// 오늘(자정) — 브라우저에서 열 때마다 갱신되므로 D-day가 항상 최신
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const CATEGORY_SLUGS = {
  "국제-로봇": "introbot", "국제-햅틱HCI": "inthaptic", "국내": "kr",
  "국제-센서·소자": "sensor", "국제-AI·비전": "ai", "국제-그래픽스": "graphics",
  "국제-의료·재활": "medical"
};
const CATS = Object.keys(CATEGORY_SLUGS);

// ── 향후 개최판을 별도 행으로 편다 ──────────────────────────
// 한 학회의 다음 판(예: ICRA 2029 밀라노)은 별도 열에 요약되는 게 아니라 **그 시기에
// 놓인 행**이어야 한다. 아젠다는 시간 축이고, 2029년 5월에 무엇이 있는지는 2029년 5월
// 자리를 봐야 안다. future[] 를 펴서 날짜가 파싱되는 것은 제 위치에, 연도만 아는 것은
// 미정 그룹으로 보낸다(없는 날짜를 지어내지 않는다).
function futureStart(f) {
  const m = String(f.dates || '').match(/(\d{4})\.(\d{2})\.(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function futureEnd(f, startISO) {
  // 축약 종료일은 우선 시작 연도를 물려받는다. 그 결과가 시작보다 앞서면 statusOf가
  // 연도를 추측하지 않고 미정으로 보낸다(예: "2027.12.30 – 01.02").
  const m = String(f.dates || '').match(/[–-]\s*(\d{2})\.(\d{2})/);
  return m && startISO ? `${startISO.slice(0, 4)}-${m[1]}-${m[2]}` : startISO;
}

const ROWS = [];
DATA.forEach((d, i) => {
  ROWS.push(Object.assign({}, d, { _idx: i }));
  (d.future || []).forEach(f => {
    if (!f || !f.year) return;
    const s = futureStart(f);
    ROWS.push(Object.assign({}, d, {
      _idx: i,                       // 검색·마감은 모학회 단위를 유지
      _edition: f.year,              // 이 행이 어느 판인지
      _tentative: f.confidence === 'tentative',
      start: s, end: futureEnd(f, s),
      dates: f.dates || `${f.year} (일정 미정)`,
      location: f.location || '미정',
      registration: '', regDeadline: null, abstractDeadline: null, paperDeadline: null, timezone: '',   // 아직 등록이 열리지 않은 판이다
      fullname: (d.fullname || '').replace(/\s*\([^)]*\b\d{4}\b[^)]*\)/g, '').replace(/\b\d{4}\b\s*(?:춘계|추계)?/g, '').replace(/\s+/g, ' ').trim(),
      paperProcess: [], keynotes: [], program: [], notes: '',
      keynotesNote: '해당 개최판 연사 미발표',
      website: f.source || '', sources: f.source ? [f.source] : [],
      future: []                     // 해당 판에 없는 이전 판의 정보는 상속하지 않음
    }));
  });
});
let activeCat = null;
let activeTiers = [];
let activeKeywords = [];
const FILTER_STORAGE_KEY = 'confcal.filters.v1';

// ── 상태 계산 ────────────────────────────────────────────
function parse(d) {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [year, month, day] = d.split('-').map(Number);
  const parsed = new Date(d + "T00:00:00");
  if (!Number.isFinite(+parsed)
      || parsed.getFullYear() !== year
      || parsed.getMonth() + 1 !== month
      || parsed.getDate() !== day) return null;
  return parsed;
}
function scheduleRange(item) {
  const start = parse(item.start);
  if (!start) return null;
  const hasEnd = item.end !== null && item.end !== undefined && item.end !== '';
  const end = hasEnd ? parse(item.end) : start;
  return end && end >= start ? { start, end } : null;
}
function hasDatedSchedule(item) { return scheduleRange(item) !== null; }
function statusOf(item) {
  const range = scheduleRange(item);
  if (!range) return "tbd";
  if (range.end < TODAY) return "past";
  if (range.start <= TODAY && TODAY <= range.end) return "ongoing";
  return "upcoming";
}
function ddays(item) {
  const range = scheduleRange(item);
  if (!range) return null;
  return Math.round((range.start - TODAY) / 86400000);
}
const STATUS_LABEL = { upcoming: "예정", ongoing: "진행중", past: "종료", tbd: "미정" };
// 로컬 달력 날짜. toISOString 은 UTC 라서 KST 자정을 전날 15시로 바꿔 TODAY 를 하루 전날로 표시했다.
function ymd(dt) {
  const p = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// 화면의 날짜 표기는 점(2026.10.16)으로 통일한다. regDeadline 은 ISO 로 저장되므로
// 표시 직전에만 바꾼다 — 저장 형식은 정렬·계산에 쓰이는 정본이라 건드리지 않는다.
function dotDate(iso) { return String(iso || '').replace(/-/g, '.'); }
function dateDisplay(iso) { return parse(iso) ? dotDate(iso) : null; }

// 초록·논문 마감은 하나의 timezone(예: 'UTC-12', 'AoE', 'Asia/Seoul')으로 함께 표기한다.
// 값이 있는 마감만 줄로 선다 — 데이터가 없는 칸을 '미정' 으로 세우면 모든 학회에 빈 줄이 붙는다.
// 등록 마감은 위 '사전등록' 줄이 이미 말한다.
function deadlineRows(d) {
  const tz = d.timezone ? ` <span class="tz">(${esc(d.timezone)})</span>` : '';
  return [['초록 마감', d.abstractDeadline], ['논문 마감', d.paperDeadline]]
    .map(([k, v]) => [k, dateDisplay(v)])
    .filter(([, v]) => v)
    .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}${tz}</dd>`).join('');
}
function registrationCell(d, escape) {
  const hasDeadline = d.regDeadline !== null && d.regDeadline !== undefined && d.regDeadline !== '';
  if (hasDeadline) return escape(dateDisplay(d.regDeadline) || '확인 필요');
  return d.registration ? escape(d.registration) : '<span class="ag-dim">미정</span>';
}
function registrationSummary(d, escape) {
  const hasDeadline = d.regDeadline !== null && d.regDeadline !== undefined && d.regDeadline !== '';
  if (hasDeadline && !parse(d.regDeadline)) return escape('확인 필요');
  return escape(d.registration || '미정');
}

// ── 사전등록 마감 상태 ───────────────────────────────────
// regDeadline(ISO)가 있으면 오늘 기준 마감/D-n 자동 계산. 없으면 null(미정·미공개).
function regStatus(item) {
  const d = parse(item.regDeadline);
  if (!d) return null;
  const days = Math.round((d - TODAY) / 86400000);
  if (days < 0) return { state: "closed", label: "마감", days };
  if (days === 0) return { state: "today", label: "오늘 마감", days };
  if (days <= 7) return { state: "soon", label: `D-${days}`, days };   // 일주일 안 — 임박
  return { state: "open", label: `D-${days}`, days };
}

// ── 장소 → Google Maps 링크 ──────────────────────────────
const NO_LOC = /^미정/; // "미정", "미정 (…)" 등은 지도 링크 생략
function mapLink(loc) {
  if (!loc || NO_LOC.test(loc.trim())) return null;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(loc);
}

// ── 국제학회 + 한국 개최 강조 ────────────────────────────
const KOREA_RE = /한국|대한민국|korea|seoul|서울|부산|busan|대전|daejeon|인천|incheon|대구|광주|gwangju|고양|kintex|평창|경주|gyeongju|수원|제주|jeju|코엑스|coex/i;
function isIntlInKorea(item) {
  return /^국제/.test(item.category || "") && KOREA_RE.test(item.location || "");
}

// ── 태그 → 포괄 키워드(umbrella) ─────────────────────────
// 항목별 세부 태그는 검색용으로 유지하고, 필터·표시에는 소수의 포괄 키워드만 노출.
const {UMBRELLAS, TIERS, umbrellasFor, tierFor, matchesTags, countTags} = ConferenceTags;

// ── 필터 버튼 ────────────────────────────────────────────
function btn(label, val, active, attr) {
  return `<button type="button" class="tag-btn ${active ? 'on' : ''}" aria-pressed="${active}" ${attr}="${val ?? ''}">${label}</button>`;
}
function renderCategoryOptions() {
  catBox.innerHTML = '<option value="">전체 분류</option>'
    + CATS.map(c => `<option value="${esc(c)}">${esc(c)} (${DATA.filter(d => d.category === c).length})</option>`).join('');
  catBox.value = activeCat || '';
}
function matchesSelectedTags(d) { return matchesTags(d, activeTiers, activeKeywords); }
function renderTagButtons(hits) {
  const scope = DATA.filter((d, idx) => (!hits || hits.has(idx))
    && (!activeCat || d.category === activeCat) && matchesReputationFilters(d));
  const counts = countTags(scope, activeTiers, activeKeywords);
  tagBox.innerHTML = btn('전체 태그', '', !activeTiers.length && !activeKeywords.length, 'data-tag')
    + [...TIERS, ...UMBRELLAS].map(t => btn(`${esc(t)} <span class="n">${counts[t]}</span>`, t,
      (TIERS.includes(t) ? activeTiers : activeKeywords).includes(t), 'data-tag')).join('');
}
function saveFilters() {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({category: activeCat, tiers: activeTiers,
      keywords: activeKeywords, hidePast: hidePastEl.checked, hideTbd: hideTbdEl.checked, tierOnly: tierOnlyEl.checked}));
  } catch (_) { /* 저장이 차단되어도 현재 화면은 계속 동작한다. */ }
}
function restoreFilters() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY)); } catch (_) { raw = null; }
  const state = ConferenceTags.cleanState(raw, CATS);
  activeCat = state.category; activeTiers = state.tiers; activeKeywords = state.keywords;
  hidePastEl.checked = state.hidePast; hideTbdEl.checked = state.hideTbd; tierOnlyEl.checked = state.tierOnly;
}
function selectTag(tag, toggle = true) {
  if (!tag) { activeTiers = []; activeKeywords = []; }
  else {
    const group = TIERS.includes(tag) ? activeTiers : activeKeywords;
    if (!TIERS.includes(tag) && !UMBRELLAS.includes(tag)) return;
    const index = group.indexOf(tag);
    if (index < 0) group.push(tag);
    else if (toggle) group.splice(index, 1);
  }
  saveFilters(); render();
  [...tagBox.querySelectorAll('button')].find(b => b.dataset.tag === tag)?.focus({preventScroll: true});
}
function keywordChips(d) {
  return umbrellasFor(d).map(t => `<button type="button" class="ag-tag" data-filter-tag="${esc(t)}" aria-pressed="${activeKeywords.includes(t)}" aria-label="${esc(t)} 태그 적용">#${esc(t)}</button>`).join('');
}

// ── 필터 + 렌더 ──────────────────────────────────────────
// ── 검색 레이어 (static-derived-doc 블루프린트의 search = minisearch 7.2.0) ──
// 색인은 페이지가 이미 들고 있는 window.DATA 에서만 만든다(빌드된 색인 아티팩트 없음).
// http(표면 탭)에서는 접두어·오타 허용·관련도 순, file:// 에서는 기존 부분문자열로 자동 강등.
const SEARCH = ConfcalSearch.create({
  documents: DATA,
  fields: ['acronym', 'fullname', 'location', 'dates', 'notes', 'tags', 'category', 'future', 'placeAliases'],
  boost: { acronym: 4, fullname: 2, location: 1.5 },
  extract: d => ({
    acronym: d.acronym, fullname: d.fullname, location: d.location,
    dates: d.dates, notes: d.notes, tags: d.tags, category: d.category,
    future: (d.future || []).map(f => [f.year, f.location, f.dates]),
    placeAliases: [d.location, ...(d.future || []).map(f => f.location)].map(PLACES.korean)
  }),
  onModeChange: (mode, note) => { showSearchMode(mode, note); render(); }
});

function showSearchMode(mode, note) {
  searchModeEl.textContent = mode === 'minisearch' ? '접두어·오타 허용' : '부분문자열';
  searchModeEl.className = 'search-mode ' + mode;
  searchModeEl.title = note;
}

// 숨김 토글에 걸린 행은 버리지 않고 센다 — 결과가 비었을 때 "왜 비었나"를 말하고
// 한 번에 되돌릴 수 있게 하려는 것이다(분류 '국내 10' 을 눌렀는데 10건이 전부 종료·미정이라
// 빈 표만 남던 막다른 길).
function getFiltered() {
  const hits = SEARCH.match(search.value);   // null = 질의 없음
  const hidePast = hidePastEl.checked;
  // 일정이 안 잡힌 학회는 시간 축 위에 놓을 자리가 없다 — 아젠다 맨 아래 별도 그룹으로
  // 쌓이므로, 훑는 데 방해되면 접는다. 종료와 같은 성질의 토글이라 나란히 둔다.
  const hideTbd = hideTbdEl.checked;
  const rows = [], hidden = { past: new Set(), tbd: new Set() };  // 학회 단위로 센다
  ROWS.forEach(d => {
    const matchesText = !hits || hits.has(d._idx);
    const matchesCat = !activeCat || d.category === activeCat;
    const matchesTag = matchesSelectedTags(d);
    if (!(matchesText && matchesCat && matchesTag) || !matchesReputationFilters(d)) return;
    const st = statusOf(d);
    if (hidePast && st === "past") { hidden.past.add(d._idx); return; }
    if (hideTbd && st === "tbd") { hidden.tbd.add(d._idx); return; }
    rows.push(d);
  });
  return { rows, hidden };
}

function render() {
  const { rows, hidden } = getFiltered();
  renderTagButtons(SEARCH.match(search.value));
  renderAgenda(rows, hidden);
  renderDeadlines();
  renderNextEvent(rows);
  const filterLabel = [activeCat, ...TIERS.filter(t => activeTiers.includes(t)), ...UMBRELLAS.filter(t => activeKeywords.includes(t)), tierOnlyEl.checked && '평판 A 이상'].filter(Boolean).join(' · ') || '전체 분야';
  document.getElementById('filter-summary').textContent = '필터 · ' + filterLabel;
  document.getElementById('hide-summary').textContent = [hidePastEl.checked && '종료', hideTbdEl.checked && '미정'].filter(Boolean).join('·') + (hidePastEl.checked || hideTbdEl.checked ? ' 숨김' : '전체 일정');
  renderMonthChart(rows);
  // 행 수가 아니라 학회 수를 센다 — 향후 개최판 행(ICRA 2027 …)은 같은 학회의 다른 판이다.
  const confs = new Set(rows.map(d => d._idx)).size;
  const editions = rows.filter(d => d._edition).length;
  countEl.textContent = `${confs} / ${DATA.length} 개 학회` + (editions ? ` · 향후 개최판 ${editions}행` : '');
  if (!performance.getEntriesByName('confcal-first-render').length) performance.mark('confcal-first-render');
}

// 다음 개최 카드의 사전등록 줄 — 개최 D-day 와 나란히 등록 D-day 를 보여 준다.
// 마감일이 없으면 '미공개', 지났으면 '마감'으로 말해 빈칸으로 남기지 않는다.
function nextRegLine(d) {
  const rs = regStatus(d);
  const chip = rs ? rs.label : '미공개';
  const when = rs ? `<span class="next-reg-date">${esc(dotDate(d.regDeadline))}</span>` : '';
  return `<span class="next-reg"><span class="next-reg-k">사전등록</span><span class="reg-chip ${rs ? rs.state : 'unknown'}">${esc(chip)}</span>${when}</span>`;
}

// 가장 가까운 개최는 과거 표시 여부와 관계없이 현재/예정 중에서 찾는다.
function renderNextEvent(rows) {
  const d = rows.filter(item => ['ongoing','upcoming'].includes(statusOf(item)))
    .sort((a,b) => parse(a.start) - parse(b.start))[0];
  const el = document.getElementById('next-event');
  el.innerHTML = d ? `<h2>${statusOf(d) === 'ongoing' ? '진행중' : '다음 개최'}</h2>
    <button type="button" class="next-open" data-idx="${d._idx}" data-row="${ROWS.indexOf(d)}" aria-label="${esc(d.acronym)} ${esc(d.dates)} ${esc(d.location || '장소 미정')} ${statusOf(d) === 'ongoing' ? '진행중' : 'D-' + ddays(d)} 개최 상세 보기">
      <span class="next-name">${esc(d.acronym)}${d._edition ? ' ' + d._edition : ''}${excellentBadge(d)}</span><span class="next-day">${statusOf(d) === 'ongoing' ? '진행중' : 'D-' + ddays(d)}</span>
      <span class="next-dates">${esc(d.dates)}</span><span class="next-loc">${esc(d.location || '장소 미정')}</span>
      ${nextRegLine(d)}
    </button>` : '<h2>다음 개최</h2><p class="rail-empty">현재 조건에서 예정된 개최가 없습니다.</p>';
}

// ── 명시된 제출 절차를 행동별 마감으로 편다 ───────────────────
// 정본 문자열을 바꾸지 않는다. 통보/개시를 제외하며 시각·트랙은 상세 원문에 남긴다.
function actionDeadlines(d) {
  const result = [];
  const process = d.paperProcess || [];
  const timeIn = text => (text.match(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AoE|UTC(?:[+-]\d{1,2})?|PST|PDT|PT|HST|KST))?|\b\d{1,2}시|\b(?:AoE|UTC(?:[+-]\d{1,2})?|PST|PDT|PT|HST|KST)\b/gi) || []).join(' ');
  const globalTime = timeIn(process.find(text => /모든 마감/.test(text)) || '') || d.timezone || '';
  const add = (date, label, kind, detail, time = '') => {
    const parsed = parse(date);
    if (!parsed || ymd(parsed) !== date) return;
    if (result.some(item => item.date === date && item.kind === kind && (kind === '등록' || item.label === label))) return;
    result.push({date, label, kind, detail, time});
  };
  // Full dates accept ISO, dot and slash notation. Short range ends inherit only
  // the explicit year/month in the same clause; invalid/reversed dates stay raw.
  const datePattern = /(?:(\d{4})[-./])?(\d{1,2})[-./](\d{1,2})/g;
  const isoDate = (year, month, day) => {
    const iso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const parsed = parse(iso);
    return parsed && ymd(parsed) === iso ? iso : null;
  };
  const action = /마감|기한|제출|초록|최종본|최종논문|수정본|회신|등록|얼리버드|제안|의향서|발표 신청|영상 미리보기|Papers?|Posters?|TMECH|보충자료|E-Rights|본문|rebuttal|리뷰털|Late[- ]Breaking|camera-ready/i;
  const excluded = /통보|통지|공지|리뷰 공개|최종 리뷰|접수 개시|오픈|결정|조건부 채택|최종 채택|초청 및/;
  const kindOf = label => /등록|얼리버드/.test(label) ? '등록' : /회신/.test(label) ? '회신' : /최종|수정본|camera-ready/i.test(label) ? '최종·수정' : /제안|의향서/.test(label) ? '제안' : '제출';
  for (const text of process) {
    // Unspaced dots separate clauses only AFTER a dated action. Compound track
    // names such as Workshops·Tutorials must remain a single label.
    const parts = text.replace(/([0-9][^·;；\n]*?)·(?=[^·]*\d{4}[-./])/g, '$1;').split(/\s+·\s+|[;；\n]/);
    for (const part of parts) {
      const dates = [...part.matchAll(datePattern)];
      if (!dates.length || !dates[0][1]) continue;
      let baseLabel = part.slice(0, dates[0].index).replace(/[:：]\s*$/, '').trim();
      if (!baseLabel) baseLabel = part.slice(dates[0].index + dates[0][0].length).trim();
      if (excluded.test(baseLabel)) continue;
      let year = dates[0][1];
      for (let i = 0; i < dates.length; i++) {
        const token = dates[i];
        year = token[1] || year;
        let date = isoDate(year, token[2], token[3]);
        let label = i === 0 ? baseLabel : part.slice(dates[i-1].index + dates[i-1][0].length, token.index).replace(/^[\s(),및]+|[:：]\s*$/g, '').trim();
        if (i > 0 && !token[1]) {
          if (!/및/.test(part.slice(dates[i-1].index, token.index))) continue;
          label = baseLabel;
        }
        // Parenthetical exceptions inherit the action, retaining their track.
        if (i > 0 && !action.test(label) && /^\s*\(/.test(part.slice(dates[i-1].index + dates[i-1][0].length, token.index))) label = `${baseLabel} · ${label.replace(/는\s*$/, '')}`;
        const next = dates[i+1];
        if (next && /^\s*[~–—-]\s*$/.test(part.slice(token.index + token[0].length, next.index))) {
          const end = isoDate(next[1] || year, next[2], next[3]);
          if (!date || !end || end < date) continue;
          date = end;
          i++;
        }
        if (!date || excluded.test(label) || !action.test(label)) continue;
        const last = dates[i];
        const time = timeIn(part.slice(last.index + last[0].length, dates[i+1]?.index)) || globalTime;
        add(date, label, kindOf(label), text, time);
      }
    }
  }
  // An explicit same-record reference is safe only when its target is unique.
  const finals = [...new Set(result.filter(x => x.kind === '최종·수정').map(x => x.date))];
  if (finals.length === 1) {
    for (const text of process.filter(text => /최종본 마감까지\s*사전등록/.test(text))) {
      add(finals[0], '저자 사전등록 (최종본 마감)', '등록', text);
    }
  }
  for (const [date,label,kind] of [[d.abstractDeadline,'초록 마감','제출'], [d.paperDeadline,'논문 마감','제출']]) {
    if (date && !result.some(item => item.date === date && item.kind === kind)) add(date,label,kind,label,d.timezone);
  }
  add(d.regDeadline, '사전등록', '등록', d.registration || '사전등록');
  return result;
}

function renderDeadlines() {
  const hits = SEARCH.match(search.value);
  const items = DATA.flatMap((d, idx) => {
    if ((hits && !hits.has(idx)) || (activeCat && d.category !== activeCat) || !matchesSelectedTags(d) || !matchesReputationFilters(d)) return [];
    return actionDeadlines(d).map(item => ({...item, d, idx, days: Math.round((parse(item.date) - TODAY) / 86400000)}));
  }).filter(item => item.days >= 0 && item.days <= 30)
    .sort((a,b) => a.days - b.days || a.d.acronym.localeCompare(b.d.acronym));
  const head = `<div class="deadline-head"><h2 id="deadline-title">30일 안 마감 <span class="rail-n">${items.length}건</span></h2><span class="deadline-window">${dotDate(ymd(TODAY))}부터 · 제출·등록</span></div>`;
  const button = ({d,idx,date,label,kind,days,detail,time}) => `<button type="button" class="dl-item cat-${catSlug(d.category)}" data-idx="${idx}" data-acronym="${esc(d.acronym)}" data-date="${date}" title="${esc(detail)}${time ? ' · ' + esc(time) : ''}">
    <span class="dl-dday ${days === 0 ? 'today' : ''}">${days === 0 ? '오늘' : 'D-' + days}</span>
    <span class="dl-content"><span class="dl-acr">${esc(d.acronym)}${excellentBadge(d)}</span><span class="dl-action">${esc(label)}${umbrellasFor(d).includes('확인필요') ? ' · 확인필요' : ''}</span></span>
    <span class="dl-meta"><span>${dotDate(date).slice(5)}</span><span>${kind}</span></span>
  </button>`;
  deadlinesEl.innerHTML = head + (items.length
    ? `<div class="dl-list">${items.slice(0,4).map(button).join('')}</div>${items.length > 4 ? `<details class="deadline-more"><summary>나머지 ${items.length - 4}건 보기</summary><div class="dl-list">${items.slice(4).map(button).join('')}</div></details>` : ''}`
    : `<p class="rail-empty">현재 조건에서 30일 안에 공개된 마감이 없습니다.</p>`);
}

// ── 날짜별 아젠다 표 (월 그룹 · 열 정렬) ─────────────────────
// 세로 카드 목록에서 표로 바꿨다. 학회 목록에서 눈이 하는 일은 "이 학회가 언제인가"가
// 아니라 **행끼리 비교**다 — 어느 게 먼저인지, 어느 게 아직 등록이 열려 있는지, 어느 게
// 국내인지. 카드는 항목마다 값을 다른 위치에 놓아 그 비교를 매번 다시 하게 만든다.
// 열이 고정되면 같은 값이 늘 같은 x 좌표에 서므로 훑는 비용이 사라진다.
//
// 월 그룹과 TODAY 경계는 유지한다(이 화면의 정체성은 아젠다다). 표 머리는 스크롤 중
// 고정되고, 월 머리는 그 바로 아래에 고정된다 — 두 층이 겹치지 않도록 오프셋을 CSS
// 변수 하나(--thead-h)로 묶어 둔다.
const COLUMNS = [
  { key: "when",  label: "기간" },
  { key: "state", label: "상태" },
  { key: "reg",   label: "사전등록" },   // 상태 옆 — 개최 D-day 와 등록 D-day 를 나란히 읽는다
  { key: "conf",  label: "학회" },
  { key: "loc",   label: "장소" },
  { key: "tags",  label: "키워드" },
];

function renderAgenda(rows, hidden) {
  const dated = rows.filter(hasDatedSchedule)
    .sort((a, b) => parse(a.start) - parse(b.start));
  const undated = rows.filter(d => !hasDatedSchedule(d));

  if (!dated.length && !undated.length) {
    const why = [hidden.past.size && `종료 ${hidden.past.size}`, hidden.tbd.size && `미정 ${hidden.tbd.size}`].filter(Boolean).join(' · ');
    agendaEl.innerHTML = why
      ? `<p class="empty">조건에 맞는 학회가 없습니다 — ${why}건이 숨겨져 있습니다.
           <button type="button" class="tag-btn" data-reveal>숨긴 항목 보기</button></p>`
      : '<p class="empty">조건에 맞는 학회가 없습니다.</p>';
    return;
  }

  const span = COLUMNS.length;
  const groupRow = (cls, id, inner) =>
    `<tr role="row" class="ag-group ${cls}"${id ? ` id="${id}"` : ""}><th colspan="${span}" scope="colgroup">${inner}</th></tr>`;

  let todayInserted = false;
  const firstFutureIdx = dated.findIndex(d => statusOf(d) !== 'past');

  let body = '', curKey = '';
  dated.forEach((d, i) => {
    if (!todayInserted && i === firstFutureIdx && firstFutureIdx !== -1) {
      body += groupRow("ag-today", "ag-today", `<span>TODAY · ${ymd(TODAY)}</span>`);
      todayInserted = true;
    }
    const s = parse(d.start);
    const key = `${s.getFullYear()}.${s.getMonth() + 1}`;
    if (key !== curKey) {
      curKey = key;
      body += groupRow("ag-month", `m-${key}`, `${s.getFullYear()}.${MONTH_KR[s.getMonth()]}`);
    }
    body += agendaRow(d);
  });
  if (!todayInserted && firstFutureIdx === -1 && dated.length) {
    body += groupRow("ag-today", "ag-today", `<span>TODAY · ${ymd(TODAY)} (이후 일정 없음)</span>`);
  }
  if (undated.length) {
    body += groupRow("ag-month ag-tbd", "", `${ConfcalIcon("pin")} 일정 미정 (${undated.length})`);
    body += undated.map(agendaRow).join('');
  }

  agendaEl.innerHTML =
    `<div class="agenda-head"><h2>개최 일정</h2><span>${new Set(rows.map(d => d._idx)).size}개 학회 · 개최일순</span></div><div class="ag-scroll"><table class="ag-table" role="table">
       <thead role="rowgroup"><tr role="row">${COLUMNS.map(c => `<th scope="col" class="col-${c.key}">${c.label}</th>`).join('')}</tr></thead>
       <tbody role="rowgroup">${body}</tbody>
     </table></div>`;
}

function safeUrl(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return null;
  if (!/^https?:\/\//i.test(value)) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && url.hostname ? esc(value) : null; }
  catch { return null; }
}
function dataLink(url, label, attrs = '') {
  const safe = safeUrl(url);
  return safe ? `<a href="${safe}" target="_blank" rel="noopener" ${attrs}>${label}</a>` : label;
}

function agendaRow(d) {
  const st = statusOf(d), dd = ddays(d);
  const dlabel = st === 'upcoming' && dd !== null ? `D-${dd}`
    : st === 'ongoing' ? 'NOW' : STATUS_LABEL[st];
  const rs = regStatus(d);
  const kr = isIntlInKorea(d) ? `<span class="krflag" title="한국 개최">🇰🇷</span>` : '';

  // 장소 — 지도 링크가 되는 곳만 링크로
  const ml = mapLink(d.location);
  const loc = d.location
    ? (ml ? dataLink(ml, `${ConfcalIcon("map-pin")} ${esc(d.location)}`, 'class="ag-loc maplink" title="Google Maps"')
          : `<span class="ag-loc">${esc(d.location)}</span>`)
    : '<span class="ag-dim">—</span>';

  // 상세를 가진 학회 표시 + 비고는 아이콘 하나로 접는다(전문은 상세 패널에 있다).
  const knN = (d.keynotes || []).filter(k => k && k.name).length;
  const knMark = knN ? `<span class="ag-mark kn" title="키노트 ${knN}명 공개">${ConfcalIcon("mic")} ${knN}</span>` : '';
  const noteMark = d.notes ? `<span class="ag-mark note" title="${esc(d.notes)}">${ConfcalIcon("info")}</span>` : '';
  const site = d.website ? dataLink(d.website, safeUrl(d.website) ? ConfcalIcon("external-link") : esc(d.website), 'class="ag-site" title="공식 웹페이지"') : '';

  // 사전등록 칸은 상태 칸처럼 언제나 칩 하나로 읽힌다 — D-n·오늘·마감·미공개.
  // 마감일이 없는 학회의 긴 등록 안내는 칸에 펼치지 않고 툴팁·상세 패널에 둔다.
  const regBad = !rs && d.regDeadline;
  const regChip = rs ? `<span class="reg-chip ${rs.state}">${esc(rs.label)}</span>`
    : `<span class="reg-chip unknown">${regBad ? '확인 필요' : '미공개'}</span>`;
  const regText = rs ? registrationCell(d, esc) : '';
  const tags = keywordChips(d);

  const edition = d._edition
    ? `<span class="ag-ed${d._tentative ? ' tent' : ''}" title="${d._edition}년 개최판${d._tentative ? ' (잠정)' : ''}">${d._edition}</span>`
    : '';
  return `<tr class="ag-row s-${st}${d._edition ? ' is-edition' : ''} cat-${catSlug(d.category)}" data-idx="${d._idx}" data-row="${ROWS.indexOf(d)}" role="row">
    <td role="cell" class="col-when"><span class="ag-dates">${esc(d.dates || '미정')}</span></td>
    <td role="cell" class="col-state"><span class="ag-status s-${st}">${esc(dlabel)}</span></td>
    <td role="cell" class="col-reg" title="${esc(d.registration || '')}">${regChip}${regText ? `<span class="reg-text">${regText}</span>` : ''}</td>
    <td role="cell" class="col-conf">
      <span class="ag-head"><button type="button" class="ag-acr ag-detail" aria-label="${esc(d.acronym)}${d._edition ? ' ' + d._edition : ''} 상세 보기">${esc(d.acronym)}</button>${edition}${kr}${knMark}${noteMark}${site}${excellentBadge(d, true)}${reputationChip(d)}</span>
      ${d.fullname ? `<span class="ag-full">${esc(d.fullname)}</span>` : ''}
    </td>
    <td role="cell" class="col-loc">${loc}</td>
    <td role="cell" class="col-tags"><span class="ag-tags">${tags}</span></td>
  </tr>`;
}

function catSlug(c) { return CATEGORY_SLUGS[c] || "x"; }

// ── 상세 모달 (향후 개최 · 키노트 · 프로그램 · 논문 등록 절차) ──
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// 학회 시리즈의 등급·h5와 연도를 명시한 공식 채택률만 표시한다.
function isExcellent(d) { return ['최우수', '우수'].includes(d.kiise) || d.bk21 === true; }
// 목록·등급·분야별 신호로 화면에서 파생한다. 데이터에는 tier를 저장하지 않는다.
function reputationTier(d) {
  return ['A*', 'A'].includes(d.core) || isExcellent(d) || d.csrankings === true || d.scholarTop20 ? 'A 이상' : null;
}
function matchesReputationFilters(d) {
  return !tierOnlyEl.checked || reputationTier(d) === 'A 이상';
}
function excellentBadge(d, interactive = false) {
  if (!isExcellent(d)) return '';
  const tag = interactive ? 'button' : 'span';
  const attr = interactive ? ` type="button" data-filter-tier="${tierFor(d)}" aria-pressed="${activeTiers.includes(tierFor(d))}" aria-label="${tierFor(d)} 태그 적용"` : '';
  return `<${tag}${attr} class="excellent-badge" title="정보과학회·BK21 공인 우수학술대회 목록${d.bk21 ? ' · BK21 등재' : ''}">${esc(tierFor(d))}${d.kiise ? '' : ' · BK21'}</${tag}>`;
}
function excellentDetail(d) {
  if (!isExcellent(d)) return '';
  return `<dt>우수학회</dt><dd class="m-excellent">${excellentBadge(d)}
    <span class="excellent-note">정보과학회·BK21 공인 우수학술대회 목록</span>
    <span class="excellent-sources">${(d.excellentSources || []).map(source => `${dataLink(source.url, `${esc(source.document)} (${esc(source.year)})`)} · ${esc(source.identity)}`).join('<br>')}</span></dd>`;
}

function reputationChip(d, showUnknown = false) {
  const parts = [];
  const tier = reputationTier(d);
  if (tier) parts.push(tier);
  if (d.core) parts.push(`CORE ${d.core}`);
  if (d.h5) parts.push(`h5 ${d.h5}`);
  if (d.acceptRate) parts.push(`채택률 ${d.acceptRate.value}% (${d.acceptRate.year})`);
  if (!parts.length && !showUnknown) return '';
  const title = d.repAsOf ? `평판 정보 확인 ${d.repAsOf}` : '평판 정보';
  return `<span class="rep-chip${parts.length ? '' : ' rep-unknown'}" title="${esc(title)}">${esc(parts.join(' · ') || '등급 정보 없음')}</span>`;
}

function detailHtml(d) {
  const st = statusOf(d), dd = ddays(d);
  let badge = `<span class="badge ${st}">${STATUS_LABEL[st]}</span>`;
  if (st === "upcoming" && dd !== null) badge += ` <span class="dday">D-${dd}</span>`;
  if (st === "ongoing") badge += ` <span class="dday now">NOW</span>`;
  if (isIntlInKorea(d)) badge += ` <span class="krflag">🇰🇷 한국 개최</span>`;

  const ml = mapLink(d.location);
  const locHtml = ml
    ? dataLink(ml, `${esc(d.location)} <span class="mappin">${ConfcalIcon("map-pin")}</span>`, 'class="maplink"')
    : esc(d.location || '미정');
  const rs = regStatus(d);
  const regChip = rs ? ` <span class="reg-chip ${rs.state}">${rs.label}</span>` : '';

  // 키노트
  const kn = (d.keynotes || []).filter(k => k && k.name);
  const knHtml = kn.length
    ? `<ul class="kn-list">${kn.map(k => `
        <li><span class="kn-name">${esc(k.name)}</span>${k.affiliation ? `<span class="kn-aff">${esc(k.affiliation)}</span>` : ''}${k.topic ? `<span class="kn-topic">“${esc(k.topic)}”</span>` : ''}</li>`).join('')}</ul>`
    : `<p class="dim-note">${esc(d.keynotesNote || '키노트 연사 미발표 (공개 예정)')}</p>`;

  // 프로그램
  const prog = d.program || [];
  const progHtml = prog.length
    ? `<ul class="prog-list">${prog.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`
    : `<p class="dim-note">프로그램 구성 정보 준비 중 — 공식 페이지 참고.</p>`;

  // 논문 등록(제출) 절차
  const pp = d.paperProcess || [];
  const ppHtml = pp.length
    ? `<ol class="pp-list">${pp.map(p => `<li>${esc(p)}</li>`).join('')}</ol>`
    : `<p class="dim-note">논문 등록 절차 상세 미정 — 등록/마감 요약: ${registrationSummary(d, esc)}</p>`;

  const site = d.website
    ? dataLink(d.website, safeUrl(d.website) ? "공식 웹페이지 ↗" : esc(d.website), 'class="site"') : '';
  const srcHtml = (d.sources || []).length
    ? `<p class="src">출처: ${d.sources.map(s => dataLink(s, esc(shortUrl(s)))).join(', ')}</p>` : '';

  // 향후 개최 (공식 확정/잠정된 차기 에디션)
  const fut = (d.future || []).filter(f => f && f.year);
  const futHtml = fut.length
    ? `<ul class="fut-list">${fut.map(f => `
        <li><span class="fut-year">${esc(String(f.year))}</span><span class="fut-loc">${esc(f.location)}</span>${f.dates ? `<span class="fut-dates">${esc(f.dates)}</span>` : ''}${f.confidence === 'tentative' ? ` <span class="fut-tent">잠정</span>` : ''}${f.source ? ` ${dataLink(f.source, safeUrl(f.source) ? "↗" : esc(f.source), 'class="fut-src" title="출처 ↗"')}` : ''}</li>`).join('')}</ul>`
    : '';
  const futSec = fut.length
    ? `<section class="m-sec"><h3>${ConfcalIcon("calendar")} 향후 개최 (예정)</h3>${futHtml}</section>` : '';

  return `
    <div class="m-top">
      <h2>${esc(d.acronym)}${d._edition ? ' ' + d._edition : ''}</h2>
      <div class="m-badges">${badge}${d._tentative ? ' <span class="fut-tent">잠정</span>' : ''}</div>
    </div>
    <p class="m-full">${esc(d.fullname || '')}</p>
    <dl class="m-fields">
      <dt>분류</dt><dd><span class="cat-chip">${esc(d.category)}</span></dd>
      ${excellentDetail(d)}
      <dt>분야 태그</dt><dd class="ag-tags m-tags">${keywordChips(d)}</dd>
      <dt>평판</dt><dd class="m-reputation">${reputationChip(d, true)}
        ${d.csrankings || d.scholarTop20 ? `<span class="rep-signals">${[d.csrankings && 'CSRankings 집계 학회', d.scholarTop20 && `Google Scholar ${d.scholarTop20} 상위 20`].filter(Boolean).map(esc).join(' · ')}</span>` : ''}
        ${d.repAsOf ? `<span class="rep-asof">확인 ${esc(d.repAsOf)}</span>` : ''}
        ${(d.repSources || []).length ? `<span class="rep-sources">${d.repSources.map((url, i) => dataLink(url, `지표 출처 ${i + 1}`)).join(' · ')}</span>` : ''}
      </dd>
      <dt>기간</dt><dd class="when">${esc(d.dates || '미정')}</dd>
      <dt>장소</dt><dd>${locHtml}</dd>
      <dt>사전등록</dt><dd class="reg">${registrationSummary(d, esc)}${regChip}</dd>
      ${deadlineRows(d)}
    </dl>
    ${d.notes ? `<p class="notes">${esc(d.notes)}</p>` : ''}

    <section class="m-sec"><h3>${ConfcalIcon("file-text")} 논문 등록 절차</h3>${ppHtml}</section>
    ${futSec}
    <section class="m-sec"><h3>${ConfcalIcon("mic")} 키노트 · 초청 연사</h3>${knHtml}</section>
    <section class="m-sec"><h3>${ConfcalIcon("calendar-days")} 프로그램 구성</h3>${progHtml}</section>

    <div class="m-foot">${site}${srcHtml}</div>`;
}
function shortUrl(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }

// 키보드 사용자는 포커스가 곧 위치다. 열 때 패널로 옮기고, 열린 동안 Tab 을 패널 안에 가두고,
// 닫으면 연 자리(행·마감 항목)로 돌려준다 — 안 그러면 Tab 이 가려진 배경 링크를 돌아다닌다.
let modalOpener = null;
let modalBackground = [];
function openModal(d) {
  modalOpener = document.activeElement;
  modalBody.innerHTML = detailHtml(d);
  modalBody.className = 'cat-' + catSlug(d.category);  // 분류 색상 테마 적용
  modal.setAttribute('aria-label', `${d.acronym}${d._edition ? ' ' + d._edition : ''} 상세`);
  modal.hidden = false;
  modalBackground = [...document.body.children].filter(el => el !== modal && !el.inert);
  modalBackground.forEach(el => { el.inert = true; });
  document.body.style.overflow = 'hidden';
  // 다음 프레임에 옮긴다 — Space 로 연 경우 keyup 이 닫기 버튼을 눌러 곧바로 닫는 브라우저가 있다
  requestAnimationFrame(() => modal.querySelector('.modal-x').focus());
}
function closeModal() {
  modal.hidden = true;
  modalBackground.forEach(el => { el.inert = false; });
  modalBackground = [];
  document.body.style.overflow = '';
  if (modalOpener && modalOpener.isConnected) modalOpener.focus();
  modalOpener = null;
}
function trapTab(e) {
  const f = [...modal.querySelectorAll('a[href], button')].filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}
// closest — 닫기 버튼 한가운데를 누르면 target 은 버튼이 아니라 안쪽 SVG 라서 닫히지 않았다.
modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => {
  if (modal.hidden) return;
  if (e.key === 'Escape') closeModal();
  else if (e.key === 'Tab') trapTab(e);
});

// ── 이벤트 ──────────────────────────────────────────────
catBox.addEventListener('change', () => { activeCat = catBox.value || null; saveFilters(); render(); });
tagBox.addEventListener('click', e => {
  const b = e.target.closest('[data-tag]'); if (!b) return;
  selectTag(b.dataset.tag);
});
function applyItemTag(e) {
  const chip = e.target.closest('[data-filter-tag], [data-filter-tier]');
  if (!chip) return false;
  if (!modal.hidden) closeModal();
  document.getElementById('filters').open = true;
  selectTag(chip.dataset.filterTag || chip.dataset.filterTier, false);
  return true;
}
modalBody.addEventListener('click', applyItemTag);

// 아젠다 행 → 상세 모달 (행 내부 링크 클릭은 그대로 둠)
function rowToModal(e) {
  if (e.target.closest('a') || e.target.closest('[data-filter-tag], [data-filter-tier]')) return;
  const el = e.target.closest('[data-idx]'); if (!el) return;
  const d = el.dataset.row !== undefined ? ROWS[+el.dataset.row] : DATA[+el.dataset.idx];
  if (d) {
    const opener = el.matches('.ag-row') ? el.querySelector('.ag-detail') : el.matches('.next-open') ? el : null;
    if (opener) opener.focus({preventScroll:true});
    openModal(d);
  }
}
agendaEl.addEventListener('click', e => {
  if (applyItemTag(e)) return;
  if (e.target.closest('[data-reveal]')) { revealHidden(); return; }
  rowToModal(e);
});
// 빈 결과의 복구 버튼 — 지금 결과를 0으로 만든 숨김 토글만 끈다. 나머지 필터는 그대로다.
function revealHidden() {
  const { hidden } = getFiltered();
  if (hidden.past.size) hidePastEl.checked = false;
  if (hidden.tbd.size) hideTbdEl.checked = false;
  saveFilters(); render();
  const first = agendaEl.querySelector('.ag-detail');
  if (first) first.focus();
}
agendaEl.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.idx !== undefined) {
    e.preventDefault(); rowToModal(e);
  }
});
deadlinesEl.addEventListener('click', rowToModal);
document.getElementById('next-event').addEventListener('click', rowToModal);

search.addEventListener('input', render);
[hidePastEl, hideTbdEl, tierOnlyEl].forEach(el => el.addEventListener('change', () => { saveFilters(); render(); }));


// ── 월별 개최 분포 (chart 레이어 = chart-js 4.5.1) ──────────
// 값은 전부 현재 필터 결과에서 나온다 — 페이지 밖 데이터를 가져오지 않는다는
// static-derived-doc 의 "No transport record" 규약 그대로. 색은 팔레트 레이어가
// 화면과 같은 open-color 토큰을 넘겨주므로 범례와 행 색이 항상 일치한다.
let monthChart = null;
let chartLoading = false;
function loadMonthChart() {
  if (chartLoading) return;
  chartLoading = true;
  figureEl.querySelector('.figure-note').textContent = '월별 분포 준비 중…';
  const script = document.createElement('script');
  script.src = 'vendor/chart-js/4.5.1/chart.umd.js';
  script.addEventListener('load', () => renderMonthChart(getFiltered().rows));
  script.addEventListener('error', () => {
    chartLoading = false;
    script.remove();
    figureEl.querySelector('.figure-note').textContent = '분포를 불러오지 못했습니다. 다시 펼치면 재시도합니다.';
  });
  document.head.append(script);
}
function renderMonthChart(rows) {
  if (!figureEl) return;
  const dated = rows.filter(hasDatedSchedule);
  if (!dated.length) { figureEl.hidden = true; return; }
  figureEl.hidden = false;
  if (!figureEl.open) return;
  if (typeof Chart === 'undefined') { loadMonthChart(); return; }

  // 창(窓)은 **오늘부터 12개월**로 고정한다. 향후 개최판을 행으로 펴면서 표는 2029년까지
  // 뻗지만, 그 전체를 막대로 세우면 34개월 중 대부분이 0인 축이 되어 "언제 몰려 있나"라는
  // 이 그림의 유일한 질문을 오히려 가린다. 먼 미래는 표가 답한다.
  // 빈 달은 그대로 그린다 — 간격을 압축하면 밀집도가 왜곡된다.
  const keys = [];
  const from = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  for (let i = 0; i < 12; i++) {
    const m = new Date(from.getFullYear(), from.getMonth() + i, 1);
    keys.push(`${m.getFullYear()}.${m.getMonth() + 1}`);
  }
  const inWindow = new Set(keys);

  const counts = {};                    // key → category → n
  let outside = 0;
  dated.forEach(d => {
    const s = parse(d.start), k = `${s.getFullYear()}.${s.getMonth() + 1}`;
    if (!inWindow.has(k)) { outside++; return; }   // 창 밖은 세지 않는다(표가 갖는다)
    const bucket = counts[k] || (counts[k] = {});
    bucket[d.category] = (bucket[d.category] || 0) + 1;
  });
  // 창 밖으로 밀린 개수를 캡션이 말한다 — 그림이 조용히 일부만 보여주면 안 된다.
  const noteEl = figureEl.querySelector('.figure-note');
  if (noteEl) {
    noteEl.textContent = `현재 필터 기준 · 향후 12개월 · 분류별 누적 · 막대를 누르면 그 달로`
      + (outside ? ` · 창 밖 ${outside}건은 표에` : '');
  }

  const inks = CATS.map(c => ConfcalPalette.token(`--c-${catSlug(c)}`) || undefined);
  const datasets = CATS.map((c, i) => ({
    label: c,
    data: keys.map(k => (counts[k] && counts[k][c]) || 0),
    backgroundColor: inks[i],
    borderWidth: 0,
    borderRadius: 2
  }));

  const grid = ConfcalPalette.token('--hairline');
  const ink = ConfcalPalette.token('--ink-subtle');
  const labels = keys.map(k => {
    const [y, m] = k.split('.');
    return m === '1' ? `${y}.1월` : `${MONTH_KR[+m - 1]}`;
  });

  if (monthChart) { monthChart.destroy(); monthChart = null; }
  monthChart = new Chart(document.getElementById('monthChart'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: false,
      onClick: (_evt, els) => {
        if (!els.length) return;
        const target = document.getElementById('m-' + keys[els[0].index]);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: ink, font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, grid: { color: grid },
             ticks: { color: ink, precision: 0, font: { size: 10 } } }
      },
      plugins: {
        legend: { labels: { color: ink, boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
        tooltip: {
          backgroundColor: ConfcalPalette.token('--panel'),
          titleColor: ConfcalPalette.token('--ink'),
          bodyColor: ConfcalPalette.token('--ink'),
          borderColor: grid, borderWidth: 1,
          callbacks: { title: items => keys[items[0].dataIndex].replace('.', '년 ') + '월' }
        }
      }
    }
  });
}

// 정적 마크업의 [data-icon] 자리를 인라인 SVG 로 채운다 — index.html 에 SVG 를
// 붙여넣지 않고도 같은 아이콘 소스 하나를 쓰기 위해서다.
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = ConfcalIcon(el.dataset.icon); });

showSearchMode(SEARCH.mode, SEARCH.note);
restoreFilters();
renderCategoryOptions();
render();
todayEl.textContent = ymd(TODAY);

// CSS updates the DOM automatically; the canvas needs its colours read again.
new MutationObserver(() => renderMonthChart(getFiltered().rows)).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-theme', 'data-theme-pref']
});
const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
const refreshChartTheme = () => renderMonthChart(getFiltered().rows);
if (themeMedia.addEventListener) themeMedia.addEventListener('change', refreshChartTheme);
else if (themeMedia.addListener) themeMedia.addListener(refreshChartTheme);

// 분포를 처음 펼칠 때만 로컬 Chart.js 핀을 읽는다. 핵심 마감·개최 표시와 경쟁하지 않는다.
figureEl.addEventListener('toggle', () => { if (figureEl.open) renderMonthChart(getFiltered().rows); });
