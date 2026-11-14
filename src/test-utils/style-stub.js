// jest는 CSS를 파싱하지 못한다 — theme.ts가 global.css를 import하므로 스텁이 없으면
// src를 건드리는 모든 테스트가 SyntaxError로 죽는다.
module.exports = {};
