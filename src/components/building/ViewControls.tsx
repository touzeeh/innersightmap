import { Building2, Crosshair, Eye, EyeOff, Footprints, MapPin, RotateCcw, RotateCw, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { FLOORS } from '../../data/floors';
import { tr } from '../../i18n/strings';
import type { Level } from '../../types/building';
import type { CameraMode, Language } from '../../types/navigation';

interface ViewControlsProps {
  language: Language;
  floorVisible: readonly boolean[];
  focusLevel: Level | null;
  explode: number;
  cutaway: boolean;
  lowDetail: boolean;
  cameraMode: CameraMode;
  autoRotate: boolean;
  onToggleFloor: (level: Level) => void;
  onSolo: (level: Level | null) => void;
  onExplode: (value: number) => void;
  onCamera: (mode: CameraMode, focusLevel?: Level | null) => void;
  onCutaway: (value: boolean) => void;
  onLowDetail: (value: boolean) => void;
  onResetCamera: () => void;
  onToggleAutoRotate: () => void;
}

/** Compact vertical floor lift: every button changes the active building level. */
export function FloorSelector(props: Pick<ViewControlsProps, 'language' | 'floorVisible' | 'focusLevel' | 'onToggleFloor' | 'onSolo'>) {
  const { language, floorVisible, focusLevel, onToggleFloor, onSolo } = props;
  const allVisible = floorVisible.every(Boolean);
  const ordered = [...FLOORS].reverse();
  return (
    <section className="floor-dock" aria-label={tr('floorsHeading', language)}>
      <button type="button" className={`dock-floor dock-floor-all${allVisible ? ' is-on' : ''}`} onClick={() => onSolo(null)} aria-pressed={allVisible} title={tr('showAllFloors', language)}>ALL</button>
      {ordered.map((floor) => {
        const visible = floorVisible[floor.level];
        const focused = focusLevel === floor.level;
        const name = language === 'hi' ? floor.nameHi : floor.name;
        return (
          <div className={`dock-floor-row${focused ? ' is-current' : ''}${visible ? '' : ' is-hidden'}`} key={floor.level}>
            <button type="button" className="dock-floor" onClick={() => onSolo(floor.level)} aria-label={`${tr('soloFloor', language)}: ${name}`} aria-pressed={focused} title={name}>
              <span className="dock-floor-level">{floor.label === 'G' ? 'G' : `F${floor.label}`}</span>
              <span className="dock-floor-name">{name}</span>
            </button>
            <button type="button" className="dock-floor-visibility" onClick={() => onToggleFloor(floor.level)} aria-label={`${visible ? tr('hideFloor', language) : tr('showFloor', language)}: ${name}`} aria-pressed={visible} title={visible ? tr('hideFloor', language) : tr('showFloor', language)}>
              {visible ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
            </button>
          </div>
        );
      })}
    </section>
  );
}

/** Right-side camera preset dock plus a tucked-away panel for scene controls. */
export function CameraControls(props: Pick<ViewControlsProps, 'language' | 'cameraMode' | 'explode' | 'cutaway' | 'lowDetail' | 'autoRotate' | 'onCamera' | 'onExplode' | 'onCutaway' | 'onLowDetail' | 'onResetCamera' | 'onToggleAutoRotate'>) {
  const { language, cameraMode, explode, cutaway, lowDetail, autoRotate, onCamera, onExplode, onCutaway, onLowDetail, onResetCamera, onToggleAutoRotate } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const modes: { mode: CameraMode; label: string; Icon: typeof Building2 }[] = [
    { mode: 'overview', label: language === 'hi' ? '3D आइसोमेट्रिक' : '3D Isometric', Icon: Building2 },
    { mode: 'topdown', label: language === 'hi' ? 'ऊपर से दृश्य' : '2D Top', Icon: Crosshair },
    { mode: 'follow', label: tr('cameraFollow', language), Icon: Footprints },
    { mode: 'closeup', label: tr('cameraCloseup', language), Icon: MapPin },
  ];
  return (
    <section className="camera-dock" aria-label={tr('viewHeading', language)}>
      <div className="camera-presets">
        {modes.map(({ mode, label, Icon }) => (
          <button key={mode} type="button" className={`camera-preset${cameraMode === mode ? ' is-on' : ''}`} aria-label={label} title={label} aria-pressed={cameraMode === mode} onClick={() => onCamera(mode)}>
            <Icon size={17} aria-hidden="true" />
          </button>
        ))}
        <span className="dock-divider" aria-hidden="true" />
        <button type="button" className={`camera-preset${autoRotate ? ' is-on' : ''}`} aria-label={language === 'hi' ? 'ऑटो रोटेशन' : 'Auto-Rotate'} title={language === 'hi' ? 'ऑटो रोटेशन' : 'Auto-Rotate'} aria-pressed={autoRotate} onClick={onToggleAutoRotate}>
          <RotateCw size={17} aria-hidden="true" />
        </button>
        <button type="button" className="camera-preset" aria-label={tr('resetCamera', language)} title={tr('resetCamera', language)} onClick={onResetCamera}>
          <RotateCcw size={17} aria-hidden="true" />
        </button>
        <button type="button" className={`camera-preset${settingsOpen ? ' is-on' : ''}`} aria-label={language === 'hi' ? 'दृश्य सेटिंग' : 'Scene settings'} title={language === 'hi' ? 'दृश्य सेटिंग' : 'Scene settings'} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>
          <SlidersHorizontal size={17} aria-hidden="true" />
        </button>
      </div>
      {settingsOpen ? <div className="camera-settings">
        <label className="slider"><span>{tr('explode', language)}</span><input type="range" min={0} max={100} value={Math.round(explode * 100)} onChange={(e) => onExplode(Number(e.target.value) / 100)} aria-valuetext={`${Math.round(explode * 100)}%`} /></label>
        <label className="switch"><input type="checkbox" checked={cutaway} onChange={(e) => onCutaway(e.target.checked)} /><span>{tr('cutaway', language)}</span></label>
        <label className="switch"><input type="checkbox" checked={lowDetail} onChange={(e) => onLowDetail(e.target.checked)} /><span>{tr('lowDetail', language)}</span></label>
      </div> : null}
    </section>
  );
}
