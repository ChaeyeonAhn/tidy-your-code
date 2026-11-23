# Tidy Your Code

냥이가 코드 위를 걸어오면서 한 줄씩 읽는다. 냥이가 밟기 전에, 그 라운드의 냥이 규칙대로 코드를 정리하는 모바일 웹 게임.

- 탭으로 커서를 두고 `⏎ ⇥ ⌫ ␣` (+ 라운드별 규칙 키)만으로 고친다
- 공백과 규칙 문자만 넣고 뺄 수 있어서 코드는 부서지지 않는다
- 라운드 시작마다 냥이 브리핑 + 연습 한 줄 → 코딩 몰라도 플레이 가능
- 목숨 3개, 라운드가 갈수록 규칙이 쌓이고 냥이가 빨라진다

기획: [PLAN.md](./PLAN.md)

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
npm test      # 엔진 테스트 (Vitest)
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/engine/` | 토크나이저, 규칙 5개, 편집 연산, 냥이 상태 머신, 게임 reducer (React 의존 없음) |
| `src/components/` | 에디터, 냥이 스프라이트, 키 바, 브리핑 |
| `src/content/snippets.ts` | 정답 포맷 코드 스니펫 |
| `src/config/balance.ts` | 속도·점수·라운드 구성 등 튜닝 값 |
| `src/styles/tokens.css` | cheney design system 토큰 (복사본) |
