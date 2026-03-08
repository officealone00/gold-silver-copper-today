import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms = () => (
  <div className="min-h-screen bg-background max-w-lg mx-auto px-5 py-6">
    <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary mb-6">
      <ArrowLeft className="w-4 h-4" /> 돌아가기
    </Link>
    <h1 className="text-xl font-bold mb-2">서비스 이용약관</h1>
    <p className="text-xs text-muted-foreground mb-6">시행일: 2026.02.26</p>

    <div className="space-y-4 text-sm text-foreground leading-relaxed">
      <p>본 서비스는 금, 은, 동 시세 정보 제공 및 계산 기능을 제공합니다.</p>
      <p>제공되는 시세 정보는 참고용이며 실제 거래 가격과 차이가 있을 수 있습니다.</p>
      <p>서비스는 데이터 정확성, 실시간성, 완전성을 보장하지 않습니다.</p>
      <p>외부 데이터 지연 또는 오류로 발생한 손해에 대해 책임지지 않습니다.</p>
      <p>투자 판단은 이용자 본인의 책임입니다.</p>
      <p className="text-muted-foreground">문의: mycall98@gmail.com</p>
    </div>
  </div>
);

export default Terms;
