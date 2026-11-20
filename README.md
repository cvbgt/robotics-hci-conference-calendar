# 로보틱스·HCI 학회 일정 달력

로보틱스·햅틱스·HCI·센서·로봇 학습 학회의 개최일, 논문 제출·등록 마감을 모아 검색하는 정적 웹 달력입니다.
KIISE·BK21 우수학술대회 목록 배지와 CORE 등급, h5 지수, 채택률 등 확인된 평판 지표를 함께 표시합니다.

## 웹에서 보기

GitHub Pages 화면은 **저장소 About 의 웹사이트 링크**에서 여세요.

## 오프라인 사용

저장소 파일을 내려받아 압축을 모두 풀고 `index.html`을 더블클릭하세요.
폴더 구조를 유지하면 인터넷과 서버 없이 검색·필터·상세·쓰는 법을 볼 수 있습니다.
공식 출처 링크를 여는 데는 인터넷이 필요합니다. 실행에는 별도 설치가 필요하지 않습니다.

## AI 에이전트로 갱신

이 폴더를 AI 도구에서 열고 [AGENTS.md](AGENTS.md)를 읽어 공식 출처로 일정을 확인하고
`tools/confcal.py`의 `show`·`set`·`add`로 갱신하도록 요청하세요. 유지보수에는 Python 3 표준 라이브러리만 필요합니다.
생성본을 직접 고치지 말고 원본 수정 후 `python3 tools/confcal.py build-data`로 갱신하세요.

## 기여

학회 하나는 `data/conferences/<id>.json` 파일 하나입니다. 변경할 학회, 바뀐 내용,
공식 출처 URL을 담아 이슈나 PR을 보내세요. 필드는 `data/schema.json`을 따릅니다.
PR을 보내기 전에 다음 명령으로 스키마·날짜 관계·장소 별칭·생성본 신선도를 검사하세요.

```sh
python3 tools/confcal.py check
```

## 데이터 정책

일정과 평판 지표는 공식 출처만 사용하며 근거 링크를 남깁니다. 알 수 없는 값은 **미정**으로 표시합니다.
날짜·시간대·차기 개최판을 추측하지 않습니다. 실제 제출·등록 전에 해당 학회의 공식 공지를 확인하세요.

## 라이선스

- 코드: [MIT](LICENSE).
- `data/conferences/*.json`과 생성 데이터 `data/items.js`·`data/places.js`: [CC BY 4.0](LICENSE-DATA).
- 외부 라이브러리·폰트·아이콘: `vendor/`의 각 라이선스 고지를 보존하세요.
  MiniSearch·Chart.js·Open Color·Pico CSS는 MIT, Pretendard는 OFL, Lucide는 ISC/MIT입니다.
- 학회 명칭과 공식 자료의 권리는 각 소유자에게 있습니다. 출처 링크는 원문 자료의 재배포 허가를 뜻하지 않습니다.

## English

A static calendar for robotics, haptics, HCI, sensors, and robot-learning conferences, with submission and registration
deadlines, KIISE/BK21 excellent-list badges, and reputation signals. Open `index.html` offline or use the website link
in the repository About section. Follow [AGENTS.md](AGENTS.md) to update official-source data with an AI agent.
Contribute one JSON file per conference and run `python3 tools/confcal.py check` before a PR.
Unknown information stays undecided. Code: MIT; conference and generated data: CC BY 4.0; vendor notices apply separately.
