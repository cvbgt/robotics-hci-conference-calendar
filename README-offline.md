# confcal 오프라인 꾸러미

압축을 모두 풀고 `index.html`을 더블클릭하세요. 폴더 구조를 유지하면 인터넷과 서버 없이
일정·태그·한국어 장소 검색·상세·쓰는 법을 볼 수 있습니다. 공식 링크를 여는 작업에는 인터넷이 필요합니다.

AI 도구에서 이 폴더를 열고 “AGENTS.md를 읽고 공식 출처로 다음 학회 일정과 마감을 갱신한 뒤
confcal.py show/set/add로 갱신하고 python3 tools/confcal.py check로 검사해 줘”라고 요청하세요. 확인할 수 없는 사실은 미확인으로 남깁니다.
학회 원본은 data/conferences/*.json, 필드 규약은 data/schema.json입니다. 생성본 items.js는 직접 고치지 않습니다.
주간에는 `python3 tools/confcal.py gate --json`의 변경 학회만 확인하고 set/add와 check를 사용합니다.
갱신 후 `python3 tools/confcal.py package`로 공유본을 다시 만들 수 있습니다(Python 3 필요).

라이선스: vendor 각 폴더의 LICENSE 파일을 함께 보존하세요. MiniSearch·Chart.js·Open Color·Pico CSS는 MIT,
Pretendard는 OFL, Lucide는 ISC/MIT 고지를 확인하세요. 학회 명칭과 공식 자료의 권리는 각 소유자에게 있습니다.
출처 링크는 해당 자료의 재배포 권한을 뜻하지 않습니다.
