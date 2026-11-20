// search.js — static-derived-doc 블루프린트의 `search` 레이어 (minisearch 7.2.0)
//
// 정본 핀: dashboard-lab ui-assets/records/minisearch.md, 바이트는 vendor/manifest.json 이
// sha256 으로 고정한다. 이 레이어는 페이지가 이미 들고 있는 항목만 메모리에서 색인한다 —
// 빌드된 색인 아티팩트를 싣지 않는다는 블루프린트 exclusion 을 그대로 지킨다.
//
// 강등 규약: 벤더 바이트는 ES 모듈이라 `file://` 에서는 동적 import 가 origin 'null' 로 막힌다.
// 그래서 실패하면 **기존 부분문자열 검색으로 자동 강등**하고, 화면은 지금 어느 모드인지 말한다.
// 로컬 웹 서버(http)로 열면 보강 모드가 켜진다.
//
// 보강 모드는 minisearch 결과를 부분문자열 결과와 **합집합**으로 쓴다. 교체가 아니라 합집합인
// 이유는 실측이다: minisearch 는 공백·구두점으로 토큰을 끊으므로 한국어 합성어 안의 부분
// 일치를 놓친다 — confcal 실데이터에서 "로봇" 이 `한국소프트로봇학회`·`제어로봇시스템학회`·
// `의료로봇` 을 못 찾아 17건이 15건으로 **줄었다**. 검색이 예전보다 덜 찾는 것은 개선이 아니다.
// 합집합이면 다중어 접두어 질의("sensor confer" → 0건에서 1건)는 얻고 재현율은 잃지 않는다.
//
// fuzzy 는 5글자 이상 토큰에만 건다. 짧은 약어에 오타 허용을 걸면 정밀도가 무너진다 —
// 같은 실데이터에서 "IROS" 가 ICCAS·KRoC·UR 까지 끌어와 3건이 6건으로 부풀었다.
(function (global) {
  'use strict';

  var VENDOR = 'vendor/minisearch/7.2.0/index.js';

  function flatten(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(flatten).join(' ');
    if (typeof value === 'object') return Object.values(value).map(flatten).join(' ');
    return String(value);
  }

  // documents  원본 배열 (검색 결과의 id 는 이 배열의 인덱스)
  // fields     색인할 필드 이름
  // extract    (item, index) → { field: value } — 원본에서 색인 텍스트를 뽑는 함수
  // boost      필드별 가중치 (minisearch 모드에서만 의미)
  // onModeChange(mode, note) 모드가 확정/변경될 때 호출 — 보통 재렌더 + 배지 갱신
  function create(opts) {
    var docs = opts.documents || [];
    var fields = opts.fields || [];
    var extract = opts.extract || function (item) { return item; };

    var indexed = docs.map(function (item, i) {
      var source = extract(item, i) || {};
      var row = { id: i };
      fields.forEach(function (f) { row[f] = flatten(source[f]); });
      return row;
    });
    var blobs = indexed.map(function (row) {
      return fields.map(function (f) { return row[f]; }).join(' ').toLowerCase();
    });

    var api = {
      mode: 'substring',
      note: '부분문자열 검색 (file:// 폴백)',
      // 질의 → Map(id → score). 빈 질의는 null(= 필터 없음).
      match: function (query) {
        var q = String(query == null ? '' : query).trim();
        if (!q) return null;
        var out = new Map();
        if (api.mode === 'minisearch') {
          api._ms.search(q).forEach(function (hit) { out.set(hit.id, hit.score); });
        }
        // 부분문자열은 어느 모드에서나 돈다: 보강 모드에서는 합집합의 나머지 절반이고,
        // 강등 모드에서는 전부다. 이미 랭크된 항목의 점수는 덮어쓰지 않는다.
        //
        // 단어별 AND 다 — 질의 전체를 한 덩어리로 찾지 않는다. 실측 근거: targetlab 601개에서
        // "soft robot" 이 구 전체로는 16건, 단어별로는 80건이다(원본 앱이 단어별이었다).
        // 구 전체로 두면 minisearch 와 합쳐도 8건을 잃어 검색이 예전보다 덜 찾게 된다.
        // 단어별 AND 는 구 일치를 포함하므로, 두 원본 동작 어느 쪽의 상위집합이기도 하다.
        var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        blobs.forEach(function (blob, i) {
          if (out.has(i)) return;
          var all = terms.every(function (t) { return blob.indexOf(t) !== -1; });
          if (all) out.set(i, 0);
        });
        return out;
      }
    };

    var announce = typeof opts.onModeChange === 'function' ? opts.onModeChange : function () {};

    import(new URL(VENDOR, document.baseURI).href).then(function (mod) {
      var MiniSearch = mod.default || mod.MiniSearch;
      var ms = new MiniSearch({
        idField: 'id',
        fields: fields,
        storeFields: [],
        searchOptions: {
          prefix: true,                                          // 치는 도중에도 맞는다
          fuzzy: function (term) { return term.length >= 5 ? 0.2 : false; },  // 약어는 정확히
          combineWith: 'AND',                                    // 여러 단어는 모두 만족하는 항목만
          boost: opts.boost || {}
        }
      });
      ms.addAll(indexed);
      api._ms = ms;
      api.mode = 'minisearch';
      api.note = 'minisearch 7.2.0 보강 — 접두어 · 다중어 · 관련도 (부분문자열과 합집합)';
      announce(api.mode, api.note);
    }).catch(function () {
      // 강등은 정상 경로다. 조용히 두지 않고 한 번 알린다.
      announce(api.mode, api.note);
    });

    return api;
  }

  global.ConfcalSearch = { create: create };
})(window);
