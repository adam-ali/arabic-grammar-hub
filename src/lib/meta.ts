// Book-level data that the markdown notes don't carry: English titles,
// search keywords, covers and the cross-book topic table.

export type BookId = 'nahw' | 'sarf2' | 'sarf3';
export type Kind = 'nahw' | 'sarf';

export interface BookMeta {
  id: BookId;
  kind: Kind;
  file: string;
  short: string;
  title: string;
  ar: string;
  arSub: string;
  kicker: string;
  sub: string;
}

export const BOOK_META: BookMeta[] = [
  {
    id: 'nahw', kind: 'nahw', file: 'nahw.md', short: 'Nahw', title: 'Nahw',
    ar: 'النَّحْو', arSub: 'دُرُوسٌ مِنَ الْآجُرُّومِيَّةِ', kicker: 'Grammar',
    sub: 'Based on al-Ājurrūmiyyah · 40 lessons',
  },
  {
    id: 'sarf2', kind: 'sarf', file: 'sarf-level-2.md', short: 'Sarf L2', title: 'Sarf · Level 2',
    ar: 'الصَّرْف', arSub: 'الْمُسْتَوَى الثَّانِي', kicker: 'Level 2 · Book 1',
    sub: 'Book 1 · 8 lessons · 10-week schedule',
  },
  {
    id: 'sarf3', kind: 'sarf', file: 'sarf-level-3.md', short: 'Sarf L3', title: 'Sarf · Level 3',
    ar: 'الصَّرْف', arSub: 'الْمُسْتَوَى الثَّالِثُ', kicker: 'Level 3 · Book 2',
    sub: 'Book 2 · 15 lessons · 21-week schedule',
  },
];

export interface LessonMeta {
  /** Topic title in Arabic. For sarf the markdown heading holds the reading's title instead. */
  ar: string;
  en: string;
  /** Transliterated and English search terms. */
  kw: string;
}

export const LESSON_META: Record<BookId, Record<string, LessonMeta>> = {
  nahw: {
    '1': { ar: "أَقْسَامُ الْكَلِمَةِ", en: "The three kinds of word", kw: "ism fil harf noun verb particle" },
    '2': { ar: "أَنْوَاعُ الْإِعْرَابِ", en: "The four cases", kw: "raf nasb jarr jazm case marfu mansub majrur majzum" },
    '3': { ar: "حُرُوفُ الْجَرِّ", en: "Prepositions", kw: "jarr preposition min ila" },
    '4': { ar: "الْجُمْلَةُ الْفِعْلِيَّةُ", en: "Verb sentence: فَاعِل and مَفْعُول بِهِ", kw: "fail maful bihi subject object doer" },
    '5': { ar: "الْجُمْلَةُ الاسْمِيَّةُ", en: "Noun sentence: مُبْتَدَأ and خَبَر", kw: "mubtada khabar nominal" },
    '6': { ar: "عَلَامَاتُ التَّأْنِيثِ", en: "Signs of the feminine", kw: "muannath feminine gender ta marbuta" },
    '7': { ar: "الْمُضَافُ إِلَيْهِ", en: "Possession (إِضَافَة)", kw: "idafa mudaf possession genitive" },
    '8': { ar: "أَدَوَاتُ النَّفْيِ", en: "Words of negation", kw: "laysa lam la lan ma negation" },
    '9': { ar: "لَا النَّافِيَةُ – لَا النَّاهِيَةُ", en: "لَا that negates vs لَا that forbids", kw: "la nafiya nahiya prohibition" },
    '10': { ar: "إِعْرَابُ الْفِعْلِ الْمُضَارِعِ", en: "Cases of the present verb", kw: "mudari present an lan lam jazm nasb" },
    '11': { ar: "النَّعْتُ (الصِّفَةُ)", en: "Adjectives", kw: "naat sifa adjective" },
    '12': { ar: "الْمُعْرَبُ وَالْمَبْنِيُّ", en: "Words that change vs words that don't", kw: "murab mabni indeclinable fixed" },
    '13': { ar: "أَسْمَاءُ الْإِشَارَةِ", en: "Pointing words (this, that)", kw: "hadha dhalika demonstrative" },
    '14': { ar: "الْأَسْمَاءُ الْمَوْصُولَةُ", en: "Relative pronouns (who, which)", kw: "alladhi relative pronoun sila" },
    '15': { ar: "الاسْمُ مِنْ حَيْثُ الْعَدَدِ", en: "Singular, dual, plural", kw: "muthanna dual plural number" },
    '16': { ar: "جَمْعُ الْمُذَكَّرِ السَّالِمُ", en: "Sound masculine plural", kw: "jam mudhakkar salim plural un in" },
    '17': { ar: "جَمْعُ الْمُؤَنَّثِ السَّالِمُ", en: "Sound feminine plural", kw: "jam muannath salim plural at broken taksir" },
    '18': { ar: "الْفِعْلُ اللَّازِمُ وَالْمُتَعَدِّي", en: "Verbs with and without an object", kw: "lazim mutaaddi transitive intransitive" },
    '19': { ar: "الْفِعْلُ الْمَاضِي", en: "The past verb", kw: "madi past mabni" },
    '20': { ar: "فِعْلُ الْأَمْرِ", en: "The command verb", kw: "amr command imperative" },
    '21': { ar: "الْعَطْفُ", en: "Joining words (and, or, then)", kw: "atf conjunction wa fa thumma aw" },
    '22': { ar: "النَّكِرَةُ وَالْمَعْرِفَةُ", en: "Indefinite and definite", kw: "nakira marifa definite indefinite" },
    '23': { ar: "الضَّمَائِرُ", en: "Pronouns", kw: "damir pronoun attached detached iyyaka" },
    '24': { ar: "الْمَفْعُولُ فِيهِ (الظَّرْفُ)", en: "Time and place words", kw: "zarf adverb time place maful fihi" },
    '25': { ar: "أَنْوَاعُ الْخَبَرِ", en: "Kinds of خَبَر", kw: "khabar types sentence shibh jumla" },
    '26': { ar: "كَانَ وَأَخَوَاتُهَا", en: "كَانَ and its sisters", kw: "kana sisters nawasikh laysa ma zala" },
    '27': { ar: "إِنَّ وَأَخَوَاتُهَا", en: "إِنَّ and its sisters", kw: "inna sisters lakinna laalla layta" },
    '28': { ar: "أَقْسَامُ الْفِعْلِ", en: "Kinds of verb", kw: "sahih mutall weak verb types" },
    '29': { ar: "إِعْرَابُ الْمُضَارِعِ الْمُعْتَلِّ الْآخِرِ", en: "Present verbs ending in a weak letter", kw: "mutall akhir muqaddara weak" },
    '30': { ar: "الْأَفْعَالُ الْخَمْسَةُ", en: "The five verbs", kw: "afal khamsa five verbs nun" },
    '31': { ar: "الْأَسْمَاءُ الْخَمْسَةُ", en: "The five nouns", kw: "asma khamsa abu akhu dhu" },
    '32': { ar: "الْعَدَدُ وَتَمْيِيزُهُ", en: "Numbers and what they count", kw: "adad numbers tamyiz counting" },
    '33': { ar: "الْحَالُ", en: "How someone was (حَال)", kw: "hal state circumstantial" },
    '34': { ar: "الْمُنَادَى", en: "Calling someone (يَا)", kw: "munada vocative ya" },
    '35': { ar: "الْمَفْعُولُ الْمُطْلَقُ", en: "The verb's own noun repeated", kw: "maful mutlaq masdar absolute" },
    '36': { ar: "الْمَفْعُولُ لِأَجْلِهِ", en: "The reason for an action", kw: "maful li ajlihi reason purpose" },
    '37': { ar: "مُقَدِّمَةٌ فِي عِلْمِ الصَّرْفِ", en: "Introduction to sarf", kw: "sarf ishtiqaq derivation" },
    '38': { ar: "الْأَفْعَالُ الْمُتَعَدِّيَةُ لِمَفْعُولَيْنِ", en: "Verbs with two objects", kw: "zanna sisters two objects" },
    '39': { ar: "إِسْنَادُ الْفِعْلِ إِلَى الضَّمَائِرِ", en: "Attaching pronouns to verbs", kw: "isnad conjugation pronouns" },
    '40': { ar: "الْمَمْنُوعُ مِنَ الصَّرْفِ", en: "Nouns that can't take tanween", kw: "mamnu min al sarf diptote tanween" },
  },
  sarf3: {
    '1': { ar: "الْمِيزَانُ الصَّرْفِيُّ", en: "The verb scale; مُجَرَّد and مَزِيد", kw: "mizan scale wazn fal mujarrad mazid" },
    '2': { ar: "صِيَغُ الْأَفْعَالِ الْمَزِيدَةِ", en: "The verb forms I–X", kw: "forms augmented mazid ten roman" },
    '3': { ar: "اسْمُ الْفَاعِلِ وَاسْمُ الْمَفْعُولِ", en: "Active and passive participles", kw: "ism fail ism maful participle" },
    '4': { ar: "أَنْوَاعُ الْفِعْلِ", en: "Types of verbs", kw: "sahih mutall salim mudaaf mahmuz mithal ajwaf naqis lafif" },
    '5': { ar: "تَصْرِيفُ الْمَهْمُوزِ", en: "Hamzated verbs", kw: "mahmuz hamza akhadha" },
    '6': { ar: "تَصْرِيفُ الْمُضَعَّفِ", en: "Doubled verbs", kw: "mudaaf doubled shadda idgham" },
    '7': { ar: "تَصْرِيفُ الْمِثَالِ", en: "Verbs with a weak first letter", kw: "mithal waqafa first weak" },
    '8': { ar: "تَصْرِيفُ الْأَجْوَفِ", en: "Hollow verbs", kw: "ajwaf hollow qama middle weak" },
    '9': { ar: "تَصْرِيفُ النَّاقِصِ", en: "Defective verbs", kw: "naqis defective daa last weak" },
    '10': { ar: "تَصْرِيفُ اللَّفِيفِ", en: "Doubly-weak verbs", kw: "lafif waqa nawa" },
    '11': { ar: "تَصْرِيفُ الْمَزِيدِ الْمُعْتَلِّ وَالْمُضَعَّفِ", en: "Augmented doubled and weak verbs", kw: "mazid aqama itasala" },
    '12': { ar: "بِنَاءُ الْمَاضِي لِلْمَجْهُولِ", en: "The past passive", kw: "passive majhul past" },
    '13': { ar: "بِنَاءُ الْمُضَارِعِ لِلْمَجْهُولِ", en: "The present passive", kw: "passive majhul present" },
    '14': { ar: "اسْتِخْرَاجُ الْمَعَانِي مِنَ الْمَعَاجِمِ", en: "Using a dictionary", kw: "dictionary root mujam hans wehr" },
    '15': { ar: "تَدْرِيبَاتٌ عَامَّةٌ", en: "General revision", kw: "revision review exercises" },
  },
  sarf2: {
    '1': { ar: "الْفِعْلُ الْمَاضِي الثُّلَاثِيُّ", en: "The three past patterns", kw: "fala fail fula mizan past wazn fa ain lam" },
    '2': { ar: "الْمَاضِي مَعَ ضَمَائِرِ الْفَاعِلِ", en: "The past with doer pronouns", kw: "fail pronouns conjugation tu na" },
    '3': { ar: "الْمَاضِي مَعَ ضَمَائِرِ الْمَفْعُولِ", en: "The past with object pronouns", kw: "maful bihi object pronouns ni hu" },
    '4': { ar: "مُضَارِعُ الْفِعْلِ الْمَاضِي", en: "Making the مُضَارِع", kw: "mudari present anaytu" },
    '5': { ar: "أَحْوَالُ الْفِعْلِ مَعَ مُضَارِعِهِ", en: "The six أَبْوَاب", kw: "bab abwab vowel groups nasara daraba fataha alima karuma hasiba" },
    '6a': { ar: "فِعْلُ الْأَمْرِ", en: "The أَمْر of three-letter verbs", kw: "amr command imperative hamzat wasl" },
    '6b': { ar: "الْأَفْعَالُ غَيْرُ الثُّلَاثِيَّةِ", en: "Longer verbs: مُضَارِع and أَمْر", kw: "ruba khumasi sudasi mazid longer verbs" },
    '7': { ar: "اسْتِخْرَاجُ الْمَعَانِي مِنَ الْمُعْجَمِ", en: "Using a dictionary", kw: "dictionary mujam mujarrad root" },
  },
};

/** Titles for the non-lesson pages at the front and back of each book. */
export const MATTER = {
  front: { ar: 'كَيْفَ تَسْتَعْمِلُ هٰذِهِ الْمُذَكِّرَةَ', slug: 'how-to-use' },
  test: { ar: 'الِاخْتِبَارُ الْأَخِيرُ', slug: 'final-self-test' },
  revision: { ar: 'مُرَاجَعَةٌ سَرِيعَةٌ', slug: 'quick-revision' },
  exercises: { ar: 'تَمَارِينُ عَامَّةٌ', slug: 'general-exercises' },
} as const;

/** Topics taught in more than one book. Columns: nahw, sarf2, sarf3 lesson numbers. */
export const MEET: { en: string; ar: string; nahw: string[]; sarf2: string[]; sarf3: string[] }[] = [
  { en: 'Verb types: sound, weak, doubled, hamzated', ar: 'أَنْوَاعُ الْفِعْلِ', nahw: ['28'], sarf2: [], sarf3: ['4'] },
  { en: 'The verb scale and the ten forms', ar: 'الْمِيزَانُ وَالْأَوْزَانُ', nahw: ['37'], sarf2: ['1', '6b'], sarf3: ['1', '2'] },
  { en: 'Doer and object pronouns on verbs', ar: 'ضَمَائِرُ الْفَاعِلِ وَالْمَفْعُولِ', nahw: ['4', '23', '39'], sarf2: ['2', '3'], sarf3: [] },
  { en: 'Forming and parsing the present', ar: 'الْمُضَارِعُ', nahw: ['10', '30'], sarf2: ['4', '5'], sarf3: ['11'] },
  { en: 'Hamzated verbs', ar: 'الْمَهْمُوزُ', nahw: ['39'], sarf2: [], sarf3: ['5'] },
  { en: 'Doubled verbs', ar: 'الْمُضَعَّفُ', nahw: ['39'], sarf2: [], sarf3: ['6', '11'] },
  { en: 'Verbs with a weak first letter', ar: 'الْمِثَالُ', nahw: ['39'], sarf2: [], sarf3: ['7'] },
  { en: 'Hollow verbs', ar: 'الْأَجْوَفُ', nahw: ['39'], sarf2: [], sarf3: ['8', '11'] },
  { en: 'Defective verbs and their endings', ar: 'النَّاقِصُ', nahw: ['29', '39'], sarf2: [], sarf3: ['9', '11'] },
  { en: 'Forming and parsing the command', ar: 'فِعْلُ الْأَمْرِ', nahw: ['20'], sarf2: ['6a'], sarf3: ['5', '6', '7', '8', '9', '10'] },
  { en: 'The passive, and نَائِبُ الْفَاعِلِ', ar: 'الْمَبْنِيُّ لِلْمَجْهُولِ', nahw: ['37'], sarf2: [], sarf3: ['12', '13'] },
  { en: 'The مَصْدَر of each form', ar: 'الْمَصْدَرُ', nahw: ['35', '36'], sarf2: [], sarf3: ['2'] },
  { en: 'Patterns that block tanween', ar: 'أَوْزَانُ الْأَسْمَاءِ', nahw: ['40'], sarf2: [], sarf3: ['1', '2'] },
  { en: 'Finding the root', ar: 'الْجَذْرُ', nahw: ['37'], sarf2: ['7'], sarf3: ['14'] },
];
