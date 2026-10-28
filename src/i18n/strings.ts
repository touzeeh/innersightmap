/**
 * Interface strings in English and Hindi. Keep keys short and descriptive.
 * Anything spoken or shown during navigation is generated per language by the
 * services (instructions, search labels); this table covers the static UI.
 */
import type { Language } from '../types/navigation';

const STRINGS = {
  appTitle: { en: 'InnerSight', hi: 'इनरसाइट' },
  tagline: { en: '3D indoor navigation · fictional hospital demo', hi: '3D इनडोर नेविगेशन · काल्पनिक अस्पताल का डेमो' },
  languageLabel: { en: 'Language', hi: 'भाषा' },
  resetDemo: { en: 'Reset demo', hi: 'डेमो रीसेट करें' },

  searchHeading: { en: 'Where do you want to go?', hi: 'आप कहाँ जाना चाहते हैं?' },
  searchPlaceholder: { en: 'Blood bank, room 204, washroom…', hi: 'ब्लड बैंक, कमरा 204, वॉशरूम…' },
  searchHint: { en: 'Search by name, room number, department or Hindi name.', hi: 'नाम, कमरा नंबर, विभाग या हिंदी नाम से खोजें।' },
  noResults: { en: 'No matching places. Try a room number, department or category.', hi: 'कोई मिलता-जुलता स्थान नहीं मिला। कमरा नंबर, विभाग या श्रेणी आज़माएँ।' },
  resultsLabel: { en: 'Matching destinations', hi: 'मिलते-जुलते गंतव्य' },
  clarifyTitle: { en: 'Which one did you mean?', hi: 'आपका मतलब किससे है?' },
  clearSearch: { en: 'Clear search', hi: 'खोज साफ़ करें' },

  voiceStart: { en: 'Speak', hi: 'बोलें' },
  voiceStop: { en: 'Stop listening', hi: 'सुनना बंद करें' },
  voiceListening: { en: 'Listening… speak now', hi: 'सुन रहा हूँ… अब बोलें' },
  voiceHeard: { en: 'Heard', hi: 'सुना गया' },
  voiceUnsupported: {
    en: 'Voice input is not available in this browser. Use the search box instead.',
    hi: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। खोज बॉक्स का उपयोग करें।',
  },
  voiceHelp: {
    en: 'Try: “Take me to the blood bank”, “Start navigation”, “Repeat directions”, “Switch to Hindi”.',
    hi: 'आज़माएँ: “मुझे ब्लड बैंक जाना है”, “नेविगेशन शुरू करो”, “दोबारा बोलो”, “हिंदी में बदलो”।',
  },

  startHeading: { en: 'Starting point', hi: 'प्रारंभिक बिंदु' },
  startSimulated: {
    en: 'Starting point is simulated for this demo. Real indoor positioning needs extra infrastructure.',
    hi: 'इस डेमो में प्रारंभिक बिंदु सिम्युलेटेड है। असली इनडोर स्थिति के लिए अतिरिक्त ढाँचा चाहिए।',
  },
  pickStart: { en: 'Pick start on map', hi: 'मानचित्र पर प्रारंभ चुनें' },
  pickDestination: { en: 'Pick destination on map', hi: 'मानचित्र पर गंतव्य चुनें' },
  pickingStart: { en: 'Click a room in the building to set your start. Press Escape to cancel.', hi: 'प्रारंभ सेट करने के लिए इमारत में कोई कमरा क्लिक करें। रद्द करने के लिए Escape दबाएँ।' },
  pickingDestination: { en: 'Click a room in the building to set your destination. Press Escape to cancel.', hi: 'गंतव्य सेट करने के लिए इमारत में कोई कमरा क्लिक करें। रद्द करने के लिए Escape दबाएँ।' },
  cancelPick: { en: 'Cancel', hi: 'रद्द करें' },

  routeHeading: { en: 'Route', hi: 'मार्ग' },
  routeType: { en: 'Route type', hi: 'मार्ग का प्रकार' },
  routeShortest: { en: 'Shortest', hi: 'सबसे छोटा' },
  routeStepFree: { en: 'Step-free (no stairs)', hi: 'बिना सीढ़ी (केवल लिफ्ट)' },
  distance: { en: 'Walking distance', hi: 'पैदल दूरी' },
  duration: { en: 'Estimated time', hi: 'अनुमानित समय' },
  floorChanges: { en: 'Floor changes', hi: 'मंज़िल बदलना' },
  noFloorChange: { en: 'Same floor', hi: 'एक ही मंज़िल' },
  estimateNote: {
    en: 'Distance and time are estimates from the building model, not measured values.',
    hi: 'दूरी और समय इमारत के मॉडल से अनुमानित हैं, मापे गए मान नहीं।',
  },
  directions: { en: 'Directions', hi: 'दिशा-निर्देश' },
  chooseDestination: { en: 'Choose a destination to see the route.', hi: 'मार्ग देखने के लिए गंतव्य चुनें।' },
  startNavigation: { en: 'Start navigation', hi: 'नेविगेशन शुरू करें' },
  destinationCard: { en: 'Destination', hi: 'गंतव्य' },
  clearDestination: { en: 'Clear', hi: 'हटाएँ' },

  nowLabel: { en: 'Now', hi: 'अभी' },
  nextLabel: { en: 'Next', hi: 'फिर' },
  destinationShort: { en: 'Destination', hi: 'गंतव्य' },
  currentFloor: { en: 'Current floor', hi: 'वर्तमान मंज़िल' },
  remaining: { en: 'Remaining', hi: 'शेष दूरी' },
  remainingTime: { en: 'Est. time left', hi: 'अनुमानित शेष समय' },
  progress: { en: 'Progress', hi: 'प्रगति' },
  pause: { en: 'Pause', hi: 'रोकें' },
  resume: { en: 'Resume', hi: 'जारी रखें' },
  stop: { en: 'Stop', hi: 'बंद करें' },
  repeat: { en: 'Repeat', hi: 'दोबारा सुनें' },
  mute: { en: 'Mute voice', hi: 'आवाज़ बंद करें' },
  unmute: { en: 'Unmute voice', hi: 'आवाज़ चालू करें' },
  speed: { en: 'Speed', hi: 'गति' },
  arrivedTitle: { en: 'You have arrived', hi: 'आप पहुँच गए हैं' },
  arrivedBody: { en: 'Your destination is highlighted on the map.', hi: 'आपका गंतव्य मानचित्र पर चिह्नित है।' },
  voiceUnavailableNote: { en: 'Voice output is unavailable in this browser. Text directions are shown.', hi: 'इस ब्राउज़र में आवाज़ आउटपुट उपलब्ध नहीं है। पाठ निर्देश दिखाए जा रहे हैं।' },
  noHindiVoice: { en: 'No Hindi voice is installed; Hindi speech may sound unnatural or be silent.', hi: 'हिंदी आवाज़ इंस्टॉल नहीं है; हिंदी बोली अस्वाभाविक या चुप हो सकती है।' },

  floorsHeading: { en: 'Floors', hi: 'मंज़िलें' },
  showAllFloors: { en: 'All floors', hi: 'सभी मंज़िलें' },
  soloFloor: { en: 'Solo', hi: 'केवल यही' },
  hideFloor: { en: 'Hide', hi: 'छिपाएँ' },
  showFloor: { en: 'Show', hi: 'दिखाएँ' },
  explode: { en: 'Explode floors', hi: 'मंज़िलें अलग करें' },
  cutaway: { en: 'Cutaway walls', hi: 'दीवारें नीची करें' },
  lowDetail: { en: 'Low-detail mode', hi: 'कम विवरण मोड' },
  viewHeading: { en: 'Camera', hi: 'कैमरा' },
  cameraBuilding: { en: 'Building', hi: 'इमारत' },
  cameraFloor: { en: 'Floor', hi: 'मंज़िल' },
  cameraFollow: { en: 'Follow guide', hi: 'गाइड का पीछा' },
  cameraTopdown: { en: 'Top-down', hi: 'ऊपर से' },
  cameraCloseup: { en: 'Close-up', hi: 'नज़दीक से' },
  resetCamera: { en: 'Reset view', hi: 'दृश्य रीसेट करें' },

  demoNotice: {
    en: 'Demo notice: the starting point is simulated. GPS, Wi-Fi and Bluetooth positioning are not implemented in this build.',
    hi: 'डेमो सूचना: प्रारंभिक बिंदु सिम्युलेटेड है। GPS, Wi-Fi और ब्लूटूथ स्थिति इस संस्करण में लागू नहीं हैं।',
  },
  webglFallback: {
    en: 'The 3D view could not start on this device. Search and directions still work below.',
    hi: 'इस डिवाइस पर 3D दृश्य शुरू नहीं हो सका। खोज और दिशा-निर्देश नीचे उपलब्ध हैं।',
  },
  webglLost: { en: 'The 3D view stopped (graphics context lost). Reload the page to restart it.', hi: '3D दृश्य रुक गया (ग्राफ़िक्स संदर्भ खो गया)। फिर से शुरू करने के लिए पेज रीलोड करें।' },
  sceneError: { en: 'Something went wrong in the 3D view. Search and directions still work.', hi: '3D दृश्य में कोई गड़बड़ी हुई। खोज और दिशा-निर्देश अब भी काम करते हैं।' },
  loadingScene: { en: 'Building the hospital…', hi: 'अस्पताल बनाया जा रहा है…' },
  webglUnavailable: {
    en: 'This browser or device does not support WebGL, so the 3D view is off.',
    hi: 'इस ब्राउज़र या डिवाइस में WebGL उपलब्ध नहीं है, इसलिए 3D दृश्य बंद है।',
  },
  controlsHint: {
    en: 'Drag to orbit · scroll to zoom · right-drag to pan',
    hi: 'घुमाने के लिए खींचें · ज़ूम के लिए स्क्रॉल करें · खिसकाने के लिए दायाँ-खींचें',
  },
  roomInfo: { en: 'Selected place', hi: 'चुना गया स्थान' },
  setAsStart: { en: 'Use as start', hi: 'प्रारंभ के रूप में उपयोग करें' },

  voiceFeedbackNone: { en: 'I could not find that place. Try a room name, room number or department.', hi: 'वह स्थान नहीं मिला। कमरे का नाम, नंबर या विभाग आज़माएँ।' },
  voiceFeedbackEmpty: { en: 'I did not catch a destination. Please try again.', hi: 'गंतव्य समझ नहीं आया। कृपया दोबारा बोलें।' },
  voiceFeedbackAmbiguous: { en: 'More than one place matches. Choose one below or say its number.', hi: 'एक से ज़्यादा स्थान मिले। नीचे से चुनें या उसका क्रमांक बोलें।' },
  voiceFeedbackSelected: { en: 'Destination set. Say “start navigation” when you are ready.', hi: 'गंतव्य सेट हो गया। तैयार होने पर “नेविगेशन शुरू करो” बोलें।' },
  voiceNeedDestination: { en: 'Choose a destination first.', hi: 'पहले गंतव्य चुनें।' },
  voiceNothingToRepeat: { en: 'There are no directions to repeat yet.', hi: 'अभी दोहराने के लिए कोई निर्देश नहीं है।' },
  voiceStopped: { en: 'Navigation stopped.', hi: 'नेविगेशन बंद किया गया।' },
  voicePaused: { en: 'Paused.', hi: 'रुका हुआ है।' },
  voiceResumed: { en: 'Resumed.', hi: 'फिर से शुरू।' },
  voiceLanguageEnglish: { en: 'Switched to English.', hi: 'अंग्रेज़ी में बदला गया।' },
  voiceLanguageHindi: { en: 'Switched to Hindi.', hi: 'हिंदी में बदला गया।' },
} as const;

export type StringKey = keyof typeof STRINGS;

export function tr(key: StringKey, language: Language): string {
  const entry = STRINGS[key];
  return language === 'hi' ? entry.hi : entry.en;
}

export { STRINGS };
