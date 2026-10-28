/**
 * Room definitions for the fictional hospital. Each room is placed into a
 * planning block from data/layout.ts and opens onto a corridor junction.
 *
 * To add a room: pick an unused block for its floor, give it a door point on
 * that block's wall, and point `junction` at a junction on the corridor the
 * door faces. The navigation graph and 3D model are generated from this data.
 */
import type { RoomDef } from '../types/building';

export const ROOMS: readonly RoomDef[] = [
  // ───────────── Ground floor ─────────────
  { id: 'G-ENT', level: 0, name: 'Main Entrance Hall', nameHi: 'मुख्य प्रवेश द्वार', category: 'entrance', block: 'CSF_C', door: [0, -9.5], junction: [0, -8], exteriorDoor: [0, -15.5] },
  { id: 'G-REC', level: 0, name: 'Reception', nameHi: 'रिसेप्शन', roomNumber: 'G-01', category: 'reception', block: 'CSF_W', door: [-12, -9.5], junction: [-12, -8] },
  { id: 'G-REG', level: 0, name: 'Registration Desk', nameHi: 'पंजीकरण काउंटर', roomNumber: 'G-02', category: 'reception', block: 'CSF_E', door: [12, -9.5], junction: [12, -8] },
  { id: 'G-EMG', level: 0, name: 'Emergency Ward', nameHi: 'इमरजेंसी वार्ड', roomNumber: 'E-01', category: 'emergency', block: 'WW1', door: [-17.5, -12], junction: [-16, -12] },
  { id: 'G-TRI', level: 0, name: 'Emergency Triage', nameHi: 'इमरजेंसी ट्रायज', roomNumber: 'E-02', category: 'emergency', block: 'WW2', door: [-17.5, -4], junction: [-16, -4] },
  { id: 'G-PHM', level: 0, name: 'Pharmacy', nameHi: 'फार्मेसी', roomNumber: 'G-05', category: 'pharmacy', block: 'EW1', door: [17.5, -12], junction: [16, -12] },
  { id: 'G-WTG', level: 0, name: 'General Waiting Area', nameHi: 'सामान्य प्रतीक्षा क्षेत्र', category: 'waiting', block: 'CNE', door: [12, 1.5], junction: [12, 0] },
  { id: 'G-WC', level: 0, name: 'Public Washroom', nameHi: 'सार्वजनिक शौचालय', category: 'washroom', block: 'CNW', door: [-12, 1.5], junction: [-12, 0] },

  // ───────────── Floor 1 · OPD ─────────────
  { id: '1-OPD', level: 1, name: 'OPD Reception', nameHi: 'ओपीडी रिसेप्शन', roomNumber: '101', category: 'clinical', block: 'CNF1', door: [-12, 9.5], junction: [-12, 8] },
  { id: '1-C102', level: 1, name: 'Consultation Room', nameHi: 'परामर्श कक्ष', roomNumber: '102', category: 'clinical', block: 'CNF2', door: [0, 9.5], junction: [0, 8] },
  { id: '1-C103', level: 1, name: 'Consultation Room', nameHi: 'परामर्श कक्ष', roomNumber: '103', category: 'clinical', block: 'CNF3', door: [12, 9.5], junction: [12, 8] },
  { id: '1-DOC', level: 1, name: "Doctors' Room", nameHi: 'डॉक्टर्स रूम', roomNumber: '104', category: 'clinical', block: 'CNW', door: [-12, 1.5], junction: [-12, 0] },
  { id: '1-OWT', level: 1, name: 'OPD Waiting Area', nameHi: 'ओपीडी प्रतीक्षा क्षेत्र', category: 'waiting', block: 'CNE', door: [12, 1.5], junction: [12, 0] },
  { id: '1-PATH', level: 1, name: 'Pathology Laboratory', nameHi: 'पैथोलॉजी प्रयोगशाला', roomNumber: '105', category: 'lab', block: 'CSN_W', door: [-12, -1.5], junction: [-12, 0] },
  { id: '1-BLC', level: 1, name: 'Blood Collection', nameHi: 'ब्लड कलेक्शन', roomNumber: '106', category: 'lab', block: 'CSN_E', door: [12, -1.5], junction: [12, 0] },
  { id: '1-WC', level: 1, name: 'Washroom', nameHi: 'शौचालय', category: 'washroom', block: 'CSF_W', door: [-12, -9.5], junction: [-12, -8] },
  { id: '1-DOC2', level: 1, name: "Doctors' Room", nameHi: 'डॉक्टर्स रूम', roomNumber: '107', category: 'clinical', block: 'EW3', door: [17.5, 4], junction: [16, 4] },

  // ───────────── Floor 2 · Diagnostics ─────────────
  { id: '2-BB', level: 2, name: 'Blood Bank', nameHi: 'ब्लड बैंक', roomNumber: '201', category: 'lab', block: 'WW3', door: [-17.5, 4], junction: [-16, 4] },
  { id: '2-XR', level: 2, name: 'Diagnostic Imaging', nameHi: 'डायग्नोस्टिक इमेजिंग', roomNumber: '202', category: 'imaging', block: 'CNW', door: [-12, 1.5], junction: [-12, 0] },
  { id: '2-RAD', level: 2, name: 'Radiology (CT & MRI)', nameHi: 'रेडियोलॉजी (सीटी व एमआरआई)', roomNumber: '203', category: 'imaging', block: 'CNF1', door: [-12, 9.5], junction: [-12, 8] },
  { id: '2-REC', level: 2, name: 'Medical Records', nameHi: 'मेडिकल रिकॉर्ड्स', roomNumber: '204', category: 'staff', block: 'CSN_E', door: [12, -1.5], junction: [12, 0] },
  { id: '2-SMP', level: 2, name: 'Sample Processing', nameHi: 'सैंपल प्रोसेसिंग', roomNumber: '206', category: 'lab', block: 'CSN_W', door: [-12, -1.5], junction: [-12, 0] },
  { id: '2-STF', level: 2, name: 'Staff Room', nameHi: 'स्टाफ रूम', roomNumber: '205', category: 'staff', block: 'EW1', door: [17.5, -12], junction: [16, -12] },
  { id: '2-WC', level: 2, name: 'Washroom', nameHi: 'शौचालय', category: 'washroom', block: 'CSF_W', door: [-12, -9.5], junction: [-12, -8] },
  { id: '2-RES', level: 2, name: 'Restricted Radiation Store', nameHi: 'प्रतिबंधित विकिरण भंडार', roomNumber: 'R-01', category: 'restricted', block: 'CSF_E', door: [12, -9.5], junction: [12, -8], publicAccess: false },

  // ───────────── Floor 3 · Inpatient care ─────────────
  { id: '3-ICU', level: 3, name: 'Intensive Care Unit (ICU)', nameHi: 'गहन चिकित्सा इकाई (आईसीयू)', roomNumber: '301', category: 'emergency', block: 'CNF3', door: [12, 9.5], junction: [12, 8] },
  { id: '3-W302', level: 3, name: 'Inpatient Ward A', nameHi: 'इनपेशेंट वार्ड ए', roomNumber: '302', category: 'ward', block: 'CNE', door: [12, 1.5], junction: [12, 0] },
  { id: '3-W303', level: 3, name: 'Inpatient Ward B', nameHi: 'इनपेशेंट वार्ड बी', roomNumber: '303', category: 'ward', block: 'EW3', door: [17.5, 4], junction: [16, 4] },
  { id: '3-CARD', level: 3, name: 'Cardiology', nameHi: 'कार्डियोलॉजी', roomNumber: '304', category: 'clinical', block: 'CNF2', door: [0, 9.5], junction: [0, 8] },
  { id: '3-NEU', level: 3, name: 'Neurology', nameHi: 'न्यूरोलॉजी', roomNumber: '305', category: 'clinical', block: 'CSC', door: [0, -1.5], junction: [0, 0] },
  { id: '3-TRT', level: 3, name: 'Treatment Room', nameHi: 'ट्रीटमेंट रूम', roomNumber: '306', category: 'clinical', block: 'CSN_W', door: [-12, -1.5], junction: [-12, 0] },
  { id: '3-NRS', level: 3, name: 'Nurse Station', nameHi: 'नर्स स्टेशन', category: 'staff', block: 'CSN_E', door: [12, -1.5], junction: [12, 0] },
  { id: '3-TRT2', level: 3, name: 'Treatment Room', nameHi: 'ट्रीटमेंट रूम', roomNumber: '307', category: 'clinical', block: 'EW2', door: [17.5, -4], junction: [16, -4] },
  { id: '3-WC', level: 3, name: 'Washroom', nameHi: 'शौचालय', category: 'washroom', block: 'CSF_W', door: [-12, -9.5], junction: [-12, -8] },

  // ───────────── Wing B · Emergency & trauma ─────────────
  { id: 'B-EMG', level: 0, name: 'Emergency & Trauma', nameHi: 'आपातकालीन एवं ट्रॉमा', roomNumber: 'B01', category: 'emergency', block: 'WB1', door: [-36, -8], junction: [-34, -8] },
  { id: 'B-TRM', level: 0, name: 'Trauma Resuscitation', nameHi: 'ट्रॉमा पुनर्जीवन', roomNumber: 'B02', category: 'emergency', block: 'WB2', door: [-36, 8], junction: [-34, 8] },
  { id: '1-BTR', level: 1, name: 'Trauma Clinic', nameHi: 'ट्रॉमा क्लिनिक', roomNumber: 'B11', category: 'clinical', block: 'WB1', door: [-36, -8], junction: [-34, -8] },
  { id: '1-BOR', level: 1, name: 'Orthopedics', nameHi: 'अस्थि रोग विभाग', roomNumber: 'B12', category: 'clinical', block: 'WB2', door: [-36, 8], junction: [-34, 8] },
  { id: '2-BER', level: 2, name: 'Emergency Imaging', nameHi: 'आपातकालीन इमेजिंग', roomNumber: 'B21', category: 'imaging', block: 'WB1', door: [-36, -8], junction: [-34, -8] },
  { id: '2-BTR', level: 2, name: 'Trauma Diagnostics', nameHi: 'ट्रॉमा जांच', roomNumber: 'B22', category: 'imaging', block: 'WB2', door: [-36, 8], junction: [-34, 8] },
  { id: '3-BIC', level: 3, name: 'Surgical ICU', nameHi: 'सर्जिकल आईसीयू', roomNumber: 'B31', category: 'emergency', block: 'WB1', door: [-36, -8], junction: [-34, -8] },
  { id: '3-BTR', level: 3, name: 'Trauma Recovery', nameHi: 'ट्रॉमा रिकवरी', roomNumber: 'B32', category: 'ward', block: 'WB2', door: [-36, 8], junction: [-34, 8] },

  // ───────────── Wing C · Specialty, diagnostics & laboratories ─────────────
  { id: 'G-CLB', level: 0, name: 'Clinical Laboratory', nameHi: 'क्लिनिकल प्रयोगशाला', roomNumber: 'C01', category: 'lab', block: 'WC1', door: [36, -8], junction: [34, -8] },
  { id: 'G-CAR', level: 0, name: 'Cardiology Clinic', nameHi: 'हृदय रोग क्लिनिक', roomNumber: 'C02', category: 'clinical', block: 'WC2', door: [36, 8], junction: [34, 8] },
  { id: '1-CPT', level: 1, name: 'Pathology', nameHi: 'पैथोलॉजी', roomNumber: 'C11', category: 'lab', block: 'WC1', door: [36, -8], junction: [34, -8] },
  { id: '1-COT', level: 1, name: 'Operation Theatre', nameHi: 'ऑपरेशन थिएटर', roomNumber: 'C12', category: 'clinical', block: 'WC2', door: [36, 8], junction: [34, 8] },
  { id: '2-CBB', level: 2, name: 'Blood Bank', nameHi: 'ब्लड बैंक', roomNumber: 'C21', category: 'lab', block: 'WC1', door: [36, -8], junction: [34, -8] },
  { id: '2-CSP', level: 2, name: 'Sample Processing', nameHi: 'सैंपल प्रोसेसिंग', roomNumber: 'C22', category: 'lab', block: 'WC2', door: [36, 8], junction: [34, 8] },
  { id: '3-CIC', level: 3, name: 'Specialty ICU', nameHi: 'विशेष आईसीयू', roomNumber: 'C31', category: 'emergency', block: 'WC1', door: [36, -8], junction: [34, -8] },
  { id: '3-CCAR', level: 3, name: 'Cardiology', nameHi: 'हृदय रोग विभाग', roomNumber: 'C32', category: 'clinical', block: 'WC2', door: [36, 8], junction: [34, 8] },

  // ───────────── Wing A · Main OPD & diagnostics ─────────────
  { id: 'A-BIL', level: 0, name: 'Billing & Ayushman Desk', nameHi: 'बिलिंग एवं आयुष्मान डेस्क', roomNumber: 'A01', category: 'reception', block: 'WA1', door: [-10, 24], junction: [-10, 22] },
  { id: 'A-CAF', level: 0, name: 'Cafeteria', nameHi: 'कैफेटेरिया', roomNumber: 'A02', category: 'waiting', block: 'WA2', door: [0, 24], junction: [0, 22] },
  { id: 'A-AYU', level: 0, name: 'Ayushman Help Desk', nameHi: 'आयुष्मान सहायता डेस्क', roomNumber: 'A03', category: 'reception', block: 'WA3', door: [10, 24], junction: [10, 22] },
  { id: '1-AOP', level: 1, name: 'Main OPD', nameHi: 'मुख्य ओपीडी', roomNumber: 'A11', category: 'clinical', block: 'WA1', door: [-10, 24], junction: [-10, 22] },
  { id: '1-AOR', level: 1, name: 'Orthopedics', nameHi: 'अस्थि रोग विभाग', roomNumber: 'A12', category: 'clinical', block: 'WA2', door: [0, 24], junction: [0, 22] },
  { id: '1-AWC', level: 1, name: 'OPD Washroom', nameHi: 'ओपीडी शौचालय', roomNumber: 'A13', category: 'washroom', block: 'WA3', door: [10, 24], junction: [10, 22] },
  { id: '2-AMR', level: 2, name: 'MRI Suite', nameHi: 'एमआरआई कक्ष', roomNumber: 'A21', category: 'imaging', block: 'WA1', door: [-10, 24], junction: [-10, 22] },
  { id: '2-ACT', level: 2, name: 'CT Scan', nameHi: 'सीटी स्कैन', roomNumber: 'A22', category: 'imaging', block: 'WA2', door: [0, 24], junction: [0, 22] },
  { id: '2-AXR', level: 2, name: 'X-Ray', nameHi: 'एक्स-रे', roomNumber: 'A23', category: 'imaging', block: 'WA3', door: [10, 24], junction: [10, 22] },
  { id: '3-AOT', level: 3, name: 'Operation Theatre', nameHi: 'ऑपरेशन थिएटर', roomNumber: 'A31', category: 'clinical', block: 'WA1', door: [-10, 24], junction: [-10, 22] },
  { id: '3-ACAR', level: 3, name: 'Cardiology', nameHi: 'हृदय रोग विभाग', roomNumber: 'A32', category: 'clinical', block: 'WA2', door: [0, 24], junction: [0, 22] },
  { id: '3-ASE', level: 3, name: 'Specialty Care', nameHi: 'विशेष देखभाल', roomNumber: 'A33', category: 'ward', block: 'WA3', door: [10, 24], junction: [10, 22] },
];
