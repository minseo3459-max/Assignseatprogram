import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Ticket,
  Share2,
  MessageSquare,
  Play,
  Pause,
  Clock,
  ShieldCheck,
  Download
} from 'lucide-react';
import { TicketingState } from '../types';
import { soundManager } from '../utils/sound';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketingState: TicketingState;
  onToggleTicketing?: () => void;
  classId?: string;
  onGenerateRandomLink?: () => string;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  ticketingState,
  onToggleTicketing,
  classId,
  onGenerateRandomLink,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(true);

  // Generate full absolute URL for student ticketing with classId
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const studentLink = classId
    ? `${baseUrl}?classId=${classId}&mode=student_ticketing`
    : `${baseUrl}?mode=student_ticketing`;

  useEffect(() => {
    if (!studentLink || !isOpen) return;
    setQrLoading(true);
    QRCode.toDataURL(studentLink, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
        setQrLoading(false);
      })
      .catch((err) => {
        console.error('Failed to generate local QR code:', err);
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(studentLink)}`;
        setQrDataUrl(fallbackUrl);
        setQrLoading(false);
      });
  }, [studentLink, isOpen]);

  if (!isOpen) return null;

  const shareText = `📢 [우리반 자리 티켓팅 안내]

별도 로그인 필요 없이 아래 링크로 접속하여 빈 자리에 응모하세요!
1. 본인 이름 선택 및 4자리 PIN 입력 (기본 PIN: 1234)
2. 칠판/창문 위치 확인 후 원하는 자리 선택
3. 응모 확정 클릭!

🔗 학생 전용 티켓팅 링크:
${studentLink}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(studentLink);
      soundManager.playPop();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback copy
      const input = document.createElement('input');
      input.value = studentLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      soundManager.playPop();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      soundManager.playPop();
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleOpenNewTab = () => {
    window.open(studentLink, '_blank');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `student-ticketing-qr-${classId || 'class'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundManager.playPop();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 text-2xl font-bold">
              🎟️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-slate-900">학생 티켓팅 전용 링크</h3>
                {ticketingState.isOpen ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                    🟢 티켓팅 열림
                  </span>
                ) : (
                  <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                    🔴 티켓팅 닫힘
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                이 링크를 학생들에게 공유하면 티켓팅 화면이 바로 열립니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Link URL Display Box */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <span>🔗 학생 접속 전용 URL</span>
              {classId && (
                <span className="bg-indigo-100 text-indigo-700 font-mono text-[10px] px-2 py-0.5 rounded-full border border-indigo-200">
                  학급 코드: {classId}
                </span>
              )}
            </label>

            {onGenerateRandomLink && (
              <button
                onClick={() => {
                  onGenerateRandomLink();
                  soundManager.playFanfare();
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 hover:underline cursor-pointer"
                title="다른 학급 간 간섭 방지를 위해 링크를 랜덤으로 새로 생성합니다"
              >
                <span>🎲 링크 랜덤 새로 생성</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-2xl border-2 border-indigo-200">
            <input
              type="text"
              readOnly
              value={studentLink}
              className="flex-1 bg-transparent px-2 text-xs sm:text-sm font-mono font-bold text-indigo-900 focus:outline-none select-all truncate"
            />

            <button
              onClick={handleCopyLink}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition shadow-md ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>링크 복사</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Toggle & Quick Actions */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-extrabold text-slate-800">티켓팅 상태: </span>
            {ticketingState.isOpen ? (
              <span className="text-emerald-600 font-bold">학생들이 응모할 수 있는 상태입니다.</span>
            ) : (
              <span className="text-rose-600 font-bold">현재 응모가 마감되어 있습니다.</span>
            )}
          </div>

          {onToggleTicketing && (
            <button
              onClick={onToggleTicketing}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center space-x-1 shrink-0 ${
                ticketingState.isOpen
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {ticketingState.isOpen ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>티켓팅 마감하기</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>티켓팅 시작하기</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Share Messenger Text & QR Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Messenger Text Copy */}
          <button
            onClick={handleCopyShareText}
            className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
              copiedText
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>알림톡 / 학급 게시판용 문구</span>
              </span>
              {copiedText ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-700" />
              )}
            </div>
            <p className="text-[11px] text-amber-800 line-clamp-2">
              "📢 [우리반 자리 티켓팅 안내] 아래 링크로 접속하여 원하시는 빈 자리에 응모하세요! ..."
            </p>
            <div className="text-[11px] font-black text-amber-700">
              {copiedText ? '✅ 안내 문구가 복사되었습니다!' : '👉 전체 메시지 복사하기'}
            </div>
          </button>

          {/* QR Code Toggle */}
          <button
            onClick={() => setShowQr(!showQr)}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition flex flex-col justify-between space-y-2 text-slate-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs flex items-center space-x-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>스마트폰 스캔용 QR코드</span>
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {showQr ? '접기' : '보기'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              교실 스크린에 QR코드를 띄워 학생들이 스마트폰으로 스캔하게 합니다.
            </p>
            <div className="text-[11px] font-bold text-indigo-600">
              {showQr ? '▼ QR코드 숨기기' : '👉 QR코드 화면 열기'}
            </div>
          </button>
        </div>

        {/* QR Code Popup Box */}
        {showQr && (
          <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200 border border-slate-800 shadow-xl">
            <div className="bg-white p-3 rounded-2xl shadow-md border-4 border-emerald-400 flex items-center justify-center min-w-[200px] min-h-[200px]">
              {qrLoading ? (
                <div className="w-48 h-48 flex items-center justify-center text-slate-500 font-bold text-xs">
                  <span>QR 코드 생성 중...</span>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Student Ticketing QR Code"
                  className="w-48 h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-500 font-bold text-xs">
                  <span>QR 코드를 불러올 수 없습니다</span>
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-emerald-300">📱 스마트폰 카메라로 QR코드를 스캔하세요!</p>
              <p className="text-[10px] text-slate-400">
                스마트폰으로 카메라를 비추면 바로 학생 응모 화면으로 연결됩니다.
              </p>
            </div>

            {qrDataUrl && !qrLoading && (
              <button
                onClick={handleDownloadQr}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>QR코드 이미지 저장</span>
              </button>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleOpenNewTab}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span>새 탭에서 학생 화면 열기</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
