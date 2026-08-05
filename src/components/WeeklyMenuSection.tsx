import React from "react";
import { motion } from "motion/react";
import { Calendar, CheckCircle2, Clock, Plus, Sparkles, AlertCircle, Info, Lock } from "lucide-react";
import { MenuItem } from "../types";

interface WeeklyMenuSectionProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  onOpenDetail: (item: MenuItem) => void;
  formatIDR: (num: number) => string;
}

export interface WeeklyMenuAvailability {
  isOrderable: boolean;
  status: 'past_day' | 'today_closed' | 'tomorrow_open' | 'tomorrow_closed' | 'future_open';
  reason: string;
  badgeLabel: string;
  buttonLabel: string;
}

export const getWeeklyMenuAvailability = (dayNumber?: number, weekOffset: number = 0): WeeklyMenuAvailability => {
  if (weekOffset === 1) {
    return {
      isOrderable: false,
      status: 'future_open',
      reason: 'Menu minggu depan belum dirilis (Coming Soon).',
      badgeLabel: 'Coming Soon',
      buttonLabel: 'Coming Soon',
    };
  }

  if (!dayNumber) {
    return {
      isOrderable: true,
      status: 'future_open',
      reason: 'Dapat dipesan',
      badgeLabel: 'Dapat Dipesan',
      buttonLabel: 'Pesan Menu',
    };
  }

  const now = new Date();
  const day = now.getDay();
  const todayNumber = day === 0 ? 7 : day; // 1 = Senin, 2 = Selasa, ..., 7 = Minggu
  const currentHour = now.getHours(); // 0..23

  if (dayNumber < todayNumber) {
    return {
      isOrderable: false,
      status: 'past_day',
      reason: 'Hari telah berlalu.',
      badgeLabel: 'Berlalu',
      buttonLabel: 'Hari Telah Berlalu',
    };
  }

  if (dayNumber === todayNumber) {
    return {
      isOrderable: false,
      status: 'today_closed',
      reason: 'Order menu hari ini sudah ditutup (wajib dipesan H-1 maks jam 20.00 kemarin).',
      badgeLabel: 'Order Tutup',
      buttonLabel: 'Order Tutup (Tutup 20.00 Kemarin)',
    };
  }

  if (dayNumber === todayNumber + 1) {
    if (currentHour < 20) {
      return {
        isOrderable: true,
        status: 'tomorrow_open',
        reason: 'Pesan untuk besok sebelum jam 20.00 malam ini.',
        badgeLabel: 'Tutup 20.00 Malam Ini',
        buttonLabel: 'Pesan untuk Besok (Maks 20.00)',
      };
    } else {
      return {
        isOrderable: false,
        status: 'tomorrow_closed',
        reason: 'Pemesanan menu besok sudah ditutup karena sudah lewat jam 20.00 malam ini.',
        badgeLabel: 'Tutup (Lewat 20.00)',
        buttonLabel: 'Sudah Lewat Jam 20.00',
      };
    }
  }

  return {
    isOrderable: true,
    status: 'future_open',
    reason: 'Dapat dipesan (paling lambat H-1 jam 20.00).',
    badgeLabel: 'Bisa Dipesan',
    buttonLabel: 'Pesan Menu',
  };
};

export const getCurrentIndonesianDayNumber = (): number => {
  const day = new Date().getDay();
  return day === 0 ? 7 : day; // 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu, 7 = Minggu
};

export const getDateForIndonesianDayNumber = (dayNumber: number, weekOffset: number = 0): Date => {
  const now = new Date();
  const day = now.getDay();
  const todayNumber = day === 0 ? 7 : day; // 1 = Senin, 2 = Selasa, ..., 7 = Minggu
  const diff = dayNumber - todayNumber + (weekOffset * 7);
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  return targetDate;
};

export const formatDateIndoShort = (date: Date): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

export const INDONESIAN_DAYS = [
  { dayNumber: 1, name: "Senin", title: "Senin Ceria" },
  { dayNumber: 2, name: "Selasa", title: "Selasa Semangat" },
  { dayNumber: 3, name: "Rabu", title: "Rabu Nikmat" },
  { dayNumber: 4, name: "Kamis", title: "Kamis Manis" },
  { dayNumber: 5, name: "Jumat", title: "Jumat Berkah" },
  { dayNumber: 6, name: "Sabtu", title: "Sabtu Santai" },
  { dayNumber: 7, name: "Minggu", title: "Minggu Spesial" },
];

export const WeeklyMenuSection: React.FC<WeeklyMenuSectionProps> = ({
  menuItems,
  onAddToCart,
  onOpenDetail,
  formatIDR,
}) => {
  const [weekOffset, setWeekOffset] = React.useState<number>(0);
  const todayNumber = getCurrentIndonesianDayNumber();

  // Date range for selected week (Senin - Minggu)
  const mondayDate = getDateForIndonesianDayNumber(1, weekOffset);
  const sundayDate = getDateForIndonesianDayNumber(7, weekOffset);
  const weekDateRangeStr = `${formatDateIndoShort(mondayDate)} - ${formatDateIndoShort(sundayDate)} ${sundayDate.getFullYear()}`;

  // Filter weekly items or match by day
  const weeklyItemsMap = INDONESIAN_DAYS.map((day) => {
    const matchedItem = menuItems.find(
      (m) =>
        (m.category === "Menu Mingguan" || m.isWeekly) &&
        (weekOffset === 1 ? (m.isNextWeek === true || m.weekOffset === 1) : (!m.isNextWeek && m.weekOffset !== 1)) &&
        (m.dayNumber === day.dayNumber ||
          m.dayName?.toLowerCase() === day.name.toLowerCase() ||
          m.name.toLowerCase().includes(`[${day.name.toLowerCase()}]`) ||
          m.name.toLowerCase().includes(day.name.toLowerCase()))
    );

    const availability = getWeeklyMenuAvailability(day.dayNumber, weekOffset);
    const dateObj = getDateForIndonesianDayNumber(day.dayNumber, weekOffset);
    const dateStr = formatDateIndoShort(dateObj);

    return {
      dayInfo: day,
      item: matchedItem,
      availability,
      dateObj,
      dateStr,
    };
  });

  const todayName = INDONESIAN_DAYS.find((d) => d.dayNumber === todayNumber)?.name || "Hari Ini";
  const todayDateStr = formatDateIndoShort(getDateForIndonesianDayNumber(todayNumber));

  return (
    <div className="w-full my-6 bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/20 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-outline-variant/20">
        <div>
          <div className="inline-flex items-center gap-2 bg-terracotta/10 text-terracotta px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{weekOffset === 0 ? "Minggu Ini" : "Minggu Depan"} &bull; {weekDateRangeStr}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-espresso-dark tracking-tight">
            Jadwal Menu Spesial Seminggu
          </h2>
          <p className="text-sm text-espresso-dark/70 mt-1">
            Hari ini: <strong className="text-terracotta font-bold">{todayName}, {todayDateStr}</strong>. Pemesanan menu wajib dilakukan <strong className="text-terracotta">H-1 maksimal pukul 20.00 WIB</strong>. Lewat jam 20.00 WIB, order untuk esok hari sudah ditutup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Toggle Selector */}
          <div className="bg-espresso-dark/5 p-1 rounded-2xl flex items-center border border-outline-variant/20 shrink-0">
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                weekOffset === 0
                  ? "bg-terracotta text-white shadow-xs"
                  : "text-espresso-dark/70 hover:text-espresso-dark"
              }`}
            >
              📅 Minggu Ini
            </button>
            <button
              onClick={() => setWeekOffset(1)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                weekOffset === 1
                  ? "bg-terracotta text-white shadow-xs"
                  : "text-espresso-dark/70 hover:text-espresso-dark"
              }`}
            >
              🚀 Minggu Depan
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-800 shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Bebas Stok &mdash; Pesan Berapa Pun Banyaknya!</span>
          </div>
        </div>
      </div>

      {/* 7 Days Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {weeklyItemsMap.map(({ dayInfo, item, availability, dateStr }) => {
          if (weekOffset === 1 && (!item || !item.weekOffset)) {
            return (
              <div
                key={dayInfo.dayNumber}
                className="bg-white/70 rounded-3xl p-5 border border-dashed border-terracotta/30 flex flex-col justify-between items-center text-center h-full min-h-[280px] relative overflow-hidden group hover:border-terracotta/50 transition-all shadow-xs"
              >
                <div className="w-full text-left font-bold text-xs uppercase tracking-wider flex items-center justify-between pb-3 border-b border-outline-variant/15 text-espresso-dark">
                  <span className="flex items-center gap-1.5 text-terracotta font-extrabold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dayInfo.name}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-espresso-dark/50">{dateStr}</span>
                </div>

                <div className="my-auto py-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center font-bold shadow-xs">
                    <Sparkles className="w-6 h-6 text-terracotta animate-pulse" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
                    Coming Soon
                  </span>
                  <p className="text-xs text-espresso-dark/60 max-w-[200px] leading-relaxed mt-1">
                    Menu minggu depan untuk hari <strong>{dayInfo.name}</strong> belum rilis. Nantikan pembukaan pre-ordernya!
                  </p>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full bg-espresso-dark/5 text-espresso-dark/40 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-outline-variant/20"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Coming Soon</span>
                </button>
              </div>
            );
          }

          if (!item) {
            return (
              <div
                key={dayInfo.dayNumber}
                className="bg-white/50 rounded-2xl p-5 border border-dashed border-outline-variant/30 flex flex-col justify-between items-center text-center h-full min-h-[260px]"
              >
                <div className="w-full text-left font-bold text-xs text-espresso-dark/50 uppercase tracking-wider flex items-center justify-between">
                  <span>{dayInfo.name}</span>
                  <span className="text-[11px] font-semibold text-espresso-dark/40">{dateStr}</span>
                </div>
                <p className="text-xs text-espresso-dark/40 italic">Belum ada menu diset untuk hari ini</p>
              </div>
            );
          }

          const { isOrderable, status, badgeLabel, buttonLabel } = availability;

          return (
            <motion.div
              key={dayInfo.dayNumber}
              whileHover={isOrderable ? { y: -4 } : {}}
              className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between relative ${
                !isOrderable
                  ? "bg-gray-100/80 border-gray-200 opacity-80"
                  : status === 'tomorrow_open'
                  ? "bg-white border-2 border-terracotta shadow-lg ring-4 ring-terracotta/10"
                  : "bg-white border-outline-variant/25 shadow-sm hover:shadow-md hover:border-terracotta/40"
              }`}
            >
              {/* Day Header Bar */}
              <div
                className={`px-4 py-2.5 flex items-center justify-between font-bold text-xs uppercase tracking-wider border-b ${
                  !isOrderable
                    ? "bg-gray-200 text-gray-600 border-gray-300"
                    : status === 'tomorrow_open'
                    ? "bg-terracotta text-white border-terracotta"
                    : "bg-espresso-dark/5 text-espresso-dark border-outline-variant/20"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{dayInfo.name}</span>
                  <span className="text-[11px] font-semibold opacity-90">({dateStr})</span>
                </span>

                {status === 'past_day' && (
                  <span className="bg-gray-300 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>{badgeLabel}</span>
                  </span>
                )}
                {status === 'today_closed' && (
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>HARI INI (TUTUP)</span>
                  </span>
                )}
                {status === 'tomorrow_open' && (
                  <span className="bg-wasabi-green text-espresso-dark px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3 text-emerald-800" />
                    <span>{badgeLabel}</span>
                  </span>
                )}
                {status === 'tomorrow_closed' && (
                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-red-600" />
                    <span>{badgeLabel}</span>
                  </span>
                )}
                {status === 'future_open' && (
                  <span className="bg-terracotta/15 text-terracotta px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {badgeLabel}
                  </span>
                )}
              </div>

              {/* Food Image & Details */}
              <div className="p-4 flex-1 flex flex-col">
                <div
                  onClick={() => onOpenDetail(item)}
                  className="relative aspect-video rounded-2xl overflow-hidden bg-espresso-dark/5 cursor-pointer mb-3 group"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[10px] font-semibold">
                    ♾️ Tanpa Batas Stok
                  </div>
                </div>

                <h3
                  onClick={() => onOpenDetail(item)}
                  className={`font-bold text-sm md:text-base cursor-pointer leading-snug line-clamp-2 ${
                    !isOrderable ? "text-gray-600" : "text-espresso-dark hover:text-terracotta"
                  }`}
                >
                  {item.name}
                </h3>

                <p className="text-xs text-espresso-dark/65 mt-1 mb-3 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>

                <div className="mt-auto pt-2 border-t border-outline-variant/15 flex items-center justify-between">
                  <span className="font-extrabold text-sm md:text-base text-terracotta">
                    {formatIDR(item.price)}
                  </span>
                  <span className="text-[10px] text-espresso-dark/50 bg-espresso-dark/5 px-2 py-0.5 rounded-md font-medium">
                    1 Porsi
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                {!isOrderable ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-gray-200 text-gray-500 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-gray-300"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span>{buttonLabel}</span>
                  </button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onAddToCart(item)}
                    className={`w-full font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      status === 'tomorrow_open'
                        ? "bg-terracotta hover:bg-terracotta/90 text-white shadow-md hover:shadow-lg"
                        : "bg-terracotta/10 text-terracotta hover:bg-terracotta hover:text-white"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>{buttonLabel}</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Info Notice */}
      <div className="mt-6 bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
        <Info className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Syarat & Ketentuan Order Menu Mingguan:</strong> Pemesanan menu harian wajib dilakukan <strong>paling lambat H-1 pukul 20.00 WIB</strong> (misal: menu Besok Rabu hanya dapat dipesan sampai Selasa pukul 20.00 WIB). Pesanan untuk hari yang sama tidak dapat dilakukan karena porsi disiapkan fresh sesuai pesanan.
        </p>
      </div>
    </div>
  );
};
