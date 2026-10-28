import type { LucideIcon } from 'lucide-react';
import { Armchair, BedDouble, ClipboardList, Pill, Lock, Siren, UserRound, DoorOpen, FlaskConical, ScanLine, Stethoscope, Toilet, ArrowUpDown } from 'lucide-react';
import type { Language } from '../types/navigation';
import type { RoomCategory } from '../types/building';

export interface CategoryMeta {
  label: Record<Language, string>;
  icon: LucideIcon;
  /** Accent used for the category chip. Colour is always paired with the label and icon. */
  accent: string;
}

export const CATEGORY_META: Record<RoomCategory | 'circulation', CategoryMeta> = {
  entrance: { label: { en: 'Entrance', hi: 'प्रवेश' }, icon: DoorOpen, accent: '#b45309' },
  reception: { label: { en: 'Reception', hi: 'रिसेप्शन' }, icon: ClipboardList, accent: '#1d4ed8' },
  emergency: { label: { en: 'Emergency & critical', hi: 'इमरजेंसी व गंभीर देखभाल' }, icon: Siren, accent: '#dc2626' },
  clinical: { label: { en: 'Clinical', hi: 'चिकित्सा' }, icon: Stethoscope, accent: '#1d4ed8' },
  lab: { label: { en: 'Laboratory', hi: 'प्रयोगशाला' }, icon: FlaskConical, accent: '#0e7490' },
  imaging: { label: { en: 'Imaging', hi: 'इमेजिंग' }, icon: ScanLine, accent: '#4338ca' },
  pharmacy: { label: { en: 'Pharmacy', hi: 'फार्मेसी' }, icon: Pill, accent: '#047857' },
  ward: { label: { en: 'Ward', hi: 'वार्ड' }, icon: BedDouble, accent: '#1e40af' },
  waiting: { label: { en: 'Waiting', hi: 'प्रतीक्षा' }, icon: Armchair, accent: '#92400e' },
  washroom: { label: { en: 'Washroom', hi: 'शौचालय' }, icon: Toilet, accent: '#0f766e' },
  staff: { label: { en: 'Staff', hi: 'स्टाफ' }, icon: UserRound, accent: '#334155' },
  restricted: { label: { en: 'Restricted', hi: 'प्रतिबंधित' }, icon: Lock, accent: '#475569' },
  circulation: { label: { en: 'Lift / stairs', hi: 'लिफ्ट / सीढ़ियाँ' }, icon: ArrowUpDown, accent: '#0b1f3a' },
};
