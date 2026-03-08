import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy = () => (
  <div className="min-h-screen bg-background max-w-lg mx-auto px-5 py-6">
    <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary mb-6">
      <ArrowLeft className="w-4 h-4" /> 돌아가기
    </Link>
    <h1 className="text-xl font-bold mb-2">개인정보처리방침</h1>
    <p className="text-xs text-muted-foreground mb-6">시행일: 2026.02.26</p>

    <div className="space-y-4 text-sm text-foreground leading-relaxed">
      <p>본 서비스는 회원가입 없이 이용 가능합니다.</p>
      <p>직접적인 개인정보는 수집하지 않습니다.</p>
      <p>서비스 운영 과정에서 접속 로그, 기기 정보 등이 자동 처리될 수 있습니다.</p>
      <p>해당 정보는 서비스 개선 및 안정성 확보 목적으로만 사용됩니다.</p>
      <p className="text-muted-foreground">문의: mycall98@gmail.com</p>
    </div>
  </div>
);

export default Privacy;
