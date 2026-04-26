/**
 * 토스 앱 WebView 런타임에서 주입되는 SDK에 안전하게 접근
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

export function getGoogleAdMob(): GoogleAdMobSDK | null {
  try {
    const win = window as unknown as Record<string, unknown>;
    if (win.__AppsInToss_GoogleAdMob) {
      return win.__AppsInToss_GoogleAdMob as GoogleAdMobSDK;
    }
    return null;
  } catch {
    return null;
  }
}

export async function importGoogleAdMob(): Promise<GoogleAdMobSDK | null> {
  if (import.meta.env.DEV) {
    console.warn('[Ad] DEV 환경 - 토스 광고 SDK 비활성화');
    return null;
  }

  try {
    const moduleName = ['@apps-in-toss', 'web-framework'].join('/');
    const mod = await (new Function('m', 'return import(m)'))(moduleName);
    return (mod.GoogleAdMob as GoogleAdMobSDK) ?? null;
  } catch {
    console.warn('[Ad] @apps-in-toss/web-framework 로드 불가');
    return null;
  }
}

/**
 * TossAds (배너 광고용) SDK를 가져옵니다.
 */
export async function importTossAds(): Promise<any | null> {
  if (import.meta.env.DEV) {
    return null;
  }

  try {
    const moduleName = ['@apps-in-toss', 'web-framework'].join('/');
    const mod = await (new Function('m', 'return import(m)'))(moduleName);

    const keys = Object.keys(mod || {}).join(', ');

    if (mod.TossAds) return mod.TossAds;
    if (mod.default?.TossAds) return mod.default.TossAds;

    const win = window as any;
    if (win.TossAds) return win.TossAds;

    return { _debugKeys: keys || 'empty' };
  } catch (e: any) {
    return { _debugKeys: 'ERROR: ' + (e?.message || String(e)) };
  }
}