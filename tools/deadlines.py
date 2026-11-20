"""assets/app.js actionDeadlines와 같은 행동 마감 파생 규칙 (달력 날짜 기준)."""
import datetime as dt
import re

DATE = re.compile(r'(?:(\d{4})[-./])?(\d{1,2})[-./](\d{1,2})')
TIME = re.compile(r'\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AoE|UTC(?:[+-]\d{1,2})?|PST|PDT|PT|HST|KST))?|\b\d{1,2}시|\b(?:AoE|UTC(?:[+-]\d{1,2})?|PST|PDT|PT|HST|KST)\b', re.I | re.ASCII)
ACTION = re.compile(r'마감|기한|제출|초록|최종본|최종논문|수정본|회신|등록|얼리버드|제안|의향서|발표 신청|영상 미리보기|Papers?|Posters?|TMECH|보충자료|E-Rights|본문|rebuttal|리뷰털|Late[- ]Breaking|camera-ready', re.I)
EXCLUDED = re.compile(r'통보|통지|공지|리뷰 공개|최종 리뷰|접수 개시|오픈|결정|조건부 채택|최종 채택|초청 및/')


def time_in(text):
    return ' '.join(m[0] for m in TIME.finditer(text))


def iso_date(year, month, day):
    try: return dt.date(int(year), int(month), int(day)).isoformat()
    except (ValueError, TypeError): return None


def kind_of(label):
    if re.search('등록|얼리버드', label): return '등록'
    if '회신' in label: return '회신'
    if re.search('최종|수정본|camera-ready', label, re.I): return '최종·수정'
    return '제안' if re.search('제안|의향서', label) else '제출'


def action_deadlines(item):
    result = []
    process = item.get('paperProcess') or []
    global_time = time_in(next((t for t in process if '모든 마감' in t), '')) or item.get('timezone') or ''

    def add(date, label, kind, detail, time=''):
        if not isinstance(date, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date): return
        try: dt.date.fromisoformat(date)
        except ValueError: return
        if any(r['date'] == date and r['kind'] == kind and (kind == '등록' or r['label'] == label) for r in result): return
        result.append(dict(date=date, label=label, kind=kind, detail=detail, time=time or ''))

    for text in process:
        separated = re.sub(r'([0-9][^·;；\n]*?)·(?=[^·]*\d{4}[-./])', r'\1;', text)
        for part in re.split(r'\s+·\s+|[;；\n]', separated):
            dates = list(DATE.finditer(part))
            if not dates or not dates[0][1]: continue
            base = re.sub(r'[:：]\s*$', '', part[:dates[0].start()]).strip()
            if not base: base = part[dates[0].end():].strip()
            if EXCLUDED.search(base): continue
            year = dates[0][1]
            i = 0
            while i < len(dates):
                token = dates[i]
                year = token[1] or year
                date = iso_date(year, token[2], token[3])
                between = part[dates[i-1].end():token.start()] if i else ''
                label = base if i == 0 else re.sub(r'^[\s(),및]+|[:：]\s*$', '', between).strip()
                if i > 0 and not token[1]:
                    if '및' not in part[dates[i-1].start():token.start()]:
                        i += 1
                        continue
                    label = base
                if i > 0 and not ACTION.search(label) and re.match(r'\s*\(', between):
                    label = base + ' · ' + re.sub(r'는\s*$', '', label)
                next_date = dates[i+1] if i+1 < len(dates) else None
                if next_date and re.fullmatch(r'\s*[~–—-]\s*', part[token.end():next_date.start()]):
                    end = iso_date(next_date[1] or year, next_date[2], next_date[3])
                    if not date or not end or end < date:
                        i += 1
                        continue
                    date = end
                    i += 1
                if date and not EXCLUDED.search(label) and ACTION.search(label):
                    last = dates[i]
                    end_index = dates[i+1].start() if i+1 < len(dates) else len(part)
                    time = time_in(part[last.end():end_index]) or global_time
                    add(date, label, kind_of(label), text, time)
                i += 1
    finals = {r['date'] for r in result if r['kind'] == '최종·수정'}
    if len(finals) == 1:
        for text in process:
            if re.search(r'최종본 마감까지\s*사전등록', text): add(next(iter(finals)), '저자 사전등록 (최종본 마감)', '등록', text)
    for field, label in [('abstractDeadline', '초록 마감'), ('paperDeadline', '논문 마감')]:
        date = item.get(field)
        if date and not any(r['date'] == date and r['kind'] == '제출' for r in result):
            add(date, label, '제출', label, item.get('timezone'))
    add(item.get('regDeadline'), '사전등록', '등록', item.get('registration') or '사전등록')
    return result


def upcoming(rows, today, days=30):
    result = []
    for identifier, item in rows.items():
        for deadline in action_deadlines(item):
            delta = (dt.date.fromisoformat(deadline['date']) - today).days
            if 0 <= delta <= days:
                result.append(dict(id=identifier, acronym=item['acronym'], days=delta, **deadline))
    return sorted(result, key=lambda r: (r['days'], r['acronym'].casefold()))
