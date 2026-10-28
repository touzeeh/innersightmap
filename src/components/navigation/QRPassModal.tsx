import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Check, Copy, X } from 'lucide-react';
import type { Destination, Language, RoutePlan } from '../../types/navigation';
import { floorLabel } from '../../services/destinationSearch';

export interface QRPassModalProps {
  language: Language;
  route: RoutePlan;
  destination: Destination;
  onClose: () => void;
}

export function QRPassModal({ language, route, destination, onClose }: QRPassModalProps) {
  const [svg, setSvg] = useState('');
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('start', route.startId);
    url.searchParams.set('destination', destination.id);
    return url.toString();
  }, [route.startId, destination.id]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(shareUrl, { type: 'svg', width: 224, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((code) => { if (!cancelled) setSvg(code); })
      .catch(() => { if (!cancelled) setSvg(''); });
    return () => { cancelled = true; };
  }, [shareUrl]);

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div className="qr-pass-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="qr-pass-modal" role="dialog" aria-modal="true" aria-labelledby="qr-pass-title">
        <header className="qr-pass-head">
          <div><span className="qr-pass-eyebrow">INNER SIGHT WAYFINDING</span><h2 id="qr-pass-title">📱 QR Pass</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={language === 'hi' ? 'बंद करें' : 'Close'}><X size={18} /></button>
        </header>
        <div className="qr-pass-content">
          <div className="qr-pass-code">
            {svg ? <div className="qr-pass-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="qr-pass-loading">{language === 'hi' ? 'QR तैयार हो रहा है…' : 'Preparing QR code…'}</div>}
            <span>{language === 'hi' ? 'रास्ता खोलने के लिए स्कैन करें' : 'Scan to open this route'}</span>
          </div>
          <div className="qr-pass-details">
            <span className="qr-pass-eyebrow">{language === 'hi' ? 'आपका रास्ता' : 'YOUR ROUTE'}</span>
            <h3>{language === 'hi' ? destination.nameHi : destination.name}</h3>
            <p>{floorLabel(destination.level, language)}{destination.roomNumber ? ` · Room ${destination.roomNumber}` : ''}</p>
            <ol>
              {route.instructions.map((instruction) => <li key={instruction.index}>{instruction.text[language]}</li>)}
            </ol>
          </div>
        </div>
        <footer className="qr-pass-footer">
          <button type="button" className="ghost-button" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? (language === 'hi' ? 'लिंक कॉपी हुआ' : 'Link copied') : (language === 'hi' ? 'लिंक कॉपी करें' : 'Copy route link')}</button>
          <button type="button" className="primary-button compact" onClick={onClose}>{language === 'hi' ? 'हो गया' : 'Done'}</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
