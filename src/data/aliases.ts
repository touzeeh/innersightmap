/**
 * Deterministic aliases used by search and voice matching. Entries mix English,
 * Devanagari Hindi and common romanised (Hinglish) spellings. Matching is done
 * on normalised text (see services/textNormalize.ts), so casing, punctuation,
 * nukta and chandrabindu/anusvara variants do not need separate entries.
 *
 * Keys are destination ids: room ids from data/rooms.ts, or the connector
 * keys 'lift' and 'stair' (shared by every floor's connector).
 */
export const DESTINATION_ALIASES: Record<string, readonly string[]> = {
  'G-ENT': ['main entrance', 'entrance', 'entry', 'main gate', 'gate', 'मुख्य द्वार', 'मेन गेट', 'मुख्य प्रवेश', 'प्रवेश द्वार', 'dwar', 'mukhya dwar'],
  'G-REC': ['reception', 'front desk', 'information', 'रिसेप्शन', 'स्वागत', 'resepshan', 'swagat'],
  'G-REG': ['registration', 'register', 'registration desk', 'पंजीकरण', 'रजिस्ट्रेशन', 'panjikaran', 'registration counter'],
  'G-EMG': ['emergency', 'emergency ward', 'emergency room', 'इमरजेंसी', 'इमरजेंसी वार्ड', 'आपातकालीन वार्ड', 'आपातकाल', 'imergency', 'emergency vard', 'aapatkaleen ward'],
  'G-TRI': ['triage', 'emergency triage', 'ट्रायज', 'ट्राइएज', 'इमरजेंसी ट्रायज', 'triyaj'],
  'G-PHM': ['pharmacy', 'medical store', 'medicine shop', 'chemist', 'medical shop', 'फार्मेसी', 'दवाई की दुकान', 'दवा', 'दवाखाना', 'मेडिकल स्टोर', 'dawai', 'dawa', 'davai', 'dawai ki dukan'],
  'G-WTG': ['general waiting', 'waiting', 'waiting area', 'waiting room', 'प्रतीक्षा', 'प्रतीक्षा कक्ष', 'वेटिंग', 'वेटिंग एरिया', 'intezaar', 'intezar kaksh'],
  'G-WC': ['washroom', 'toilet', 'restroom', 'bathroom', 'wc', 'वॉशरूम', 'वाशरूम', 'शौचालय', 'टॉयलेट', 'बाथरूम', 'vashroom', 'shauchalay'],

  '1-OPD': ['opd', 'opd reception', 'out patient', 'outpatient', 'ओपीडी', 'ओपीडी रिसेप्शन', 'बाहरी रोगी', 'आउटपेशेंट', 'o p d'],
  '1-C102': ['consultation', 'consultation room', 'consultation 102', 'परामर्श', 'परामर्श कक्ष', 'कंसल्टेशन', 'कंसल्टेशन रूम', 'consultation 102 room'],
  '1-C103': ['consultation 103', 'consultation room 103', 'परामर्श कक्ष 103'],
  '1-DOC': ['doctor', 'doctors', "doctor's room", 'doctors room', 'doctor room', 'डॉक्टर', 'डॉक्टर का कमरा', 'डॉक्टर्स रूम', 'डॉक्टर रूम', 'doctor ka kamra'],
  '1-OWT': ['opd waiting', 'opd waiting area', 'ओपीडी प्रतीक्षा', 'ओपीडी वेटिंग'],
  '1-PATH': ['pathology', 'pathology lab', 'pathology laboratory', 'lab', 'laboratory', 'पैथोलॉजी', 'पैथोलॉजी लैब', 'प्रयोगशाला', 'लैब', 'खून की जाँच', 'खून जाँच', 'खून की जांच', 'blood test', 'pathalogy', 'pathology lab'],
  '1-BLC': ['blood collection', 'blood sample', 'sample collection', 'blood draw', 'ब्लड कलेक्शन', 'खून का नमूना', 'नमूना', 'सैंपल कलेक्शन', 'खून की जाँच', 'खून जाँच', 'खून की जांच', 'blood test', 'khoon ka namuna'],
  '1-WC': ['washroom', 'toilet', 'शौचालय', 'वॉशरूम', 'वाशरूम', 'टॉयलेट'],
  '1-DOC2': ["doctors room 2", "doctor room 2", 'doctor 2', 'डॉक्टर 2', 'डॉक्टर्स रूम 2'],

  '2-BB': ['blood bank', 'bloodbank', 'blood', 'ब्लड बैंक', 'खून बैंक', 'रक्त कोष', 'रक्त बैंक', 'रक्तकोष', 'khoon bank', 'rakt kosh', 'blad bank', 'blood'],
  '2-XR': ['x ray', 'xray', 'x-ray', 'diagnostic imaging', 'imaging', 'डायग्नोस्टिक इमेजिंग', 'इमेजिंग', 'एक्स रे', 'एक्स-रे', 'एक्सरे', 'ex ray'],
  '2-RAD': ['radiology', 'ct scan', 'ct', 'mri', 'ct & mri', 'रेडियोलॉजी', 'सीटी स्कैन', 'सीटी', 'एमआरआई', 'रेडियोलोजी', 'radiology ct mri', 'radiologi'],
  '2-REC': ['medical records', 'records', 'room 204', 'मेडिकल रिकॉर्ड्स', 'मेडिकल रिकॉर्ड', 'रिकॉर्ड', 'रिकॉर्ड्स', 'medical record'],
  '2-SMP': ['sample processing', 'processing', 'sample lab', 'सैंपल प्रोसेसिंग', 'नमूना प्रसंस्करण', 'सैंपल', 'नमूना'],
  '2-STF': ['staff room', 'staff', 'स्टाफ रूम', 'स्टाफ कक्ष', 'कर्मचारी कक्ष'],
  '2-WC': ['washroom', 'toilet', 'शौचालय', 'वॉशरूम', 'वाशरूम', 'टॉयलेट'],
  '2-RES': ['restricted', 'radiation store', 'store', 'restricted store', 'भंडार', 'प्रतिबंधित', 'स्टोर'],

  '3-ICU': ['icu', 'intensive care', 'intensive care unit', 'critical care', 'आईसीयू', 'गहन चिकित्सा', 'गहन चिकित्सा इकाई', 'आई सी यू', 'i c u'],
  '3-W302': ['ward a', 'inpatient ward', 'inpatient ward a', 'ward 302', 'इनपेशेंट वार्ड', 'इनपेशेंट वार्ड ए', 'भर्ती वार्ड'],
  '3-W303': ['ward b', 'inpatient ward b', 'ward 303', 'इनपेशेंट वार्ड बी', 'वार्ड बी'],
  '3-CARD': ['cardiology', 'cardio', 'heart', 'heart department', 'कार्डियोलॉजी', 'हृदय', 'हार्ट', 'दिल', 'dil', 'cardiologi'],
  '3-NEU': ['neurology', 'neuro', 'brain', 'nerve', 'न्यूरोलॉजी', 'दिमाग', 'तंत्रिका', 'neurologi'],
  '3-TRT': ['treatment', 'treatment room', 'treatment room 306', 'ट्रीटमेंट रूम', 'इलाज कक्ष', 'इलाज', 'ट्रीटमेंट'],
  '3-NRS': ['nurse station', 'nurses station', 'nurse', 'नर्स स्टेशन', 'नर्स', 'नर्सिंग स्टेशन', 'staff station'],
  '3-TRT2': ['treatment room 307', 'treatment 307', 'ट्रीटमेंट रूम 307'],
  '3-WC': ['washroom', 'toilet', 'शौचालय', 'वॉशरूम', 'वाशरूम', 'टॉयलेट'],

  lift: ['lift', 'elevator', 'lift lobby', 'elevator lobby', 'लिफ्ट', 'लिफ़्ट', 'लिफ्ट लॉबी', 'एलिवेटर'],
  stair: ['stairs', 'staircase', 'stairway', 'stair', 'सीढ़ी', 'सीढ़ियाँ', 'सीढ़ियां', 'सीढियाँ', 'स्टेयरकेस', 'सीढ़िया', 'sidhi', 'seedhi', 'seedhiyan'],
};

/** Category keywords. A query matching a category returns every place in it. */
export const CATEGORY_KEYWORDS: Record<string, readonly string[]> = {
  entrance: ['entrance', 'entry', 'gate', 'प्रवेश', 'मुख्य द्वार'],
  reception: ['reception', 'registration', 'रिसेप्शन', 'पंजीकरण'],
  emergency: ['emergency', 'critical', 'icu', 'इमरजेंसी', 'आपातकाल', 'आपातकालीन'],
  clinical: ['clinic', 'doctor', 'consultation', 'opd', 'ओपीडी', 'डॉक्टर', 'परामर्श'],
  lab: ['lab', 'laboratory', 'pathology', 'blood bank', 'लैब', 'प्रयोगशाला', 'पैथोलॉजी'],
  imaging: ['imaging', 'radiology', 'x ray', 'xray', 'scan', 'इमेजिंग', 'रेडियोलॉजी', 'स्कैन'],
  pharmacy: ['pharmacy', 'medicine', 'medical store', 'फार्मेसी', 'दवा', 'दवाई'],
  ward: ['ward', 'inpatient', 'bed', 'वार्ड', 'इनपेशेंट', 'बिस्तर'],
  waiting: ['waiting', 'lounge', 'प्रतीक्षा', 'वेटिंग'],
  washroom: ['washroom', 'toilet', 'restroom', 'bathroom', 'वॉशरूम', 'वाशरूम', 'शौचालय', 'टॉयलेट', 'बाथरूम'],
  staff: ['staff', 'nurse', 'nursing', 'स्टाफ', 'नर्स', 'कर्मचारी'],
  restricted: ['restricted', 'store', 'storage', 'प्रतिबंधित', 'भंडार'],
  circulation: ['lift', 'elevator', 'stairs', 'staircase', 'लिफ्ट', 'सीढ़ी', 'सीढ़ियाँ', 'एलिवेटर'],
};
