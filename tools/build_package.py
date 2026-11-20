#!/usr/bin/env python3
"""서버 없이 열 수 있는 공유 꾸러미를 만들고 개인정보 흔적을 차단한다."""
import datetime as dt
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
if __package__:
    from .package_contents import EXCLUDED, FILES, LEAK_TERMS, leak_gate, prepare
else:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from package_contents import EXCLUDED, FILES, LEAK_TERMS, leak_gate, prepare


def build(root=ROOT):
    output = root / 'output/package'
    target = output / 'confcal-offline'
    prepare(root, target)
    leak_gate(target)
    archive = output / ('confcal-offline-' + dt.date.today().strftime('%Y%m%d') + '.zip')
    # 원본 JSON 100개를 동봉해도 빠르게 재포장하도록 압축 수준을 제한한다.
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=3) as z:
        for p in sorted(target.rglob('*')):
            if p.is_file(): z.write(p, str(Path('confcal-offline') / p.relative_to(target)))
    print(json.dumps({'zip': str(archive.relative_to(root)), 'bytes': archive.stat().st_size, 'files': sum(p.is_file() for p in target.rglob('*')), 'leak_gate': 'PASS'}, ensure_ascii=False))
    return target


if __name__ == '__main__':
    try: build()
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
