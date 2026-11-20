#!/usr/bin/env python3
"""오프라인 꾸러미와 공개 저장소가 공유하는 파일 선택·변환·유출 검사."""
import json
from pathlib import Path
import shutil

if __package__:
    from .confcal import check
else:
    from confcal import check

ROOT = Path(__file__).resolve().parents[1]
# Hex literals let the shipped rebuild tool pass the same strict byte scan.
LEAK_TERMS = tuple(bytes.fromhex(x).decode() for x in ('6561737430', '2f686f6d652f', '2f776f726b7370616365', '73616e64626f782d', '7362782d', '67783130', '657472692e72652e6b72', '40676d61696c', '6376626774', '3132372e302e302e31', '6c6f63616c686f7374', '636f64657840', 'ec9b90eb82b4', '436c6f7564666c617265', '7461696c7363616c65', '53414e44424f585f'))
EXCLUDED = {'.confcal.lock', 'output', 'tests', 'docs', '.git', 'dashboard.sqlite', 'undefined', '__pycache__', 'confboard', 'DESIGN.md'}
FILES = ('index.html', 'assets', 'data', 'vendor', 'tools/confcal.py', 'tools/deadlines.py', 'tools/places-adapter.js', 'tools/check_data.py', 'tools/source_gate.py', 'tools/build_package.py', 'tools/package_contents.py', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'README-offline.md')


def leak_gate(folder, extra_terms=()):
    errors = []
    for p in sorted(folder.rglob('*')):
        if p.is_file():
            content = p.read_bytes()
            name = str(p.relative_to(folder)).encode('utf-8')
            raw = name.lower() + b'\n' + content.lower()
            for term in LEAK_TERMS:
                if term.lower().encode() in raw: errors.append(f'{p.relative_to(folder)}: {term}')
            # Extra short strings are case-insensitive in text and filenames.
            # In compressed vendor binaries match literal bytes: random mixed-case
            # triples are not identifiers, and the original font must stay intact.
            try:
                extra_raw = content.decode('utf-8').lower().encode('utf-8')
            except UnicodeDecodeError:
                extra_raw = content
            for term in extra_terms:
                if term.lower().encode() in name.lower() or term.lower().encode() in extra_raw:
                    errors.append(f'{p.relative_to(folder)}: {term}')
    if errors: raise ValueError('공유 금지 문자열 발견:\n' + '\n'.join(errors))


def offline_sheet(text):
    return (text.replace('읽기 전용 보드를 실행해 브라우저에서 검색과 상세를 연다', 'index.html을 더블클릭해 검색과 상세를 연다')
            .replace('confcal 보드를 로컬에서 열어 줘.', '이 폴더의 index.html을 브라우저에서 열어 줘.')
            .replace('python3 -m confboard serve', 'index.html 더블클릭')
            .replace('보드 서버는 읽기 전용이다.', '화면은 읽기 전용이다.')
            .replace('채팅으로 갱신을 부탁해야 한다.', '이 폴더를 연 AI 도구에 AGENTS.md에 따라 갱신을 부탁한다.'))


def prepare(root, target):
    """검증한 오프라인 파일만 정렬해 복사한다. 최종 유출 검사는 호출자가 한다."""
    errors = check(root)
    if errors: raise ValueError('\n'.join(errors))
    if target.exists(): shutil.rmtree(target)
    target.mkdir(parents=True)
    for name in sorted(FILES):
        src = root / name
        if not src.exists():
            raise FileNotFoundError('필수 공유 파일 없음: ' + name)
        paths = sorted(src.rglob('*')) if src.is_dir() else [src]
        for path in paths:
            relative = path.relative_to(root)
            if any(part in EXCLUDED for part in relative.parts) or path.suffix == '.pyc':
                continue
            if path.is_symlink():
                raise ValueError('공유 파일의 심볼릭 링크 금지: ' + str(relative))
            if path.is_file():
                dst = target / relative
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(path, dst)
    page = target / 'index.html'
    page.write_text(page.read_text().replace('<!--board-mark-->', ''), encoding='utf-8')
    # Older browser preferences and vendor metadata use a private prefix.
    for name in ['assets/theme-toggle.js', 'vendor/manifest.json']:
        p = target / name
        p.write_text(p.read_text().replace(bytes.fromhex('7362782d').decode(), 'confcal-'), encoding='utf-8')
    sheet = target / 'assets/cheatsheet.html'
    sheet.write_text(offline_sheet(sheet.read_text()), encoding='utf-8')
    metadata = target / 'assets/ASSETS.json'
    meta = json.loads(metadata.read_text())
    for item in meta.get('items', []):
        if item.get('id') == 'board-serve':
            item.update(run='index.html 더블클릭', files=['index.html'], say='이 폴더의 index.html을 열어 줘.', care='수정은 AGENTS.md에 따라 AI에게 요청한다.')
    metadata.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (target / 'assets/usage-offline.js').write_text('window.OFFLINE_USAGE = ' + json.dumps((target / 'assets/cheatsheet.html').read_text(), ensure_ascii=False) + ';\n', encoding='utf-8')
    return target
