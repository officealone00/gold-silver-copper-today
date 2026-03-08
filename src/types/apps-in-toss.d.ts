/**
 * @apps-in-toss/web-framework 타입 선언
 * 토스 앱 WebView 런타임에서 주입되는 SDK
 */
declare module '@apps-in-toss/web-framework' {
  interface LoadAdMobOptions {
    adGroupId: string;
  }

  interface ShowAdMobOptions {
    adGroupId: string;
  }

  interface LoadAdMobEvent {
    type: 'loaded';
    data?: unknown;
  }

  interface ShowAdMobEvent {
    type: 'show' | 'requested' | 'impression' | 'clicked' | 'userEarnedReward' | 'dismissed' | 'failedToShow';
    data?: {
      unitType?: string;
      unitAmount?: number;
    };
  }

  interface AdMobHandlerParams<O, E> {
    options: O;
    onEvent?: (event: E) => void;
    onError?: (reason: unknown) => void;
  }

  type LoadAdMobParams = AdMobHandlerParams<LoadAdMobOptions, LoadAdMobEvent>;
  type ShowAdMobParams = AdMobHandlerParams<ShowAdMobOptions, ShowAdMobEvent>;

  interface LoadFunction {
    (params: LoadAdMobParams): () => void;
    isSupported: () => boolean;
  }

  interface ShowFunction {
    (params: ShowAdMobParams): () => void;
    isSupported: () => boolean;
  }

  export const GoogleAdMob: {
    loadAppsInTossAdMob: LoadFunction;
    showAppsInTossAdMob: ShowFunction;
  };
}
