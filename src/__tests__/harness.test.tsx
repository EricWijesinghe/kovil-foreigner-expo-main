import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// 이 import들이 곧 하네스 검증이다 — 하나라도 파이프라인이 깨지면 스위트 자체가 로드되지 않는다.
//  · theme        → theme.ts가 global.css를 import한다(CSS 스텁 없으면 SyntaxError)
//  · icon.png     → `@/assets/*` 별칭이 `@/*`에 잠식되면 해석 실패
//  · Collapsible  → reanimated 4(worklets) 로드. jest/resolver.js가 없으면 require 단계에서 죽는다
import { ThemedText } from '@/components/themed-text';
import { Collapsible } from '@/components/ui/collapsible';
import { Colors } from '@/constants/theme';

// 인라인 컴포넌트만 렌더하는 스모크는 위 셋을 전부 통과시켜 버려서 게이트 구실을 못 한다.
describe('테스트 하네스', () => {
  it('RN 컴포넌트를 렌더한다', async () => {
    const { getByText } = await render(<Text>wonjoomin</Text>);

    expect(getByText('wonjoomin')).toBeTruthy();
  });

  it('CSS를 import하는 소스 모듈을 적재한다', () => {
    expect(Colors.light).toBeTruthy();
    expect(Colors.dark).toBeTruthy();
  });

  it('프로젝트 컴포넌트를 렌더한다', async () => {
    const { getByText } = await render(<ThemedText>원주민</ThemedText>);

    expect(getByText('원주민')).toBeTruthy();
  });

  // 별칭 매핑은 tsconfig paths의 "선언 순서"에서 파생된다(jest-expo가 그 순서로 정규식을 만든다).
  // `@/*`를 `@/assets/*` 위로 올리면 여기서 깨진다 — tsc는 통과하므로 이 테스트가 유일한 그물이다.
  it('@/assets 별칭이 @/* 에 잠식되지 않는다', () => {
    // 에셋은 프로젝트 관례대로 require로 가져온다(정적 import는 타입 선언이 없다).
    expect(require('@/assets/images/icon.png')).toBeTruthy();
  });

  it('reanimated에 의존하는 컴포넌트를 렌더한다', async () => {
    const { getByText } = await render(<Collapsible title="접기">내용</Collapsible>);

    expect(getByText('접기')).toBeTruthy();
  });
});
