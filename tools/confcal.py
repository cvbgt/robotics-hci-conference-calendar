#!/usr/bin/env python3
"""학회별 JSON 조회·수정·공식 출처 점검 (Python 3 표준 라이브러리)."""
import argparse
import contextlib
import datetime as dt
import io
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def tool(name):
    if __package__:
        return importlib.import_module('.' + name, __package__)
    if name in sys.modules:
        return sys.modules[name]
    # Load siblings by path so `python3 -I`/-P (no script dir on sys.path) still works.
    spec = importlib.util.spec_from_file_location(name, Path(__file__).resolve().with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def parse_json(text):
    def pairs(rows):
        result = {}
        for key, value in rows:
            if key in result: raise ValueError('중복 JSON 키: ' + key)
            result[key] = value
        return result
    def finite(raw):
        value = float(raw)
        if not math.isfinite(value): raise ValueError('유한 숫자 필요: ' + raw)
        return value
    return json.loads(text, object_pairs_hook=pairs, parse_float=finite,
                      parse_constant=lambda x: (_ for _ in ()).throw(ValueError('유한 숫자 필요: ' + x)))


def read_json(path):
    return parse_json(Path(path).read_text(encoding='utf-8'))


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'


def valid_id(identifier):
    return isinstance(identifier, str) and re.fullmatch(r'[^\W_]+(?:-[^\W_]+)*', identifier) and identifier == identifier.lower()


def records(root=ROOT):
    order = read_json(root / 'data/order.json')
    if not isinstance(order, list) or any(not valid_id(i) for i in order) or len(set(order)) != len(order):
        raise ValueError('data/order.json: 고유한 소문자 ID 배열 필요')
    found = {p.stem for p in (root / 'data/conferences').glob('*.json')}
    if found != set(order): raise ValueError('순서 목록과 학회 파일 불일치: ' + ', '.join(sorted(found ^ set(order))))
    return {i: read_json(root / 'data/conferences' / (i + '.json')) for i in order}


def check_records(rows, root=ROOT):
    validate = tool('check_data').validate
    aliases = read_json(root / 'data/places.json')
    if not isinstance(aliases, dict) or any(not isinstance(k, str) or not isinstance(v, str) or not re.search('[가-힣]', v) for k, v in aliases.items()):
        return ['장소 별칭: 영문 토큰과 한국어 문자열 객체 필요']
    if len({k.lower() for k in aliases}) != len(aliases): return ['장소 별칭: 대소문자 중복 토큰']
    return validate(list(rows.values()), {k.lower(): v for k, v in aliases.items()}, read_json(root / 'data/schema.json'))


def generated(rows, root=ROOT):
    # One literal per line keeps the browser payload smaller than the original.
    items = '// generated — edit data/conferences/*.json\nwindow.DATA = [\n' + ',\n'.join(
        json.dumps(d, ensure_ascii=False, separators=(',', ':'), allow_nan=False) for d in rows.values()) + '\n];\n'
    places = '// generated — edit data/places.json\n(function (global) {\n  \'use strict\';\n  const aliases = ' + json.dumps(
        read_json(root / 'data/places.json'), ensure_ascii=False, sort_keys=True, indent=2) + ';\n' + (root / 'tools/places-adapter.js').read_text(encoding='utf-8')
    return {'data/items.js': items, 'data/places.js': places}


def check(root=ROOT, rows=None):
    if rows is None: rows = records(root)
    errors = check_records(rows, root)
    for path, content in generated(rows, root).items():
        if not (root / path).exists() or (root / path).read_bytes() != content.encode('utf-8'):
            errors.append(path + ': 생성본이 오래됨; python3 tools/confcal.py build-data 실행')
    return errors


def atomic_write(path, content):
    import tempfile
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.' + path.name + '-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as stream: stream.write(content)
        os.replace(name, path)
    finally:
        if os.path.exists(name): os.unlink(name)


@contextlib.contextmanager
def editing(root):
    lock = root / 'data/.confcal.lock'
    try: fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError: raise ValueError('다른 데이터 편집 실행 중: data/.confcal.lock 확인') from None
    try:
        os.write(fd, str(os.getpid()).encode())
        yield
    finally:
        os.close(fd)
        lock.unlink()


def commit_files(changes, root):
    """검증·렌더 후 교체한다. 쓰기 실패 시 이 작업의 파일만 복구한다."""
    before = {name: (root / name).read_text(encoding='utf-8') if (root / name).exists() else None for name in changes}
    touched = []
    try:
        for name, content in changes.items():
            if content == before[name]: continue
            if content is None: (root / name).unlink()
            else: atomic_write(root / name, content)
            touched.append(name)
    except OSError:
        for name in reversed(touched):
            if before[name] is None: (root / name).unlink(missing_ok=True)
            else: atomic_write(root / name, before[name])
        raise


def allocate_id(acronym, rows):
    import hashlib
    slug = re.sub(r'[\W_]+', '-', acronym.lower()).strip('-') or 'conference'
    if slug not in rows: return slug
    suffix = hashlib.sha256(acronym.encode()).hexdigest()
    for length in range(8, 65, 4):
        candidate = slug + '-' + suffix[:length]
        if candidate not in rows: return candidate
    raise ValueError('학회 ID 충돌')


def set_path(item, path, value):
    keys = path.split('.')
    if not all(keys): raise ValueError('빈 필드 경로: ' + path)
    target = item
    for key in keys[:-1]:
        if isinstance(target, list):
            if not key.isdecimal(): raise ValueError('배열 인덱스는 0 이상 필요')
            target = target[int(key)]
        elif isinstance(target, dict):
            if key not in target: raise ValueError('중간 필드 없음: ' + key)
            target = target[key]
        else: raise ValueError('객체·배열 경로 필요: ' + path)
    if isinstance(target, list):
        index = int(keys[-1])
        if index < 0: raise ValueError('배열 인덱스는 0 이상 필요')
        target[index] = value
    elif isinstance(target, dict): target[keys[-1]] = value
    else: raise ValueError('객체·배열 경로 필요: ' + path)


def status(item, today):
    start, end = item.get('start'), item.get('end') or item.get('start')
    if not start or not end or end < start: return '미정'
    return '종료' if end < today else '진행중' if start <= today <= end else '예정'


def tag_map(root):
    # Read the existing UI map instead of maintaining a second taxonomy.
    literal = tool('check_data').literal
    text = (root / 'assets/filters.js').read_text(encoding='utf-8')
    return literal(re.search(r'const TAG_MAP = (\{[\s\S]*?\});', text)[1])


def tag_match(item, tag, mapping):
    return tag in item.get('tags', []) or tag in [mapping.get(t, t) for t in item.get('tags', [])]


def parser():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--json', action='store_true', help='JSON 결과 출력 (하위 명령 뒤에도 가능)')
    sub = ap.add_subparsers(dest='command', required=True)
    for name in ['list', 'show', 'set', 'add', 'remove', 'check', 'gate', 'deadlines', 'build-data', 'package']:
        p = sub.add_parser(name)
        p.add_argument('--json', action='store_true', default=argparse.SUPPRESS, help='JSON 결과 출력')
        if name == 'list':
            p.add_argument('--tag'); p.add_argument('--category'); p.add_argument('--tbd', action='store_true')
        if name in ['show', 'set', 'remove']: p.add_argument('id')
        if name == 'set': p.add_argument('assignments', nargs='+', metavar='field=value')
        if name == 'add': p.add_argument('file', help='JSON 파일 또는 - (표준 입력)')
        if name == 'gate':
            modes = p.add_mutually_exclusive_group()
            for flag in ['seed', 'accept', 'seed-new']: modes.add_argument('--' + flag, action='store_true')
            p.add_argument('--state', type=Path)
            p.add_argument('--timeout', type=float, default=25)
            p.add_argument('--workers', type=int, default=8)
        if name in ['deadlines', 'list', 'gate']: p.add_argument('--today', type=dt.date.fromisoformat, help='기준일 YYYY-MM-DD')
        if name == 'deadlines': p.add_argument('--days', type=int, default=30)
    return ap


def execute(args, root):
    cmd = args.command
    if cmd == 'gate':
        run = tool('source_gate').run
        report = {}
        errors = check(root)
        if errors: raise ValueError('\n'.join(errors))
        ns = argparse.Namespace(items=str(root / 'data/items.js'), state=str(args.state or root / 'output/source-watch'),
                                today=args.today.isoformat() if args.today else None, timeout=args.timeout,
                                workers=args.workers, seed=args.seed, seed_new=args.seed_new, accept=args.accept, report=report,
                                identifiers={d['acronym']: i for i, d in records(root).items()})
        with contextlib.redirect_stdout(io.StringIO()): code = run(ns)
        return report, code
    if cmd == 'package':
        build = tool('build_package').build
        with contextlib.redirect_stdout(io.StringIO()) as out: build(root)
        return json.loads(out.getvalue()), 0
    if cmd == 'show':
        if not valid_id(args.id): raise ValueError('학회 ID 형식 오류: ' + args.id)
        return read_json(root / 'data/conferences' / (args.id + '.json')), 0
    rows = records(root)
    if cmd == 'check':
        errors = check(root, rows)
        return {'ok': not errors, 'count': len(rows), 'errors': errors}, int(bool(errors))
    if cmd == 'build-data':
        errors = check_records(rows, root)
        if errors: raise ValueError('\n'.join(errors))
        commit_files(generated(rows, root), root)
        return {'ok': True, 'count': len(rows)}, 0
    if cmd in ['show', 'set', 'remove'] and args.id not in rows: raise ValueError('학회 ID 없음: ' + args.id)
    if cmd == 'list':
        today = (args.today or dt.date.today()).isoformat()
        mapping = tag_map(root) if args.tag else {}
        return [{'id': i, 'acronym': d['acronym'], 'dates': d['dates'], 'status': status(d, today)} for i, d in rows.items()
                if (not args.category or d['category'] == args.category)
                and (not args.tag or tag_match(d, args.tag, mapping))
                and (not args.tbd or status(d, today) == '미정')], 0
    if cmd == 'deadlines':
        if args.days < 0: raise ValueError('조회 일수는 0 이상 필요')
        upcoming = tool('deadlines').upcoming
        return upcoming(rows, args.today or dt.date.today(), args.days), 0
    changes = {}
    if cmd == 'set':
        for assignment in args.assignments:
            if '=' not in assignment: raise ValueError('field=value 필요: ' + assignment)
            field, raw = assignment.split('=', 1)
            try: value = parse_json(raw)
            except json.JSONDecodeError: value = raw
            set_path(rows[args.id], field, value)
        identifier = args.id
    elif cmd == 'add':
        item = parse_json(sys.stdin.read()) if args.file == '-' else read_json(args.file)
        if not isinstance(item, dict) or not isinstance(item.get('acronym'), str): raise ValueError('학회 객체와 약칭 필요')
        identifier = allocate_id(item['acronym'], rows)
        rows[identifier] = item
    elif cmd == 'remove':
        identifier = args.id
        del rows[identifier]
        changes['data/conferences/' + identifier + '.json'] = None
    errors = check_records(rows, root)
    if errors: raise ValueError('\n'.join(errors))
    if cmd != 'remove': changes['data/conferences/' + identifier + '.json'] = dump(rows[identifier])
    if cmd in ['add', 'remove']: changes['data/order.json'] = dump(list(rows))
    changes.update(generated(rows, root))
    commit_files(changes, root)
    return {'ok': True, 'id': identifier, 'count': len(rows)}, 0


def main(argv=None, root=ROOT):
    ap = parser()
    args = ap.parse_args(argv)
    try:
        if args.command in ['set', 'add', 'remove', 'build-data', 'package']:
            with editing(root): result, code = execute(args, root)
        else: result, code = execute(args, root)
    except (ValueError, OSError, IndexError, KeyError, TypeError) as exc:
        result, code = {'ok': False, 'errors': [str(exc)]}, 1
    if args.json: print(json.dumps(result, ensure_ascii=False, allow_nan=False))
    elif isinstance(result, dict) and result.get('ok') is False:
        print('\n'.join(result['errors']))
    elif args.command in ['check', 'build-data'] and result.get('ok'):
        print(f"{'데이터 검사 통과' if args.command == 'check' else '생성 완료'}: {result['count']}개 학회")
    elif args.command == 'list' and isinstance(result, list):
        for row in result: print('\t'.join(str(row[k] or '미정') for k in ['id', 'acronym', 'dates', 'status']))
    elif args.command == 'deadlines' and isinstance(result, list):
        for row in result: print(f"{row['id']}\t{row['date']}\tD-{row['days']}\t{row['label']}\t{row['time']}")
    elif args.command == 'gate' and 'changes' in result:
        for row in result['changes']:
            print(f"{row['id']} ({row['acronym']}) {row['url']}")
            print('\n'.join(row['lines']))
        for key in ['failed', 'new_urls']:
            for row in result.get(key, []): print(('받기 실패: ' if key == 'failed' else '기준 없음: ') + str(row))
        if not result['changes']: print(result.get('message', '일정 관련 변경 없음'))
    else: print(dump(result), end='')
    return code


if __name__ == '__main__':
    sys.exit(main())
