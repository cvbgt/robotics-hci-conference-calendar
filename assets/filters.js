// 목록 등재와 분야의 다중 태그 필터. DOM·저장소와 분리해 file://에서도 같은 규칙을 쓴다.
(function (global) {
  'use strict';
  const UMBRELLAS = ["로봇", "메카트로닉스", "햅틱", "HCI", "센서", "의료·재활", "톱티어", "확인필요", "AI·학습", "비전", "그래픽스", "시스템·네트워크"];
  const TAG_MAP = {
    "로봇": "로봇", "휴머노이드": "로봇", "소프트로봇": "로봇", "HRI": "로봇", "학습": "AI·학습", "강화학습": "AI·학습", "로봇비전": "비전", "VR": "그래픽스", "생체모사": "로봇",
    "메카트로닉스": "메카트로닉스", "자동화": "메카트로닉스", "제어": "메카트로닉스", "정밀공학": "메카트로닉스", "산업": "메카트로닉스", "도구": "메카트로닉스",
    "액추에이터": "메카트로닉스", "EAP": "메카트로닉스", "전기접착": "메카트로닉스",
    "햅틱": "햅틱",
    "HCI": "HCI", "인터페이스": "HCI", "웨어러블": "HCI",
    "센서": "센서", "나노": "센서", "MEMS": "센서", "유연전자": "센서", "촉각센서": "센서",
    "의료로봇": "의료·재활", "재활": "의료·재활",
    "톱티어": "톱티어", "플래그십": "톱티어",
    "확인필요": "확인필요", "#확인필요": "확인필요",
  };
  function umbrellasFor(item) {
    const set = new Set();
    (item.tags || []).forEach(t => { const u = TAG_MAP[t] || (UMBRELLAS.includes(t) ? t : null); if (u) set.add(u); });
    return UMBRELLAS.filter(u => set.has(u));
  }


  const TIERS = ['최우수', '우수'];
  function tierFor(item) {
    if (item.kiise === '최우수') return '최우수';
    return item.kiise === '우수' || item.bk21 === true ? '우수' : null;
  }
  function matchesTags(item, tiers = [], keywords = []) {
    return (!tiers.length || tiers.includes(tierFor(item)))
      && (!keywords.length || umbrellasFor(item).some(t => keywords.includes(t)));
  }
  // 같은 그룹의 선택은 무시하고 반대 그룹에 맞는 학회를 센다. 일정 숨김은 포함하지 않는다.
  function countTags(items, tiers = [], keywords = []) {
    const counts = Object.fromEntries([...TIERS, ...UMBRELLAS].map(t => [t, 0]));
    for (const item of items) {
      const tier = tierFor(item);
      if (tier && matchesTags(item, [], keywords)) counts[tier]++;
      if (matchesTags(item, tiers, [])) for (const tag of umbrellasFor(item)) counts[tag]++;
    }
    return counts;
  }
  function cleanState(raw, categories) {
    const state = raw && typeof raw === 'object' ? raw : {};
    const tags = (values, allowed) => Array.isArray(values) ? [...new Set(values.filter(t => allowed.includes(t)))] : [];
    return {
      category: categories.includes(state.category) ? state.category : null,
      tiers: tags(state.tiers, TIERS), keywords: tags(state.keywords, UMBRELLAS),
      hidePast: state.hidePast !== false, hideTbd: state.hideTbd !== false,
      tierOnly: state.tierOnly === true
    };
  }
  global.ConferenceTags = {UMBRELLAS, TIERS, umbrellasFor, tierFor, matchesTags, countTags, cleanState};
})(window);
