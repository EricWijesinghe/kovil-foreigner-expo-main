import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// 구독하지 않는 스토어 — 스냅샷이 서버/클라이언트에서 다르다는 사실만 이용한다.
const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // 하이드레이션 여부를 effect+setState로 구하면 렌더가 연쇄된다(react-hooks/set-state-in-effect).
  // 서버 스냅샷 false / 클라이언트 스냅샷 true 로 같은 결과를 렌더 중에 얻는다.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
