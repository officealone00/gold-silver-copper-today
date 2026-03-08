interface AdBannerProps {
  slot: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * 광고 배너 placeholder 컴포넌트
 * 나중에 토스 애즈 SDK 연동 시 이 컴포넌트 내부만 교체하면 됩니다.
 * 
 * 사용 예:
 * <AdBanner slot="main-between-cards" />
 * <AdBanner slot="calculator-top" size="large" />
 * 
 * 토스 애즈 SDK 연동 시:
 * import { TossAd } from '@apps-in-toss/ad-sdk';
 * <TossAd slotId={slot} />
 */
const AdBanner = ({ slot, size = 'medium', className = '' }: AdBannerProps) => {
  const heightMap = {
    small: 'h-[50px]',
    medium: 'h-[80px]',
    large: 'h-[100px]',
  };

  return (
    <div
      className={`mx-5 rounded-2xl bg-muted/60 border border-dashed border-border flex items-center justify-center ${heightMap[size]} ${className}`}
      data-ad-slot={slot}
    >
      <span className="text-xs text-muted-foreground/50">AD · {slot}</span>
    </div>
  );
};

export default AdBanner;
