#!/usr/bin/env python3
"""표준 라이브러리만으로 학회 데이터와 장소 별칭을 검사한다."""
import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / 'data/schema.json').read_text(encoding='utf-8'))
CATEGORIES = set(SCHEMA['properties']['category']['enum'])


def python_literal(text):
    import ast
    return ast.literal_eval(text)


class LiteralParser:
    """JS 데이터 리터럴만 읽는다. 실행식·함수·보간·중복 키는 거부한다."""
    token = re.compile(r'''\s+|//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|-?\d+(?:\.\d+)?|[A-Za-z_$][\w$]*|[][{},:]''')

    def __init__(self, text):
        self.tokens = []
        pos = 0
        while pos < len(text):
            m = self.token.match(text, pos)
            if not m:
                raise ValueError('지원하지 않는 JS 구문: ' + text[pos:pos+24])
            t = m[0]
            pos = m.end()
            if not t.isspace() and not t.startswith(('//', '/*')):
                self.tokens.append(t)
        self.i = 0

    def pop(self):
        t = self.tokens[self.i]
        self.i += 1
        return t

    def value(self):
        t = self.pop()
        if t in ('[', '{'):
            obj = [] if t == '[' else {}
            end = ']' if t == '[' else '}'
            while self.tokens[self.i] != end:
                if t == '[':
                    obj.append(self.value())
                else:
                    key = self.pop()
                    key = python_literal(key) if key[0] in "\"'" else key
                    if self.pop() != ':' or key in obj:
                        raise ValueError('잘못된 키 또는 중복 키: ' + key)
                    obj[key] = self.value()
                if self.tokens[self.i] == end:
                    break
                if self.pop() != ',':
                    raise ValueError('쉼표 누락')
            self.pop()
            return obj
        if t in ('null', 'true', 'false'):
            return {'null': None, 'true': True, 'false': False}[t]
        if t[0] in "\"'" or re.fullmatch(r'-?\d+(?:\.\d+)?', t):
            return python_literal(t)
        raise ValueError('실행식은 허용하지 않음: ' + t)


def literal(text):
    parser = LiteralParser(text)
    value = parser.value()
    if parser.i != len(parser.tokens):
        raise ValueError('리터럴 뒤 불필요한 구문')
    return value


def load_items(path):
    text = Path(path).read_text(encoding='utf-8')
    m = re.search(r'window\.DATA\s*=\s*', text)
    if not m:
        raise ValueError('window.DATA 할당 없음')
    return literal(text[m.end():].strip().removesuffix(';'))


def aliases(path):
    text = Path(path).read_text(encoding='utf-8')
    body = re.search(r'const aliases\s*=\s*({[\s\S]*?})\s*;', text)
    return {k.lower(): v for k, v in literal(body[1]).items()}


def date_ok(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return False
    try:
        dt.date.fromisoformat(value)
        return True
    except ValueError:
        return False


def deadline_errors(text):
    """ISO/점/슬래시 날짜와 같은 절의 MM-DD 범위·및 표기를 검사한다."""
    errors = []
    for part in re.split(r'\s+·\s+|[;；\n]', text):
        year = None
        previous = None
        pattern = r'(?<![\d-])(?:(\d{4})[-./])?(\d{1,2})[-./](\d{1,2})(?![\d-])'
        for m in re.finditer(pattern, part):
            year = m[1] or year
            if not year:
                errors.append('축약 날짜에 연도가 없음: ' + m[0])
                continue
            iso = f'{year}-{int(m[2]):02d}-{int(m[3]):02d}'
            if not date_ok(iso):
                errors.append('유효하지 않은 마감 날짜: ' + m[0])
            if previous and re.fullmatch(r'\s*[~–—-]\s*', part[previous[1]:m.start()]) and iso < previous[0]:
                errors.append('역순 날짜 범위: ' + part)
            previous = (iso, m.end())
    return errors


def schema_errors(value, spec, at='학회'):
    """schema.json에서 사용하는 2020-12 키워드만 해석한다(외부 의존성 없음)."""
    errors = []
    types = {'null': lambda v: v is None, 'string': lambda v: isinstance(v, str),
             'integer': lambda v: type(v) is int,
             'number': lambda v: type(v) in (int, float),
             'object': lambda v: isinstance(v, dict), 'array': lambda v: isinstance(v, list)}
    expected = spec.get('type')
    if expected and not any(types[t](value) for t in ([expected] if isinstance(expected, str) else expected)):
        return [at + ': 자료형 오류 (' + str(expected) + ')']
    if 'enum' in spec and not any(type(value) is type(v) and value == v for v in spec['enum']):
        errors.append(at + ': 허용 값 오류 ' + str(spec['enum']))
    if value is None:
        return errors
    if isinstance(value, str):
        if len(value) < spec.get('minLength', 0): errors.append(at + ': 빈 값 금지')
        if 'pattern' in spec and not re.search(spec['pattern'], value): errors.append(at + ': 문자열 형식 오류')
        if spec.get('format') == 'date' and not date_ok(value): errors.append(at + ': ISO 날짜 오류')
        if spec.get('format') == 'uri':
            try:
                u = urlsplit(value)
                ok = u.scheme == 'https' and u.hostname and not re.search(r'\s|[<>\x00-\x1f\x7f]', value)
                u.port  # 잘못된 포트도 거부한다.
            except ValueError: ok = False
            if not ok: errors.append(at + ': HTTPS URL 필요')
    if type(value) in (int, float):
        for key, bad in [('minimum', lambda x: value < x), ('maximum', lambda x: value > x),
                         ('exclusiveMinimum', lambda x: value <= x)]:
            if key in spec and bad(spec[key]): errors.append(at + ': 숫자 범위 오류')
    if isinstance(value, list):
        for i, v in enumerate(value): errors.extend(schema_errors(v, spec.get('items', {}), f'{at}[{i}]'))
    if isinstance(value, dict):
        props = spec.get('properties', {})
        for k in spec.get('required', []):
            if k not in value: errors.append(at + ': 필수 필드 누락 ' + k)
        for k, v in value.items():
            if k not in props and spec.get('additionalProperties') is False: errors.append(at + ': 알 수 없는 필드 ' + k)
            elif k in props: errors.extend(schema_errors(v, props[k], at + '.' + k))
    return errors


def validate(items, place_aliases, schema=None):
    """구조는 JSON Schema, 출처·날짜 관계는 아래 의미 규칙으로 검사한다."""
    if not isinstance(items, list): return ['DATA 배열 필요']
    errors, seen = [], set()
    def walk(value, at):
        if isinstance(value, str) and re.search(r'<[^>]*>', value): errors.append(at + ': HTML 금지')
        elif isinstance(value, list):
            for i, v in enumerate(value): walk(v, f'{at}[{i}]')
        elif isinstance(value, dict):
            for k, v in value.items(): walk(v, at + '.' + k)
    for i, d in enumerate(items):
        at = f'항목 {i+1}'
        errors.extend(schema_errors(d, schema or SCHEMA, at))
        if not isinstance(d, dict): continue
        at += ' ' + str(d.get('acronym', '?'))
        walk(d, at)
        name = str(d.get('acronym', '')).strip().casefold()
        if not name or name in seen: errors.append(at + ': 약칭 중복/비어 있음')
        seen.add(name)
        if d.get('start') and d.get('end') and str(d['start']) > str(d['end']): errors.append(at + ': 개최일 역순')
        if any(d.get(k) is not None for k in ['core', 'h5', 'acceptRate']) and not d.get('repSources'): errors.append(at + ': 평판 출처 필요')
        process = d.get('paperProcess', [])
        for text in process if isinstance(process, list) else []:
            if isinstance(text, str): errors.extend(at + ': ' + e for e in deadline_errors(text))
        locations = [d.get('location')]
        future = d.get('future', [])
        for f in future if isinstance(future, list) else []:
            if not isinstance(f, dict): continue
            locations.append(f.get('location'))
            if isinstance(f.get('dates'), str): errors.extend(at + ': ' + e for e in deadline_errors(f['dates']))
        for location in locations:
            for token in re.split(r'[,·/]', re.sub(r'\([^)]*\)', '', str(location or ''))):
                token = token.strip()
                if re.search(r'[a-z]', token, re.I) and not re.search(r'[가-힣]', token) and not re.search(r'[가-힣]', place_aliases.get(token.lower(), '')): errors.append(at + ': 장소 별칭 누락 ' + token)
    return errors


def main():
    # 스크립트 실행도 동일 검사 모듈을 재사용한다.
    if not __package__: sys.modules.setdefault('check_data', sys.modules[__name__])
    if __package__:
        from .confcal import check
    else:
        from confcal import check
    try: errors = check(ROOT)
    except (ValueError, OSError, IndexError, TypeError) as exc: errors = ['데이터 읽기 실패: ' + str(exc)]
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print('데이터 검사 통과')
    return 0


if __name__ == '__main__':
    sys.exit(main())
