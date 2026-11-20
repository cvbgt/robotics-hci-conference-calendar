#!/usr/bin/env python3
"""공식 출처 변경 관문. --seed로 기준 생성, 인자 없이 비교, 검토 후 --accept.
변경 없음은 0, 검토 필요는 10, 기준 없음은 2를 반환한다.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import difflib
import hashlib
import html
import json
import re
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "output" / "source-watch"
PROCEED = 10
NO_BASELINE = 2
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
SCHEDULE_WORDS = re.compile(
    r"(20[2-3]\d|마감|등록|접수|제출|일정|연기|연장|장소|개최|기조|키노트|초청|"
    r"deadline|due|registration|register|early|submission|notification|camera|"
    r"venue|location|keynote|plenary|speaker|postpone|extend|"
    r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d)", re.I)
DEADLINE_LINE = re.compile(r"(마감|deadline|due)", re.I)
ISO = re.compile(r"\b(20\d\d-\d\d-\d\d)\b")
BLOCK_TAG = re.compile(r"(?i)<\s*/?\s*(p|div|br|li|tr|td|th|h[1-6]|section|article|"
                       r"header|footer|ul|ol|table|dd|dt|option|nav)\b[^>]*>")
DROP = re.compile(r"(?is)<(script|style|noscript|svg|template)\b.*?</\1\s*>|<!--.*?-->")
MAX_LINES_PER_ITEM = 40
MAX_LINE = 240


def load_items(path: Path) -> list[dict]:
    if path.suffix == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    try:
        from check_data import load_items as read_js
    except ImportError:
        from tools.check_data import load_items as read_js
    return read_js(path)


def urls_of(item: dict) -> list[str]:
    seen: list[str] = []
    for url in [item.get("website"), *(item.get("sources") or [])]:
        if isinstance(url, str) and url.startswith("http") and url not in seen:
            seen.append(url)
    return seen


def decode(body: bytes, content_type: str) -> str:
    m = re.search(r"charset=([\w-]+)", content_type or "", re.I)
    head = re.search(rb"<meta[^>]+charset=[\"']?([\w-]+)", body[:4096], re.I)
    tried = [m.group(1) if m else None, head.group(1).decode() if head else None,
             "utf-8", "cp949"]
    for enc in [e for e in tried if e]:
        try:
            return body.decode(enc)
        except (LookupError, UnicodeDecodeError):
            continue
    return body.decode("utf-8", "replace")


def normalize(markup: str) -> list[str]:
    """Page markup → visible text lines (deterministic, whitespace-collapsed)."""
    text = DROP.sub(" ", markup)
    text = BLOCK_TAG.sub("\n", text)
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    lines = []
    for raw in text.split("\n"):
        line = re.sub(r"\s+", " ", raw).strip()
        if line and line not in lines[-1:]:
            lines.append(line[:1000])
    return lines


def fetch(url: str, timeout: float) -> tuple[list[str] | None, str]:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "ko,en;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read(4_000_000)
            ctype = resp.headers.get("Content-Type", "")
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        return None, f"{type(exc).__name__}: {str(exc)[:120]}"
    if "pdf" in ctype.lower() or body[:5] == b"%PDF-":
        return [f"pdf sha256 {hashlib.sha256(body).hexdigest()}"], "ok"
    return normalize(decode(body, ctype)), "ok"


def page_file(base: Path, url: str) -> Path:
    return base / "pages" / (hashlib.sha1(url.encode()).hexdigest()[:16] + ".txt")


def relevant_changes(old: list[str], new: list[str]) -> list[str]:
    out = []
    for line in difflib.unified_diff(old, new, lineterm="", n=0):
        if line.startswith(("---", "+++", "@@")):
            continue
        if SCHEDULE_WORDS.search(line[1:]):
            out.append(line[:MAX_LINE])
    return out


def deadlines(items: list[dict], today: dt.date, horizon: int = 30) -> list[tuple[int, str, str]]:
    try:
        from deadlines import action_deadlines
    except ImportError:
        from tools.deadlines import action_deadlines
    found = {}
    for item in items:
        name = item.get('acronym') or '?'
        for row in action_deadlines(item):
            days = (dt.date.fromisoformat(row['date']) - today).days
            if 0 <= days <= horizon:
                kind = '논문' if row['kind'] == '제출' and re.search('논문|paper', row['label'], re.I) else row['kind']
                found.setdefault((name, row['date']), (days, name, kind))
    return sorted(found.values())


def deadline_text(rows: list[tuple[int, str, str]]) -> str:
    nearest: dict[str, tuple[int, str, str]] = {}
    for row in rows:  # rows are sorted by days → first one per conference is the nearest
        nearest.setdefault(row[1], row)
    rows = list(nearest.values())
    return " · ".join(f"{name} {kind} D-{days}" if days else f"{name} {kind} 오늘"
                      for days, name, kind in rows)


def run(args: argparse.Namespace) -> int:
    report = getattr(args, 'report', None)
    if report is not None:
        report.update(changes=[], failed=[], new_urls=[], message='일정 관련 변경 없음')
    def message(text):
        if report is not None: report['message'] = text
    base = Path(args.state)
    pending = base / "pending"
    if args.accept:
        if not pending.is_dir():
            message("기준으로 넘길 대기 스냅숏 없음")
            print("기준으로 넘길 대기 스냅숏 없음")
            return 0
        (base / "pages").mkdir(parents=True, exist_ok=True)
        for f in pending.glob("*.txt"):
            shutil.move(str(f), base / "pages" / f.name)
        shutil.rmtree(pending, ignore_errors=True)
        message("대기 스냅숏을 기준으로 넘김")
        print("대기 스냅숏을 기준으로 넘김")
        return 0

    items = load_items(Path(args.items))
    today = dt.date.fromisoformat(args.today) if args.today else dt.date.today()
    owners = {}
    for item in items:
        for url in urls_of(item): owners.setdefault(url, []).append(item)
    targets = {url: entries[0] for url, entries in owners.items()}
    if args.seed_new:
        # 목록 확장 때는 기존 비교 기준과 대기 변경을 보존한다.
        targets = {url: item for url, item in targets.items() if not page_file(base, url).exists()}
        (base / "pages").mkdir(parents=True, exist_ok=True)
        with cf.ThreadPoolExecutor(args.workers) as pool:
            pages = dict(zip(targets, pool.map(lambda u: fetch(u, args.timeout), targets)))
        failed = []
        for url, (lines, status) in pages.items():
            if lines is None:
                failed.append({"url": url, "status": status})
            else:
                # 다른 실행이 먼저 기록했어도 기존 바이트를 덮지 않는다.
                try:
                    with page_file(base, url).open('x', encoding='utf-8') as stream:
                        stream.write("\n".join(lines) + "\n")
                except FileExistsError:
                    pass
        if report is not None:
            report.update(failed=failed, message=f'새 출처 {len(targets)}개 기준 생성')
        print(json.dumps({"새출처": len(targets), "실패": failed}, ensure_ascii=False))
        return 0 if not failed else NO_BASELINE
    with cf.ThreadPoolExecutor(args.workers) as pool:
        pages = dict(zip(targets, pool.map(lambda u: fetch(u, args.timeout), targets)))

    has_baseline = (base / "pages").is_dir() and any((base / "pages").iterdir())
    changed: dict[str, list[tuple[str, list[str]]]] = {}
    failed, new_urls = [], []
    shutil.rmtree(pending, ignore_errors=True)
    pending.mkdir(parents=True, exist_ok=True)
    for url, (lines, status) in pages.items():
        name = targets[url].get("acronym") or "?"
        if lines is None:
            failed.append(f"{name} {url} ({status})")
            continue
        old_file = page_file(base, url)
        (pending / old_file.name).write_text("\n".join(lines) + "\n", encoding="utf-8")
        if not old_file.exists():
            new_urls.append(f"{name} {url}")
            continue
        diff = relevant_changes(old_file.read_text(encoding="utf-8").splitlines(), lines)
        if diff:
            for owner in owners[url]:
                changed.setdefault(owner.get('acronym') or '?', []).append((url, diff))

    if report is not None:
        identifiers = getattr(args, 'identifiers', {})
        report.update(failed=failed, new_urls=new_urls)
        for name, rows in sorted(changed.items()):
            budget = MAX_LINES_PER_ITEM
            for url, diff in rows:
                if budget <= 0: break
                report['changes'].append(dict(id=identifiers.get(name, name), acronym=name, url=url, lines=diff[:budget]))
                budget -= min(budget, len(diff))
    soon = deadlines(items, today)
    print(f"관문: 학회 {len(items)}곳 · 페이지 {len(pages)}개 · 받기 실패 {len(failed)} · "
          f"새 페이지 {len(new_urls)} · 일정 낱말 변화 {len(changed)}곳")
    if not has_baseline or args.seed:
        run(argparse.Namespace(state=args.state, accept=True))
        print("기준이 없어 이번 페이지로 기준을 만들었다" if not args.seed else "기준 갱신(--seed)")
        message('기준 생성; 받기 실패 주소는 재확인 필요' if failed else '기준 생성 완료')
        return (NO_BASELINE if failed else 0) if args.seed else NO_BASELINE

    ended = [i.get("acronym") for i in items
             if i.get("end") and i["end"] < today.isoformat() and i.get("acronym") not in changed]
    if not changed:
        if not failed and not new_urls:
            run(argparse.Namespace(state=args.state, accept=True))
        for row in failed:
            print("받기 실패:", row)
        if ended:
            print("종료됐지만 공식 페이지 변화 없음(차기 회차 미발표로 봄):", ", ".join(ended))
        if soon:
            verdict = {"verdict": "deadline", "next_action":
                       f"30일 안 마감: {deadline_text(soon)} : 학회 일정 보드에서 확인"}
        else:
            verdict = {"verdict": "none", "next_action": "변경 없음"}
        print(json.dumps(verdict, ensure_ascii=False))
        if report is not None:
            report['verdict'] = verdict
            return PROCEED if failed or new_urls else 0
        return 0

    print("\n## 관문 결과 — 아래 학회만 공식 출처로 확인한다")
    print("나머지 학회는 지난 기준 뒤 공식 페이지의 일정 관련 줄이 바뀌지 않았다. "
          "데이터를 고치고 커밋한 뒤 `python3 tools/source_gate.py --accept` 로 기준을 넘긴다.")
    for name, rows in sorted(changed.items()):
        item = next(i for i in items if i.get("acronym") == name)
        tag = " (종료됨 — 차기 회차 발표 여부 확인)" if item.get("end") and item["end"] < today.isoformat() else ""
        print(f"\n### {name}{tag}")
        budget = MAX_LINES_PER_ITEM
        for url, diff in rows:
            print(f"- {url}")
            for line in diff[:budget]:
                print(f"  {line}")
            budget -= min(budget, len(diff))
            if budget <= 0:
                print("  … (줄 생략 — 페이지를 직접 확인)")
                break
    if new_urls:
        print("\n새로 추가된 출처(비교 기준 없음):", "; ".join(new_urls))
    if failed:
        print("\n받기 실패(이번 주 비교 못 함):", "; ".join(failed))
    if soon:
        print("\n30일 안 마감(계산값):", deadline_text(soon))
    return PROCEED


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--items", default=str(ROOT / "data" / "items.js"))
    ap.add_argument("--state", default=str(STATE))
    ap.add_argument("--today", help="YYYY-MM-DD (테스트용)")
    ap.add_argument("--timeout", type=float, default=25)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--seed", action="store_true", help="비교 없이 지금 페이지로 기준을 만든다")
    ap.add_argument("--seed-new", action="store_true", help="기존 기준·대기 변경을 보존하고 새 URL만 시드")
    ap.add_argument("--accept", action="store_true", help="대기 스냅숏을 기준으로 넘긴다")
    return run(ap.parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
