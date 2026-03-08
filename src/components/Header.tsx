import { RefreshCw } from 'lucide-react';
import { formatDate } from '@/utils/formatNumber';

interface HeaderProps {
  collectedAt: string;
  onRefresh: () => void;
}

const Header = ({ collectedAt, onRefresh }: HeaderProps) => {
  const date = new Date(collectedAt);
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        오늘 금·은·동 시세
      </h1>
      <div className="flex items-center justify-between mt-2">
        <div className="text-sm text-muted-foreground">
          <span>{formatDate(date)} 기준</span>
          <span className="ml-2">업데이트 {timeStr}</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-card hover:bg-muted transition-colors"
          aria-label="시세 업데이트"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default Header;
