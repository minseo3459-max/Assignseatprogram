import React, { useState } from 'react';
import { downloadElementAsImage } from '../utils/classroom';
import { Download, Printer, X, Check, Image as ImageIcon, Sparkles } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  defaultTitle?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  defaultTitle = '우리반 자리 배치표',
}) => {
  const [chartTitle, setChartTitle] = useState(defaultTitle);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      const sanitizedTitle = chartTitle.trim().replace(/[/\\?%*:|"<>]/g, '_') || '자리_배치표';
      await downloadElementAsImage(canvasRef.current, `${sanitizedTitle}.png`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      alert('이미지 다운로드 도중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">자리 배치표 이미지 저장</h3>
              <p className="text-xs text-slate-500">선명한 고화질 PNG 파일로 저장합니다.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              배치표 제목 설정
            </label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              placeholder="예: 2026학년도 1학기 3반 자리 배치표"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 border border-slate-200 space-y-1">
            <div className="font-semibold text-slate-800">📌 저장 안내</div>
            <div>• 칠판, 창문, 복도 위치와 학생 이름이 모두 포함된 선명한 고해상도 이미지입니다.</div>
            <div>• 프린터 인쇄를 원하시면 [인쇄하기] 버튼을 눌러주세요.</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>인쇄하기</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <span className="animate-pulse">저장 중...</span>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>저장 완료!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>PNG 다운로드</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
