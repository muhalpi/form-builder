export type Lang = "en" | "id";

export const translations = {
  en: {
    start: "Start",
    continue: "Continue",
    submit: "Submit",
    back: "Back",
    pressEnter: "Press Enter ↵",
    submitting: "Submitting...",
    required: "This field is required",
    thankYou: "Thank you!",
    responseSubmitted: "Your response has been submitted successfully.",
    noQuestions: "This form has no questions yet.",
    selectOption: "Select an option",
    yourAnswer: "Your answer",
    yes: "Yes",
    no: "No",
    poweredBy: "Powered by Formly",
    dragToRank: "Drag to reorder",
    rankInstructions: "Drag items into your preferred order",
    question: "Question",
    of: "of",
    notLikely: "Not likely",
    veryLikely: "Very likely",
    english: "English",
    indonesian: "Indonesian",
  },
  id: {
    start: "Mulai",
    continue: "Lanjut",
    submit: "Kirim",
    back: "Kembali",
    pressEnter: "Tekan Enter ↵",
    submitting: "Mengirim...",
    required: "Kolom ini wajib diisi",
    thankYou: "Terima kasih!",
    responseSubmitted: "Jawaban Anda telah berhasil dikirim.",
    noQuestions: "Formulir ini belum memiliki pertanyaan.",
    selectOption: "Pilih opsi",
    yourAnswer: "Jawaban Anda",
    yes: "Ya",
    no: "Tidak",
    poweredBy: "Didukung oleh Formly",
    dragToRank: "Seret untuk mengurutkan",
    rankInstructions: "Seret item ke urutan yang Anda inginkan",
    question: "Pertanyaan",
    of: "dari",
    notLikely: "Tidak mungkin",
    veryLikely: "Sangat mungkin",
    english: "English",
    indonesian: "Indonesia",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key];
}
