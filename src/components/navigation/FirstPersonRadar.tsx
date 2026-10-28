import { useMemo } from 'react';
import type { Timeline } from '../../services/routeTimeline';
import { sampleTimeline } from '../../services/routeTimeline';
import type { Language } from '../../types/navigation';

interface FirstPersonRadarProps {
  timeline: Timeline;
  progress: number;
  language: Language;
}

const px = (x: number): number => 8 + ((x + 24) / 48) * 124;
const py = (z: number): number => 8 + ((z + 16) / 32) * 124;

/** Small live floor-plan radar aligned to the route and the guide's current timeline sample. */
export function FirstPersonRadar({ timeline, progress, language }: FirstPersonRadarProps) {
  const time = timeline.duration * progress;
  const sample = sampleTimeline(timeline, time);
  const direction = useMemo(() => {
    const active = timeline.segments.find((segment) => segment.kind === 'walk' && segment.t1 >= time && Math.hypot(segment.to.x - segment.from.x, segment.to.z - segment.from.z) > 0.01)
      ?? [...timeline.segments].reverse().find((segment) => segment.kind === 'walk' && Math.hypot(segment.to.x - segment.from.x, segment.to.z - segment.from.z) > 0.01);
    if (!active) return 0;
    return Math.atan2(active.to.x - active.from.x, -(active.to.z - active.from.z)) * 180 / Math.PI;
  }, [timeline, time]);
  const routePath = useMemo(() => {
    const points = timeline.segments.flatMap((segment) => [segment.from, segment.to]);
    return points.map((point, index) => `${index ? 'L' : 'M'} ${px(point.x)} ${py(point.z)}`).join(' ');
  }, [timeline]);
  const level = Math.max(0, Math.min(3, Math.round(sample.level)));

  return (
    <aside className="first-person-radar" aria-label={language === 'hi' ? 'लाइव मार्ग मानचित्र' : 'Live route mini-map'}>
      <svg viewBox="0 0 140 140" role="img" aria-label={language === 'hi' ? 'ऊपर से मार्ग दृश्य' : 'Top-down route view'}>
        <defs><clipPath id="radar-clip"><circle cx="70" cy="70" r="68" /></clipPath></defs>
        <g clipPath="url(#radar-clip)">
          <rect width="140" height="140" fill="rgba(15,29,53,.88)" />
          {[34, 52, 70, 88, 106].map((line) => <g key={line} stroke="rgba(148,190,220,.12)" strokeWidth=".6"><path d={`M ${line} 0 V 140`} /><path d={`M 0 ${line} H 140`} /></g>)}
          <path d={routePath} fill="none" stroke="#0891b2" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity=".45" />
          <path d={routePath} fill="none" stroke="#67e8f9" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <g transform={`translate(${px(sample.x)} ${py(sample.z)}) rotate(${direction})`}>
            <circle r="8.5" fill="rgba(34,211,238,.22)" />
            <path d="M 0 -10 L -5.5 6 L 0 3.5 L 5.5 6 Z" fill="#f8fafc" stroke="#22d3ee" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
      <span className="radar-floor">{language === 'hi' ? `मंज़िल ${level === 0 ? 'G' : level}` : level === 0 ? 'Ground' : `Floor ${level}`}</span>
    </aside>
  );
}
