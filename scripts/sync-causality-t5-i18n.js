const fs = require('fs');
const path = require('path');

const locales = ['en', 'ar', 'de', 'es', 'fr', 'id', 'ko', 'pt', 'ru', 'tr', 'vi', 'zh'];
const messagesDir = path.join(__dirname, '..', 'src', 'messages');

const translations = {
  archetype_t5_unlocked: {
    en: "T5 Sovereign Whale",
    ar: "حوت T5 السيادي",
    de: "T5-Souverän-Wal",
    es: "Ballena Soberana T5",
    fr: "Baleine Souveraine T5",
    id: "Paus Berdaulat T5",
    ko: "T5 절대 군주 고래",
    pt: "Baleia Soberana T5",
    ru: "Суверенный Т5-Кит",
    tr: "T5 Hükümran Balina",
    vi: "Cá Voi Thống Trị T5",
    zh: "T5 霸权巨鲸"
  },
  archetype_t5_pushing: {
    en: "T5 Push in Progress",
    ar: "الاندفاع نحو T5 قيد التنفيذ",
    de: "T5-Sprint im Gange",
    es: "Avance T5 en Progreso",
    fr: "Progression T5 en Cours",
    id: "Pengejaran T5 Sedang Berlangsung",
    ko: "T5 진입 질주 중",
    pt: "Avanço T5 em Andamento",
    ru: "Спринт к T5 в Процессе",
    tr: "T5 Açma Sürecinde",
    vi: "Đang Đua Lên T5",
    zh: "全力冲刺 T5"
  },
  t5_radar_progress_title: {
    en: "T5 Push Radar Status",
    ar: "حالة رادار دفع T5",
    de: "T5-Push-Radar-Status",
    es: "Estado del Radar de Empuje T5",
    fr: "Statut du Radar Offensive T5",
    id: "Status Radar Serangan T5",
    ko: "T5 공격 레이더 상태",
    pt: "Status do Radar de Avanço T5",
    ru: "Статус радара атаки T5",
    tr: "T5 Saldırı Radarı Durumu",
    vi: "Trạng thái Radar Tấn công T5",
    zh: "T5 推进雷达追踪"
  },
  t5_status_ready: {
    en: "T5 UNLOCKED / READY",
    ar: "مفتوح T5 / جاهز",
    de: "T5 FREIGESCHALTET / BEREIT",
    es: "T5 DESBLOQUEADO / LISTO",
    fr: "T5 DÉBLOQUÉ / PRÊT",
    id: "T5 TERBUKA / SIAP",
    ko: "T5 개방 완료 / 준비",
    pt: "T5 DESBLOQUEADO / PRONTO",
    ru: "T5 РАЗБЛОКИРОВАНО / ГОТОВО"
  },
  t5_status_pushing: {
    en: "T5 SPRINT IN-FLIGHT",
    ar: "اندفاع T5 نشط",
    de: "T5-SPRINT AKTIV",
    es: "SPRINT T5 ACTIVO",
    fr: "SPRINT T5 ACTIF",
    id: "SPRINT T5 AKTIF",
    ko: "T5 질주 진행 중",
    pt: "SPRINT T5 ATIVO",
    ru: "СПРИНТ К T5 АКТИВЕН"
  },
  t5_status_progressing: {
    en: "PROGRESSING",
    ar: "قيد التقدم",
    de: "IN ENTWICKLUNG",
    es: "EN PROGRESO",
    fr: "EN COURS",
    id: "BERKEMBANG",
    ko: "발전 중",
    pt: "EM PROGRESSO",
    ru: "РАЗВИТИЕ"
  },
  t5_tech_floor_label: {
    en: "Tech Floor",
    ar: "حد التقنية الأدنى",
    de: "Tech-Schwelle",
    es: "Umbral Tecnológico",
    fr: "Seuil Technologique",
    id: "Batas Teknologi",
    ko: "군사 연구 기준점",
    pt: "Piso Tecnológico",
    ru: "Порог технологий"
  },
  t5_building_floor_label: {
    en: "Building Floor",
    ar: "حد المباني الأدنى",
    de: "Bau-Schwelle",
    es: "Umbral de Construcción",
    fr: "Seuil de Bâtiment",
    id: "Batas Bangunan",
    ko: "건축 기준점",
    pt: "Piso de Construção",
    ru: "Порог построек"
  },
  causality_matrix_title: {
    en: "Combat Causality & Civil War Matrix",
    ar: "مصفوفة سببية القتال والحرب الأهلية",
    de: "Gefechtskausalität & Bürgerkriegs-Matrix",
    es: "Matriz de Causalidad de Combate y Guerra Civil",
    fr: "Matrice de Causalité des Combats et Guerre Civile",
    id: "Matriks Kausalitas Tempur & Perang Saudara",
    ko: "전투 인과관계 및 내전 매트릭스",
    pt: "Matriz de Causalidade de Combate e Guerra Civil",
    ru: "Матрица боевой причинности и гражданской войны"
  },
  causality_matrix_desc: {
    en: "Cross-alliance correlation of Deads taken, Power dropped, and KP harvested ('Who Attacked Who').",
    ar: "ارتباط عبر التحالفات بين القتلى المفقودين وهبوط القوة ونقاط القتل ('من هاجم من').",
    de: "Allianz-übergreifende Korrelation von Gefallenen, Machtverlust und Killpunkten ('Wer griff wen an').",
    es: "Correlación entre alianzas de bajas sufridas, caída de poder y KP cosechados ('Quién atacó a quién').",
    fr: "Corrélation entre alliances des morts subies, puissance perdue et points récoltés ('Qui a attaqué qui').",
    id: "Korelasi lintas aliansi atas korban gugur, penurunan kekuatan, dan KP ('Siapa yang menyerang siapa').",
    ko: "전사자 발생, 투력 하락, 획득 KP 간의 연맹 간 상관관계 분석 ('누가 누구를 공격했는가').",
    pt: "Correlação entre alianças de mortos sofridos, queda de poder e KP colhidos ('Quem atacou quem').",
    ru: "Межальянсовая корреляция погибших, падения мощи и набранных KP ('Кто кого атаковал')."
  },
  causality_clash_detected: {
    en: "Civil Clash Detected",
    ar: "تم رصد اشتباك أهلي",
    de: "Bürgerkriegsgefecht erkannt",
    es: "Conflicto Civil Detectado",
    fr: "Affrontement Civil Détecté",
    id: "Benturan Saudara Terdeteksi",
    ko: "내전 충돌 감지됨",
    pt: "Conflito Civil Detectado",
    ru: "Обнаружено гражданское столкновение"
  },
  causality_internal_purge: {
    en: "Internal Rogue Purge",
    ar: "تطهير داخلي للمتمردين",
    de: "Interne Abtrünnigen-Säuberung",
    es: "Purga Interna de Rebeldes",
    fr: "Purge Interne de Dissidents",
    id: "Pembersihan Pembangkang Internal",
    ko: "연맹 내부 반역자 처형/숙청",
    pt: "Purga Interna de Rebeldes",
    ru: "Внутренняя зачистка бунтовщиков"
  },
  causality_peacetime: {
    en: "Pristine Peacetime",
    ar: "سلام تام",
    de: "Vollkommener Frieden",
    es: "Paz Prístina",
    fr: "Paix Absolue",
    id: "Masa Damai Utuh",
    ko: "완전한 평화 상태",
    pt: "Paz Absoluta",
    ru: "Полный мир"
  },
  causality_victims_header: {
    en: "Zeroed Casualties [{tag}]",
    ar: "ضحايا التصفية [{tag}]",
    de: "Gezerote Opfer [{tag}]",
    es: "Bajas Aniquiladas [{tag}]",
    fr: "Victimes Anéanties [{tag}]",
    id: "Korban Dibantai [{tag}]",
    ko: "전멸 피해 사령관 [{tag}]",
    pt: "Vítimas Zeradas [{tag}]",
    ru: "Обнуленные жертвы [{tag}]"
  },
  causality_attackers_header: {
    en: "Aggressor Strikers [{tag}]",
    ar: "المهاجمون الضاربون [{tag}]",
    de: "Angreifer & Vollstrecker [{tag}]",
    es: "Atacantes y Ejecutores [{tag}]",
    fr: "Assaillants et Exécuteurs [{tag}]",
    id: "Pasukan Penyerang [{tag}]",
    ko: "타격 공격 지휘관 [{tag}]",
    pt: "Atacantes e Executores [{tag}]",
    ru: "Ударные агрессоры [{tag}]"
  },
  no_named_casualties: {
    en: "No high-profile zeroing detected.",
    ar: "لم يتم رصد تصفية بارزة.",
    de: "Keine nennenswerten Zero-Opfer festgestellt.",
    es: "No se detectaron aniquilaciones notorias.",
    fr: "Aucun anéantissement majeur détecté.",
    id: "Tidak ada korban pembantaian besar terdeteksi.",
    ko: "주요 전멸 피해 계정이 감지되지 않았습니다.",
    pt: "Nenhuma aniquilação notória detectada.",
    ru: "Крупных обнулений не обнаружено."
  },
  no_named_strikers: {
    en: "Dispersed combat swarm.",
    ar: "هجوم سرب مشتت.",
    de: "Verteilter Schwarmangriff.",
    es: "Enjambre de combate disperso.",
    fr: "Nuée d'attaque dispersée.",
    id: "Serangan kawanan terdistribusi.",
    ko: "다수 연맹원의 분산 협공.",
    pt: "Enxame de combate disperso.",
    ru: "Рассредоточенная атака роя."
  },
  causality_peace_title: {
    en: "Harmonious Peacetime",
    ar: "سلام متناغم",
    de: "Harmonische Friedenszeit",
    es: "Paz Armoniosa",
    fr: "Paix Harmonieuse",
    id: "Masa Damai Harmonis",
    ko: "화합된 평화 상태",
    pt: "Paz Harmoniosa",
    ru: "Гармоничный мир"
  },
  causality_peace_desc: {
    en: "Zero inter-alliance military strikes or rogue zeroings detected. All registered troop attrition matches peaceful gathering harassment, holy site guardians, or PVE activities.",
    ar: "لم يتم رصد أي ضربات عسكرية بين التحالفات أو تصفيات متمردة. جميع الخسائر تعود لاحتكاك جمع الموارد، حراس المعابد، أو أنشطة PVE.",
    de: "Keine Angriffe zwischen Allianzen oder unautorisierte Angriffe festgestellt. Sämtliche Verluste entsprechen Ressourcenüberfällen, Wächtern an heiligen Stätten oder PVE-Kämpfen.",
    es: "Cero ataques militares entre alianzas o aniquilaciones rebeldes. Todas las bajas coinciden con desgaste en recolección, guardianes de santuarios o PVE.",
    fr: "Aucune frappe militaire inter-alliances ou anéantissement sauvage. Toutes les pertes correspondent au harcèlement de récolte, gardiens de sanctuaires ou activités PVE.",
    id: "Nol serangan militer antar aliansi atau pembantaian liar. Semua korban terdaftar cocok dengan gangguan pengumpulan, penjaga kuil, atau aktivitas PVE.",
    ko: "연맹 간 무력 충돌이나 반역자 처형이 발생하지 않았습니다. 기록된 전사자는 채집 견제, 성지 수호자 사냥 또는 PVE 활동과 일치합니다.",
    pt: "Zero ataques militares entre alianças ou aniquilações rebeldes. Todas as baixas coincidem com assédio de coleta, guardiões de santuários ou PVE.",
    ru: "Военных ударов между альянсами или самовольных зачисток не обнаружено. Все потери соответствуют стычкам на сборе ресурсов, стражам святилищ или PVE."
  },
  causality_power_trimming_title: {
    en: "Strategic Pre-Migration Power Trimming",
    ar: "تقليص القوة الاستراتيجي قبل الهجرة",
    de: "Strategische Machtreduzierung vor Migration",
    es: "Reducción Estratégica de Poder Pre-Migración",
    fr: "Réduction Stratégique de Puissance Pré-Migration",
    id: "Pemangkasan Kekuatan Strategis Pra-Migrasi",
    ko: "이민 조건 충족을 위한 전략적 투력 감축",
    pt: "Redução Estratégica de Poder Pré-Migração",
    ru: "Стратегический сброс мощи перед миграцией"
  },
  causality_power_trimming_desc: {
    en: "These governors intentionally shed millions in troop power and took heavy deads without dealing combat damage. They were NOT victims of a hostile civil war assault; they sacrificed troops on holy sites or neutral passes to lower their power below immigration passport caps (e.g. 25M cap).",
    ar: "قام هؤلاء الحكام بالتخلص عمداً من ملايين من قوة القوات وتكبدوا خسائر فادحة دون إلحاق ضرر قتالي. لم يكونوا ضحايا لحرب أهلية، بل ضحوا بالقوات عند المعابد لخفض قوتهم إلى ما دون سقف الهجرة (مثل سقف 25M).",
    de: "Diese Gouverneure haben gezielt Millionen an Truppenmacht geopfert und hohe Verluste erlitten, ohne nennenswerten Schaden auszuteilen. Sie waren KEINE Opfer eines feindlichen Bürgerkriegs, sondern ließen Truppen an heiligen Stätten verbluten, um unter die Migrationsgrenze (z. B. 25M) zu gelangen.",
    es: "Estos gobernadores perdieron intencionalmente millones en tropas y sufrieron grandes bajas sin causar daño. NO fueron víctimas de una guerra civil; sacrificaron tropas en santuarios para bajar su poder por debajo de los límites de inmigración (ej. tope de 25M).",
    fr: "Ces gouverneurs ont délibérément sacrifié des millions de puissance de troupes sans infliger de dégâts. Ils n'étaient PAS victimes d'une guerre civile, mais ont fait mourir leurs troupes sur des sanctuaires pour passer sous le plafond d'immigration (ex. 25M).",
    id: "Para gubernur ini sengaja memangkas jutaan kekuatan pasukan dan menderita korban tewas tanpa memberikan kerusakan tempur. Mereka BUKAN korban perang saudara; mereka mengorbankan pasukan di kuil suci agar berada di bawah batas paspor migrasi (misal batas 25M).",
    ko: "해당 집정관들은 적에게 피해를 입히지 않고 의도적으로 대규모 병력을 소모하여 전사자를 냈습니다. 이는 적대적 내전의 피해자가 아니며, 목표 왕국의 이민 허용 상한(예: 25M 투력 제한) 이하로 낮추기 위해 성지나 관문에 병력을 자진 소모한 전략적 감축입니다.",
    pt: "Estes governadores sacrificaram intencionalmente milhões em tropas e sofreram grandes baixas sem causar dano. NÃO foram vítimas de uma guerra civil; sacrificaram tropas em santuários para baixar o poder abaixo dos limites de imigração (ex. teto de 25M).",
    ru: "Эти правители намеренно слили миллионы боевой мощи и понесли потери без нанесения урона. Они НЕ были жертвами гражданской войны; они пожертвовали войсками о святилища, чтобы опуститься ниже лимита иммиграции (например, порог в 25M)."
  }
};

// Add missing keys for tr, vi, zh:
const trFallback = {
  t5_status_ready: "T5 AÇILDI / HAZIR",
  t5_status_pushing: "T5 SPRİNTİ DEVAM EDİYOR",
  t5_status_progressing: "İLERLİYOR",
  t5_tech_floor_label: "Teknoloji Tabanı",
  t5_building_floor_label: "Bina Tabanı",
  causality_matrix_title: "Muharebe Nedenselliği ve İç Savaş Matrisi",
  causality_matrix_desc: "Ölen askerlerin, güç kaybının ve kazanılan KP'nin ittifaklar arası korelasyonu ('Kimin Kime Saldırdığı').",
  causality_clash_detected: "İç Çatışma Tespit Edildi",
  causality_internal_purge: "İç Asi Temizliği",
  causality_peacetime: "Kusursuz Barış",
  causality_victims_header: "Sıfırlanan Kurbanlar [{tag}]",
  causality_attackers_header: "Saldıran Güçler [{tag}]",
  no_named_casualties: "Önemli bir sıfırlama tespit edilmedi.",
  no_named_strikers: "Dağınık sürü saldırısı.",
  causality_peace_title: "Uyumlu Barış Dönemi",
  causality_peace_desc: "İttifaklar arası askeri saldırı veya kuralsız sıfırlama tespit edilmedi. Tüm kayıplar kaynak tacizleri, tapınak muhafızları veya PVE etkinlikleriyle uyumludur.",
  causality_power_trimming_title: "Göç Öncesi Stratejik Güç Budama",
  causality_power_trimming_desc: "Bu valiler, çatışmada hasar vermeden bilerek milyonlarca asker gücünü feda etti ve kayıp verdi. Düşmanca bir iç savaşın kurbanı DEĞİLLERDİR; göç sınırının (ör. 25M sınırı) altına inmek için kutsal alanlarda bilerek asker öldürdüler."
};

const viFallback = {
  t5_status_ready: "T5 ĐÃ MỞ / SẴN SÀNG",
  t5_status_pushing: "ĐANG NƯỚC RÚT LÊN T5",
  t5_status_progressing: "ĐANG PHÁT TRIỂN",
  t5_tech_floor_label: "Ngưỡng Nghiên cứu",
  t5_building_floor_label: "Ngưỡng Công trình",
  causality_matrix_title: "Ma Trận Nhân Quả Chiến Đấu & Nội Chiến",
  causality_matrix_desc: "Tương quan liên minh giữa số quân tử trận, sụt giảm lực chiến và điểm hạ gục ('Ai đã tấn công ai').",
  causality_clash_detected: "Phát Hiện Xung Đột Nội Bộ",
  causality_internal_purge: "Thanh Trừng Nội Bộ",
  causality_peacetime: "Hòa Bình Toàn Diện",
  causality_victims_header: "Tổn Thất Bị Zero [{tag}]",
  causality_attackers_header: "Lực Lượng Tấn Công [{tag}]",
  no_named_casualties: "Không phát hiện tài khoản bị zero nghiêm trọng.",
  no_named_strikers: "Đòn vây hãm phân tán.",
  causality_peace_title: "Hòa Bình Ổn Định",
  causality_peace_desc: "Không có cuộc tấn công quân sự liên minh hoặc thanh trừng nổi loạn nào. Mọi tổn thất lính đều khớp với va chạm mỏ tài nguyên, hộ vệ đền thánh hoặc PVE.",
  causality_power_trimming_title: "Cắt Giảm Lực Chiến Chiến Lược Trước Di Cư",
  causality_power_trimming_desc: "Các thống đốc này đã chủ động hy sinh hàng triệu lực chiến lính và chịu tổn thất tử trận mà không gây sát thương giao tranh. Họ KHÔNG phải là nạn nhân của nội chiến, mà đã tự hủy lính vào đền thánh để hạ lực chiến xuống dưới mức trần nhập cư (ví dụ mốc 25M)."
};

const zhFallback = {
  t5_status_ready: "T5 已解锁 / 就绪",
  t5_status_pushing: "T5 冲刺阶段中",
  t5_status_progressing: "稳步发展中",
  t5_tech_floor_label: "科技基准线",
  t5_building_floor_label: "建筑基准线",
  causality_matrix_title: "战斗因果律与内战归因矩阵",
  causality_matrix_desc: "跨联盟阵亡阵痛、战力跌幅与击杀斩获交叉推演（'谁进攻了谁'）。",
  causality_clash_detected: "检测到内战交火",
  causality_internal_purge: "联盟内部叛忍处决",
  causality_peacetime: "和平建设期",
  causality_victims_header: "遭遇清零被执刑执政官 [{tag}]",
  causality_attackers_header: "集结出击进攻主力 [{tag}]",
  no_named_casualties: "未检测到高战清零事件。",
  no_named_strikers: "分散式集火围攻。",
  causality_peace_title: "和谐和平共处",
  causality_peace_desc: "未检测到任何跨联盟交火或违规清零。所有阵亡记录均符合采集摩擦、圣地守护者清剿等常规 PVE 损耗。",
  causality_power_trimming_title: "移民准入战略性压战力（自残送兵）",
  causality_power_trimming_desc: "这些执政官在无实质反击输出的情况下，主动牺牲数百万部队战力并承担高额阵亡。他们并非敌对内战的受害者，而是为了符合目标王国移民通行证战力红线（如 25M 封顶），在圣地守护者或关卡刻意自残削减战力。"
};

for (const [key, map] of Object.entries(translations)) {
  if (trFallback[key]) map.tr = trFallback[key];
  if (viFallback[key]) map.vi = viFallback[key];
  if (zhFallback[key]) map.zh = zhFallback[key];
}

locales.forEach(loc => {
  const filePath = path.join(messagesDir, `${loc}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.Polygraph) data.Polygraph = {};

  for (const [key, map] of Object.entries(translations)) {
    data.Polygraph[key] = map[loc] || map['en'];
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${loc}.json`);
});

console.log("Done syncing Causality & T5 i18n keys.");
