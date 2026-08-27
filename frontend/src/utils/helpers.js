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
  // Invoice Billing notification (per bulan, format sesuai revisi klien)
  INVOICE_BILLING: (invoice, student) => {
    const period = invoice.period_month || "Agustus 2026";
    const progText = invoice.items_json && invoice.items_json.length > 0
      ? invoice.items_json.map(it => `• ${it.program_name} (Paket ${it.package || 8} Pertemuan / Bulan)`).join('\n')
      : (invoice.program_name || 'Bimbingan Belajar');

    const progressInfo = `${invoice.sessions_completed || 0}/${invoice.package_sessions || 8} pertemuan`;
    const statusText = invoice.status === 'paid' ? 'Lunas' : 'Belum Lunas';

    return `*TAGIHAN SPP BULANAN RUMBALA* 🧾✨\n\n` +
      `Halo Ayah/Bunda dari ananda *${student.name}*,\n\n` +
      `Berikut rincian tagihan SPP bimbingan belajar ananda:\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *SPP ${period.toUpperCase()}*\n` +
      `📚 ${progText}\n` +
      `🎯 Progres : *${progressInfo}*\n` +
      `💰 SPP : *${formatRupiah(invoice.amount)}*\n` +
      `🏷️ Status : *${statusText}*\n` +
      `📅 Jatuh Tempo: *${formatDate(invoice.due_date)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⚠️ *Catatan Ketentuan Pertemuan:*\n` +
      `Paket (4, 8, atau 12 pertemuan) berlaku untuk 1 (satu) bulan berjalan. Jika pertemuan melewati di bulan yang sama maka pertemuannya akan hangus. Mohon dituntaskan pertemuan ananda pada bulan yang sama.\n\n` +
      `💳 *Rekening Pembayaran Resmi:*\n` +
      `*Bank BCA: 873-556-9921 (a.n Rumbala Edukasi)*\n\n` +
      `Setelah transfer, mohon kirimkan konfirmasi bukti transfer. Terima kasih! 🙏✨\n_Rumbala - Bimbingan Belajar & Les Privat_`;
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
