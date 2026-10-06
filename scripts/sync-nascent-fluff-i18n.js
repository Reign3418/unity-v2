const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'src', 'messages');

const translations = {
  en: {
    tab_roster_flow: "Roster Flow",
    roster_flow_intel: "Roster Flow Intel",
    roster_new_entries: "New Top-Rank Entries",
    no_new_entries: "No new entries detected.",
    roster_departed: "Dropped Below Scan Depth",
    no_roster_departures: "No departures detected.",
    alliance_gravity_centers: "Alliance Gravity Centers",
    new_entries_joined: "{count} new top entries joined",
    spenders_desc_nascent: "Governors who gained <highlight>500k+</highlight> power in the selected window. <new>[NEW ENTRY]</new> = Surged into top rankings or late starter.",
    badge_new_entry_tooltip: "Surged into top rankings or late starter"
  },
  ar: {
    tab_roster_flow: "حركة الأعضاء",
    roster_flow_intel: "معلومات حركة الأعضاء",
    roster_new_entries: "انضمامات جديدة للقمة",
    no_new_entries: "لم يتم رصد انضمامات جديدة.",
    roster_departed: "تراجع دون عمق الفحص",
    no_roster_departures: "لم يتم رصد أي مغادرات.",
    alliance_gravity_centers: "مراكز جذب التحالفات",
    new_entries_joined: "انضم {count} أعضاء جدد في القمة",
    spenders_desc_nascent: "الحكام الذين حققوا زيادة قدرها <highlight>500 ألف+</highlight> قوة خلال الفترة المحددة. <new>[دخول جديد]</new> = صعد إلى الصدارة أو بدأ متأخراً.",
    badge_new_entry_tooltip: "صعد إلى الصدارة أو بدأ متأخراً"
  },
  de: {
    tab_roster_flow: "Kader-Fluss",
    roster_flow_intel: "Kader-Fluss Aufklärung",
    roster_new_entries: "Neue Spitzen-Einträge",
    no_new_entries: "Keine neuen Einträge erkannt.",
    roster_departed: "Unter Scan-Tiefe gefallen",
    no_roster_departures: "Keine Abgänge erkannt.",
    alliance_gravity_centers: "Allianz-Gravitationszentren",
    new_entries_joined: "{count} neue Spitzeneinträge beigetreten",
    spenders_desc_nascent: "Statthalter, die im ausgewählten Zeitfenster <highlight>500k+</highlight> Macht gewonnen haben. <new>[NEUER EINTRAG]</new> = In die Spitzenränge aufgestiegen oder Spätzünder.",
    badge_new_entry_tooltip: "In die Spitzenränge aufgestiegen oder Spätzünder"
  },
  es: {
    tab_roster_flow: "Flujo de Miembros",
    roster_flow_intel: "Inteligencia de Flujo",
    roster_new_entries: "Nuevas Entradas Top",
    no_new_entries: "No se detectaron nuevas entradas.",
    roster_departed: "Descendió bajo el umbral de escaneo",
    no_roster_departures: "No se detectaron salidas.",
    alliance_gravity_centers: "Centros Gravitacionales de Alianzas",
    new_entries_joined: "{count} nuevas entradas top unidas",
    spenders_desc_nascent: "Gobernadores que ganaron <highlight>500k+</highlight> de poder en el intervalo. <new>[NUEVA ENTRADA]</new> = Ascendió a las mejores posiciones o inicio tardío.",
    badge_new_entry_tooltip: "Ascendió a las mejores posiciones o inicio tardío"
  },
  fr: {
    tab_roster_flow: "Flux des Membres",
    roster_flow_intel: "Renseignement sur le Flux",
    roster_new_entries: "Nouvelles Entrées au Sommet",
    no_new_entries: "Aucune nouvelle entrée détectée.",
    roster_departed: "Passé sous le seuil de scan",
    no_roster_departures: "Aucun départ détecté.",
    alliance_gravity_centers: "Centres de Gravité d'Alliance",
    new_entries_joined: "{count} nouvelles entrées majeures ont rejoint",
    spenders_desc_nascent: "Gouverneurs ayant gagné <highlight>500k+</highlight> de puissance dans l'intervalle sélectionné. <new>[NOUVELLE ENTRÉE]</new> = Montée dans le top ou début tardif.",
    badge_new_entry_tooltip: "Montée dans le top ou début tardif"
  },
  id: {
    tab_roster_flow: "Arus Anggota",
    roster_flow_intel: "Intel Arus Anggota",
    roster_new_entries: "Entri Peringkat Atas Baru",
    no_new_entries: "Tidak ada entri baru terdeteksi.",
    roster_departed: "Turun di Bawah Kedalaman Pindai",
    no_roster_departures: "Tidak ada kepergian terdeteksi.",
    alliance_gravity_centers: "Pusat Gravitasi Aliansi",
    new_entries_joined: "{count} entri top baru bergabung",
    spenders_desc_nascent: "Gubernur yang memperoleh <highlight>500k+</highlight> daya dalam rentang waktu yang dipilih. <new>[ENTRI BARU]</new> = Melesat ke peringkat atas atau mulai terlambat.",
    badge_new_entry_tooltip: "Melesat ke peringkat atas atau mulai terlambat"
  },
  ko: {
    tab_roster_flow: "명부 변동",
    roster_flow_intel: "명부 변동 정보",
    roster_new_entries: "신규 상위 진입자",
    no_new_entries: "감지된 신규 진입자가 없습니다.",
    roster_departed: "스캔 범위 이하로 하락",
    no_roster_departures: "감지된 이탈자가 없습니다.",
    alliance_gravity_centers: "연맹 중력 중심",
    new_entries_joined: "신규 상위 진입자 {count}명 합류",
    spenders_desc_nascent: "선택된 기간 동안 전투력 <highlight>500k+</highlight> 이상을 획득한 지도자입니다. <new>[신규 진입]</new> = 상위권 급상승 또는 늦게 시작한 유저.",
    badge_new_entry_tooltip: "상위권 급상승 또는 늦게 시작한 유저"
  },
  pt: {
    tab_roster_flow: "Fluxo de Membros",
    roster_flow_intel: "Inteligência de Fluxo",
    roster_new_entries: "Novas Entradas no Topo",
    no_new_entries: "Nenhuma nova entrada detectada.",
    roster_departed: "Caiu Abaixo do Limite de Escaneamento",
    no_roster_departures: "Nenhuma saída detectada.",
    alliance_gravity_centers: "Centros de Gravidade de Alianças",
    new_entries_joined: "{count} novas entradas de topo ingressaram",
    spenders_desc_nascent: "Governadores que ganharam <highlight>500k+</highlight> de poder no intervalo selecionado. <new>[NOVA ENTRADA]</new> = Subiu para o topo ou início tardio.",
    badge_new_entry_tooltip: "Subiu para o topo ou início tardio"
  },
  ru: {
    tab_roster_flow: "Ротация состава",
    roster_flow_intel: "Данные о ротации состава",
    roster_new_entries: "Новые участники топа",
    no_new_entries: "Новых участников не обнаружено.",
    roster_departed: "Опустились ниже глубины сканирования",
    no_roster_departures: "Убывших не обнаружено.",
    alliance_gravity_centers: "Центры притяжения альянсов",
    new_entries_joined: "Присоединилось новых топовых игроков: {count}",
    spenders_desc_nascent: "Правители, прибавившие <highlight>500k+</highlight> мощи за выбранный период. <new>[НОВОЕ ПОСТУПЛЕНИЕ]</new> = Взлетел в топ или поздний старт.",
    badge_new_entry_tooltip: "Взлетел в топ или поздний старт"
  },
  tr: {
    tab_roster_flow: "Kadro Akışı",
    roster_flow_intel: "Kadro Akışı İstihbaratı",
    roster_new_entries: "Yeni Üst Sıra Girişleri",
    no_new_entries: "Yeni giriş tespit edilmedi.",
    roster_departed: "Tarama Derinliğinin Altına Düştü",
    no_roster_departures: "Ayrılan tespit edilmedi.",
    alliance_gravity_centers: "İttifak Çekim Merkezleri",
    new_entries_joined: "{count} yeni üst sıra üyesi katıldı",
    spenders_desc_nascent: "Seçilen zaman aralığında <highlight>500k+</highlight> güç kazanan valiler. <new>[YENİ GİRİŞ]</new> = Üst sıralara fırladı veya geç başladı.",
    badge_new_entry_tooltip: "Üst sıralara fırladı veya geç başladı"
  },
  vi: {
    tab_roster_flow: "Dòng Nhân Sự",
    roster_flow_intel: "Tình Báo Dòng Nhân Sự",
    roster_new_entries: "Gia Nhập Hạng Đầu Mới",
    no_new_entries: "Không phát hiện gia nhập mới nào.",
    roster_departed: "Tụt Xuống Dưới Độ Sâu Quét",
    no_roster_departures: "Không phát hiện rời đi nào.",
    alliance_gravity_centers: "Trung Tâm Trọng Lực Liên Minh",
    new_entries_joined: "{count} thành viên tốp đầu mới đã gia nhập",
    spenders_desc_nascent: "Thống đốc tăng thêm <highlight>500k+</highlight> lực chiến trong khoảng thời gian đã chọn. <new>[GIA NHẬP MỚI]</new> = Tăng vọt lên nhóm dẫn đầu hoặc bắt đầu muộn.",
    badge_new_entry_tooltip: "Tăng vọt lên nhóm dẫn đầu hoặc bắt đầu muộn"
  },
  zh: {
    tab_roster_flow: "战力流动",
    roster_flow_intel: "战力流动情报",
    roster_new_entries: "新进榜高战",
    no_new_entries: "未检测到新进榜执政官。",
    roster_departed: "跌出扫描深度",
    no_roster_departures: "未检测到离开人员。",
    alliance_gravity_centers: "联盟引力中心",
    new_entries_joined: "{count} 位新进榜成员加入",
    spenders_desc_nascent: "在选定时间窗口内战力提升 <highlight>500k+</highlight> 的执政官。<new>[新进榜]</new> = 战力突飞猛进冲入前列或后期起步。",
    badge_new_entry_tooltip: "战力突飞猛进冲入前列或后期起步"
  }
};

const locales = Object.keys(translations);

for (const loc of locales) {
  const filePath = path.join(MESSAGES_DIR, `${loc}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const t = translations[loc];

  if (!data.Polygraph) data.Polygraph = {};
  data.Polygraph.tab_roster_flow = t.tab_roster_flow;
  data.Polygraph.roster_flow_intel = t.roster_flow_intel;
  data.Polygraph.roster_new_entries = t.roster_new_entries;
  data.Polygraph.no_new_entries = t.no_new_entries;
  data.Polygraph.roster_departed = t.roster_departed;
  data.Polygraph.no_roster_departures = t.no_roster_departures;
  data.Polygraph.alliance_gravity_centers = t.alliance_gravity_centers;
  data.Polygraph.new_entries_joined = t.new_entries_joined;
  data.Polygraph.spenders_desc_nascent = t.spenders_desc_nascent;
  data.Polygraph.badge_new_entry_tooltip = t.badge_new_entry_tooltip;

  if (data.Tools) {
    data.Tools.spenders_desc_nascent = t.spenders_desc_nascent;
    data.Tools.badge_new_entry_tooltip = t.badge_new_entry_tooltip;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${loc}.json`);
}

console.log('Finished updating all locales.');
