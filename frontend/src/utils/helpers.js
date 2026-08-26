/**
 * Currency Formatter for IDR
 */
export const formatRupiah = (number) => {
  if (number === undefined || number === null || isNaN(number)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

/**
 * Format Date to Indonesian Readable Date (e.g. 21 Agustus 2026)
 */
export const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
};

/**
 * Format Time (HH:mm)
 */
export const formatTime = (timeString) => {
  if (!timeString) return "-";
  if (timeString.length >= 5) return timeString.substring(0, 5);
  return timeString;
};

/**
 * Normalize Indonesian Phone Number to International format (+62)
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
};

/**
 * Generate 1-Click WhatsApp Direct URL
 */
export const createWhatsAppUrl = (phone, message) => {
  const normPhone = normalizePhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normPhone}?text=${encodedText}`;
};

/**
 * Message Templates for WhatsApp 1-Click Communication
 */
export const WA_TEMPLATES = {
  // Invoice Billing notification (especially for milestone 4, 8, 12 sessions)
  INVOICE_BILLING: (invoice, student) => {
    return `*NOTIFIKASI TAGIHAN LES RUMBALA* 📚✨\n\n` +
      `Halo Bapak/Ibu *${student.parent_name || 'Orang Tua'}*,\n` +
      `Alhamdulillah ananda *${student.name}* telah menyelesaikan sesi pembelajaran di Rumbala.\n\n` +
      `Berikut adalah rincian tagihan pembayaran:\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 No. Invoice: *${invoice.invoice_number}*\n` +
      `📌 Keterangan: *${invoice.milestone_name || 'Paket ' + invoice.sessions_count + ' Pertemuan'}*\n` +
      `💰 Total Tagihan: *${formatRupiah(invoice.amount)}*\n` +
      `📅 Jatuh Tempo: *${formatDate(invoice.due_date)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💳 Pembayaran dapat ditransfer ke rekening resmi Rumbala:\n` +
      `*Bank BCA: 873-556-9921 (a.n Rumbala Edukasi)*\n\n` +
      `Setelah melakukan transfer, mohon kirimkan bukti pembayaran melalui chat ini atau upload pada portal Rumbala. Terima kasih! 🙏`;
  },

  // Schedule Reminder notification
  SCHEDULE_REMINDER: (schedule, student, tutor) => {
    return `*PENGINGAT JADWAL LES RUMBALA* ⏰🎒\n\n` +
      `Halo *${student.parent_name || student.name}*,\n` +
      `Mengingatkan sesi les ananda *${student.name}*:\n\n` +
      `📅 Hari: *${schedule.day_of_week}*\n` +
      `⏰ Pukul: *${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)} WIB*\n` +
      `📖 Mata Pelajaran: *${schedule.subject}*\n` +
      `👩‍🏫 Tutor: *${tutor ? tutor.name : schedule.tutor_name || 'Tutor Rumbala'}*\n` +
      `📍 Tempat/Metode: *${schedule.location_type === 'online' ? 'Online (Zoom)' : 'Offline di Rumah'}*\n\n` +
      `Mohon dipersiapkan buku dan lembar kerja ananda. Semangat belajar! ✨`;
  },

  // Student Learning Report notification
  LEARNING_REPORT: (report, student) => {
    return `*LAPORAN PERKEMBANGAN BELAJAR SISWA - RUMBALA* 🌟📊\n\n` +
      `Yth. Bapak/Ibu *${student.parent_name || 'Orang Tua'}*,\n` +
      `Berikut kami sampaikan ringkasan evaluasi belajar ananda *${student.name}* periode *${report.period}*:\n\n` +
      `📝 *Ringkasan Perkembangan:*\n${report.summary}\n\n` +
      `⭐ *Kelebihan & Potensi:*\n${report.strengths}\n\n` +
      `💡 *Saran Pembelajaran:*\n${report.recommendations}\n\n` +
      `Laporan lengkap dan grafik nilai dapat diakses melalui portal belajar Rumbala. Terima kasih atas kepercayaan dan kerjasamanya! 🙏`;
  }
};
