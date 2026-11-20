# confcal 유지보수

목적: 공식 출처로 다음 개최판·제출·등록 일정을 확인하고 비교한다.
Python 3 표준 라이브러리만 필요하다. 브라우저는 `index.html`을 더블클릭한다.

## 필요한 파일만 읽기

- `python3 tools/confcal.py list`: ID·약칭·기간·상태를 한 줄씩 조회한다.
- `python3 tools/confcal.py show icra`: 학회 하나만 읽는다.
- 원본: `data/conferences/<id>.json`. ID는 약칭에서 만든 소문자 슬러그이며 약칭 변경 후에도 유지한다.
- 필드·자료형·허용 값: `data/schema.json`. 날짜는 ISO, 미확인은 null 또는 빈 배열이다.
- 영문 장소의 한국어 검색 별칭: `data/places.json`.
- `data/order.json`은 기존 표시 순서다. CLI가 추가·삭제 시 관리한다.
- `data/items.js`, `data/places.js`는 브라우저용 생성본이다. file://에서도 동작한다.
- 모든 명령에 `--json`을 붙이면 기계가 읽을 JSON을 출력한다.

## 학회 추가 = 공식 확인 → add → check

1. 주최 학회·공식 행사 페이지에서 회차·기간·장소·시간대·절차를 확인한다.
2. `show`로 비슷한 학회 하나를 참고해 새 JSON을 준비한다. 필수 필드는 스키마를 따른다.
3. 출처는 `website`, `sources`에 HTTPS로 남긴다. 평판은 공식 지표 기관 자료만 쓴다.
   미확인 값은 null/빈 배열과 `#확인필요` 태그로 표시한다. 확인일은 notes 또는 해당 repAsOf에 남긴다.
4. 새 영문 도시·지역·국가 토큰은 `data/places.json`에 한국어 별칭을 추가한다.
   괄호 안 행사장을 빼고 쉼표·가운뎃점·슬래시로 나눈다.
5. `python3 tools/confcal.py add new.json` (표준 입력은 `add -`).
   중복 약칭은 거부하고 ID 충돌은 해시 접미사로 피한다. 저장 전 검사하고 생성본을 갱신한다.
6. 아래 검증 명령을 실행한다.

## 날짜 갱신 = show → 공식 원문 → set → check

```sh
python3 tools/confcal.py show icra
python3 tools/confcal.py set icra 'start="2027-05-24"' 'end="2027-05-28"' 'dates="2027.05.24 – 05.28"'
python3 tools/confcal.py set icra 'regDeadline="2027-03-31"' 'timezone="Asia/Seoul"'
```

- `field=value`는 JSON 값 또는 일반 문자열이다. 셸에서는 인자를 작은따옴표로 감싼다.
- 중첩 객체·배열은 `future.0.location="Seoul, Korea"`처럼 점 경로로 지정한다.
  없는 중간 객체·배열은 자동 생성하지 않는다. 배열 전체 교체도 가능하다.
- start/end/dates·관련 마감·paperProcess를 함께 맞춘다. sources·notes의 근거도 갱신한다.
- 끝난 판은 다음 공식 발표판으로 옮기고, 현재판이 된 future 항목은 제거한다.
- paperProcess는 `논문 마감 2027-10-22`처럼 쓴다. 범위는 `2027-10-01~10-22`.
  별개 일정은 ` · ` 또는 세미콜론으로 나누고 연도를 다시 쓴다. 날짜 뒤에 시각·시간대를 쓴다.
  날짜 없는 설명은 허용된다. 통보·개시일은 행동 마감에 포함하지 않는다.
- 삭제: `python3 tools/confcal.py remove <id>`.
- 원본 JSON을 직접 수정했다면 `python3 tools/confcal.py build-data`로 생성본을 갱신한다.

## 주간 점검 = gate → 변경 학회만 확인 → set/add → check → accept

```sh
python3 tools/confcal.py gate --seed
python3 tools/confcal.py gate --json
python3 tools/confcal.py deadlines --days 30 --json
```

- 첫 실행에서만 `--seed`. 비교 상태는 `output/source-watch/`에 저장한다.
- gate는 변경 학회의 ID·출처·변경 줄만 전달한다. 전체 items.js를 읽지 않는다.
- 종료코드 0: 변화 없음, 10: 변경·새 출처·받기 실패 검토 필요, 2: 기준 없음/시드 실패.
  받기 실패는 확인 완료가 아니다. 새 출처만 기준 추가는 `gate --seed-new`다.
- 공식 원문 확인과 수정·검증을 마친 뒤에만 `python3 tools/confcal.py gate --accept`.
- deadlines는 UI와 같은 행동·범위·통보 제외 규칙을 사용한다. `--today YYYY-MM-DD`로 재현한다.
- 반복 요청: “confcal.py gate --json 결과의 변경 학회만 공식 원문으로 확인하고,
  show/set/add로 갱신한 뒤 check에 통과하면 검토한 기준을 accept해 줘.”
- 예약은 수신자 기기에서 선택한다. 기존 check_data.py·source_gate.py 진입점도 유지한다.

## 금지

- 생성본 `data/items.js`·`data/places.js`를 손으로 고치지 않는다.
- 날짜·시간대·해넘김·향후 개최판을 추측하지 않는다. 검색 요약·사진을 근거로 쓰지 않는다.
- 비공식 출처·HTTP 링크·문자열 HTML·임의 상태/등급 태그를 추가하지 않는다.
- `vendor/` 라이선스 고지를 삭제하지 않는다.
- 다른 작업의 변경을 되돌리거나 원격 게시하지 않는다.

## 한 번의 검증 명령

```sh
python3 tools/confcal.py check
```

스키마·관계 규칙·장소 별칭·생성본 신선도를 함께 검사한다.
공유본 만들기: `python3 tools/confcal.py package` (검사와 공유 금지 문자열 관문 포함).
결과: `output/package/confcal-offline/` 및 날짜가 붙은 zip. 원격 게시 없이 zip을 전달한다.
UI 변경 시 검색(서울)·태그·상세·쓰는 법을 밝고 어두운 테마·작은 화면·file://에서 확인한다.
개발 저장소 전체 검사는 `python3 -m unittest`, 각 `tests/*.cjs`를 Node로 포그라운드 실행한다.
