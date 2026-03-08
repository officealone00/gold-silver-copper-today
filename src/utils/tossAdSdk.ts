/**
 * 토스 앱 WebView 런타임에서 주입되는 GoogleAdMob SDK에 안전하게 접근
 * Lovable 프리뷰/일반 브라우저에서는 null 반환
 */

interface LoadAdMobEvent {
  type: 'loaded';
  data?: unknown;
}

interface ShowAdMobEvent {
  type: 'show' | 'requested' | 'impression' | 'clicked' | 'userEarnedReward' | 'dismissed' | 'failedToShow';
  data?: { unitType?: string; unitAmount?: number };
}

interface AdMobHandlerParams<O, E> {
  options: O;
  onEvent?: (event: E) => void;
  onError?: (reason: unknown) => void;
}

interface LoadFunction {
  (params: AdMobHandlerParams<{ adGroupId: string }, LoadAdMobEvent>): () => void;
  isSupported: () => boolean;
}

interface ShowFunction {
  (params: AdMobHandlerParams<{ adGroupId: string }, ShowAdMobEvent>): () => void;
  isSupported: () => boolean;
}

export interface GoogleAdMobSDK {
  loadAppsInTossAdMob: LoadFunction;
  showAppsInTossAdMob: ShowFunction;
}

/**
 * 토스 SDK의 GoogleAdMob 객체를 가져옵니다.
 * 토스 앱 외부 환경에서는 null을 반환합니다.
 */
export function getGoogleAdMob(): GoogleAdMobSDK | null {
  try {
    // @apps-in-toss/web-framework는 토스 WebView에서 글로벌로 주입됨
    // window 객체에서 직접 접근 시도
    const win = window as unknown as Record<string, unknown>;
    
    // 토스 SDK가 글로벌 스코프에 GoogleAdMob을 노출하는 경우
    if (win.__AppsInToss_GoogleAdMob) {
      return win.__AppsInToss_GoogleAdMob as GoogleAdMobSDK;
    }

    // ES module 방식으로 접근 시도 (빌드된 .ait 에서만 동작)
    // 런타임에서 모듈이 없으면 예외 발생 → catch로 이동
    return null;
  } catch {
    return null;
  }
}

/**
 * 동적 import로 SDK를 가져옵니다.
 * Vite dev 환경에서는 절대 호출되지 않도록 guard 필요
 */
export async function importGoogleAdMob(): Promise<GoogleAdMobSDK | null> {
  // Vite dev 서버에서는 SDK가 없으므로 즉시 null 반환
  if (import.meta.env.DEV) {
    console.warn('[Ad] DEV 환경 - 토스 광고 SDK 비활성화');
    return null;
  }

  try {
    const mod = await import(/* @vite-ignore */ '@apps-in-toss/web-framework');
    return mod.GoogleAdMob ?? null;
  } catch {
    console.warn('[Ad] @apps-in-toss/web-framework 로드 불가');
    return null;
  }
}
