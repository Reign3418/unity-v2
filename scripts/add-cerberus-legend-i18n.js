const fs = require('fs');
const path = require('path');

const locales = ['en', 'ar', 'de', 'es', 'fr', 'id', 'ko', 'pt', 'ru', 'tr', 'vi', 'zh'];

const translations = {
  legend_btn_title: {
    en: "Galactic Codex & Legend",
    ar: "مخطوطة ودليل المجرة",
    de: "Galaktischer Kodex & Legende",
    es: "Códice Galáctico y Leyenda",
    fr: "Codex Galactique & Légende",
    id: "Kodeks & Legenda Galaksi",
    ko: "은하계 코덱스 및 범례",
    pt: "Códice Galáctico e Legenda",
    ru: "Галактический кодекс и легенда",
    tr: "Galaktik Kodeks ve Gösterge",
    vi: "Bộ quy tắc & Chú giải Ngân hà",
    zh: "星系法典与图例"
  },
  legend_modal_title: {
    en: "5D Galactic Manifold Codex",
    ar: "مخطوطة المشعب المجري خماسي الأبعاد",
    de: "5D-Galaxien-Mannigfaltigkeits-Kodex",
    es: "Códice de la Variedad Galáctica 5D",
    fr: "Codex de la Variété Galactique 5D",
    id: "Kodeks Manifold Galaksi 5D",
    ko: "5D 은하계 다양체 코덱스",
    pt: "Códice da Variedade Galáctica 5D",
    ru: "Кодекс 5D галактического многообразия",
    tr: "5D Galaktik Manifold Kodeksi",
    vi: "Bộ quy tắc Đa tạp Ngân hà 5D",
    zh: "5D星系流形法典"
  },
  legend_modal_subtitle: {
    en: "Astrodynamic dimensions, constellation filaments, and stellar spectral classifications.",
    ar: "الأبعاد الديناميكية الفلكية، وخيوط الأبراج، والتصنيفات الطيفية النجمية.",
    de: "Astrodynamische Dimensionen, Konstellationsfilamente und stellare Spektralklassifikationen.",
    es: "Dimensiones astrodinámicas, filamentos de constelación y clasificaciones espectrales estelares.",
    fr: "Dimensions astrodynamiques, filaments de constellations et classifications spectrales stellaires.",
    id: "Dimensi astrodinamis, filamen konstelasi, dan klasifikasi spektral bintang.",
    ko: "천체역학 차원, 별자리 필라멘트 및 항성 분광 분류.",
    pt: "Dimensões astrodinâmicas, filamentos de constelação e classificações espectrais estelares.",
    ru: "Астродинамические измерения, нити созвездий и звездные спектральные классификации.",
    tr: "Astrodinamik boyutlar, takımyıldız filamentleri ve yıldız izgesel sınıflandırmaları.",
    vi: "Các chiều thiên văn động lực, sợi chòm sao và phân loại quang phổ sao.",
    zh: "天体动力学维度、星座丝状结构与恒星光谱分类。"
  },
  legend_sec_filaments_title: {
    en: "Constellation Filaments (Connecting Lines)",
    ar: "خيوط الأبراج (الخطوط الرابطة)",
    de: "Konstellationsfilamente (Verbindungslinien)",
    es: "Filamentos de Constelación (Líneas de Conexión)",
    fr: "Filaments de Constellations (Lignes de Connexion)",
    id: "Filamen Konstelasi (Garis Penghubung)",
    ko: "별자리 필라멘트 (연결선)",
    pt: "Filamentos de Constelação (Linhas de Conexão)",
    ru: "Нити созвездий (соединительные линии)",
    tr: "Takımyıldız Filamentleri (Bağlantı Çizgileri)",
    vi: "Sợi Chòm sao (Các đường kết nối)",
    zh: "星座丝状体 (连线结构)"
  },
  legend_sec_filaments_naming: {
    en: "Dashed Filaments (Naming Nebulae): Connect commanders sharing identical clan naming prefixes (e.g., WAR_, VN_, KING_). Visualizes migration syndicates, account clusters, and alt rings.",
    ar: "الخيوط المتقطعة (سدم التسمية): تربط القادة الذين يشتركون في نفس بادئات الأسماء (مثل WAR_ أو VN_). توضح نقابات الهجرة ومجموعات الحسابات البديلة.",
    de: "Gestrichelte Filamente (Namensnebel): Verbindet Kommandanten mit identischen Clan-Namenspräfixen (z. B. WAR_, VN_, KING_). Visualisiert Migrationssyndikate und Zweitaccount-Ringe.",
    es: "Filamentos discontinuos (Nebulosas de Nombres): Conecta comandantes que comparten prefijos de clan idénticos (ej. WAR_, VN_, KING_). Visualiza sindicatos de migración y cuentas secundarias.",
    fr: "Filaments en pointillés (Nébuleuses de Noms) : Relie les commandants partageant des préfixes de clan identiques (ex. WAR_, VN_, KING_). Visualise les syndicats de migration et réseaux de multicomptes.",
    id: "Filamen Putus-putus (Nebula Penamaan): Menghubungkan komandan dengan awalan nama klan yang sama (cth. WAR_, VN_, KING_). Memvisualisasikan sindikat migrasi dan akun cadangan.",
    ko: "점선 필라멘트 (명칭 성운): 동일한 클랜 접두사(예: WAR_, VN_, KING_)를 공유하는 사령관들을 연결합니다. 이민 신디케이트와 부계정 네트워크를 시각화합니다.",
    pt: "Filamentos tracejados (Nebulosas de Nomes): Conecta comandantes que compartilham prefixos de clã idênticos (ex: WAR_, VN_, KING_). Visualiza sindicatos de migração e anéis de contas secundárias.",
    ru: "Пунктирные нити (именные туманности): соединяют командиров с одинаковыми клановыми префиксами (напр. WAR_, VN_, KING_). Наглядно показывают миграционные синдикаты и сети твинков.",
    tr: "Kesikli Filamentler (Adlandırma Bulutsuları): Aynı klan adlandırma ön eklerini (örn. WAR_, VN_, KING_) paylaşan komutanları bağlar. Göç birliklerini ve yan hesap ağlarını gösterir.",
    vi: "Sợi đứt nét (Tinh vân Đặt tên): Liên kết các chỉ huy có chung tiền tố tên clan (ví dụ: WAR_, VN_, KING_). Hiển thị các nhóm di cư và mạng lưới tài khoản phụ.",
    zh: "虚线丝状体 (命名星云): 连接具有相同家族/命名门派前缀的统帅 (例如 WAR_、VN_、KING_)。清晰揭示跨国移民财团、家族号池与小号网络。"
  },
  legend_sec_filaments_alliance: {
    en: "Solid Filaments (Alliance Constellations): Gravitational tethers linking alliance members directly to their top 1-2 Anchor rally leaders. Reveals internal alliance cohesion and rally authority.",
    ar: "الخيوط المتصلة (أبراج التحالف): روابط جاذبية تصل أعضاء التحالف مباشرة بأبرز قادة الحشود في التحالف. تكشف مدى تماسك التحالف وسلسلة القيادة.",
    de: "Durchgezogene Filamente (Allianz-Konstellationen): Gravitative Verbindungen, die Allianzmitglieder direkt mit ihren 1–2 stärksten Rallye-Anführern verknüpfen. Zeigt interne Allianzkohäsion.",
    es: "Filamentos continuos (Constelaciones de Alianza): Enlaces gravitacionales que unen a los miembros de la alianza con sus 1 o 2 líderes principales de asamblea. Muestra la cohesión de la alianza.",
    fr: "Filaments continus (Constellations d'Alliance) : Liens gravitationnels reliant les membres d'une alliance à leurs 1 ou 2 meneurs de ralliement principaux. Révèle la cohésion interne de l'alliance.",
    id: "Filamen Solid (Konstelasi Aliansi): Tambatan gravitasi yang menghubungkan anggota aliansi langsung ke 1-2 pemimpin reli teratas. Menampilkan kohesi internal aliansi.",
    ko: "실선 필라멘트 (연맹 별자리): 연맹원들을 상위 1~2명의 집결 리더(앵커)에게 직접 중력적으로 연결합니다. 연맹 내부의 응집력과 지휘 계통을 드러냅니다.",
    pt: "Filamentos contínuos (Constelações de Aliança): Ligações gravitacionais que conectam os membros da aliança diretamente aos seus 1 ou 2 líderes principais de comício. Revela a coesão interna da aliança.",
    ru: "Сплошные нити (созвездия альянса): гравитационные связи, соединяющие участников альянса с их главными лидерами сборов. Демонстрируют сплоченность и командную структуру альянса.",
    tr: "Düz Filamentler (İttifak Takımyıldızları): İttifak üyelerini doğrudan en üstteki 1-2 Ralli liderine bağlayan kütleçekimsel bağlar. İttifak içi bağı ve liderlik yapısını ortaya çıkarır.",
    vi: "Sợi liền nét (Chòm sao Liên minh): Dây buộc trọng lực liên kết trực tiếp các thành viên liên minh với 1-2 đội trưởng tập hợp nòng cốt. Thể hiện tính gắn kết nội bộ liên minh.",
    zh: "实线丝状体 (联盟星座): 将联盟成员直接引力锚定到全盟最强的1-2位核心集结手/巨鲸上。展现联盟内部凝聚力与战役指挥中枢。"
  },
  legend_sec_filaments_spectral: {
    en: "Spectral Stellar Class Mode: Removes filament lines for an unobstructed view of stellar classifications, combat purity, and raw kingdom distribution.",
    ar: "وضع الفئات النجمية الطيفية: يزيل خطوط الخيوط لتوفير رؤية واضحة للتصنيفات النجمية ونقاء القتال وتوزيع المملكة.",
    de: "Spektraler Sternklassenmodus: Entfernt Filamentlinien für eine ungehinderte Sicht auf Sternklassifikationen, Kampfreinheit und Rosterverteilung.",
    es: "Modo Espectral de Clases Estelares: Elimina las líneas de filamentos para una vista despejada de las clasificaciones estelares y pureza de combate.",
    fr: "Mode Classe Stellaire Spectrale : Supprime les lignes de filaments pour une vue dégagée des classifications stellaires et de la pureté au combat.",
    id: "Mode Kelas Spektral Bintang: Menghilangkan garis filamen untuk tampilan jelas klasifikasi bintang dan kemurnian tempur.",
    ko: "항성 분광 분류 모드: 필라멘트 선을 숨겨 항성 분류, 전투 순도 및 왕국 전체의 분포를 왜곡 없이 선명하게 관찰합니다.",
    pt: "Modo de Classe Estelar Espectral: Remove linhas de filamentos para uma visão desobstruída das classificações estelares e pureza de combate.",
    ru: "Режим спектральных классов: скрывает нити для беспрепятственного обзора звездных классификаций и боевой чистоты королевства.",
    tr: "İzgesel Yıldız Sınıfı Modu: Yıldız sınıflandırmalarını ve savaş saflığını engelsiz görebilmek için filament çizgilerini kaldırır.",
    vi: "Chế độ Quang phổ Sao: Ẩn các đường sợi để nhìn rõ phân loại sao, độ thuần chiến đấu và mật độ vương quốc.",
    zh: "光谱恒星分类模式: 隐藏全部丝状连线，呈现最清晰纯粹的恒星战斗类型分布与战阵纯度。"
  },
  legend_sec_dims_title: {
    en: "The 5 Dimensions of the Manifold",
    ar: "الأبعاد الخمسة للمشعب",
    de: "Die 5 Dimensionen der Mannigfaltigkeit",
    es: "Las 5 Dimensiones de la Variedad",
    fr: "Les 5 Dimensions de la Variété",
    id: "5 Dimensi Manifold",
    ko: "다양체의 5가지 차원",
    pt: "As 5 Dimensões da Variedade",
    ru: "5 измерений многообразия",
    tr: "Manifoldun 5 Boyutu",
    vi: "5 Chiều của Đa tạp",
    zh: "流形五维坐标体系"
  },
  tooltip_dim1_title: {
    en: "Dim 1 (X): War Orbit",
    ar: "البعد 1 (X): مدار الحرب",
    de: "Dim 1 (X): Kriegsorbit",
    es: "Dim 1 (X): Órbita Bélica",
    fr: "Dim 1 (X) : Orbite de Guerre",
    id: "Dim 1 (X): Orbit Perang",
    ko: "차원 1 (X): 전쟁 궤도",
    pt: "Dim 1 (X): Órbita de Guerra",
    ru: "Изм 1 (X): Военная орбита",
    tr: "Boyut 1 (X): Savaş Yörüngesi",
    vi: "Chiều 1 (X): Quỹ đạo Chiến tranh",
    zh: "维度 1 (X): 战阵轨道"
  },
  tooltip_dim1_desc: {
    en: "Principal Component 1 (PCA). Measures active kinetic warfare exertion (T4/T5 kills + dead troops vs total power). Right (+X) = Frontline fighters. Left (-X) = Farmers / peaceful gatherers.",
    ar: "المكون الرئيسي 1 (PCA). يقيس المجهود الحربي الفعلي (قتلى T4/T5 + القوات الميتة). اليمين (+X) = مقاتلو الخطوط الأمامية. اليسار (-X) = المزارعون والجامعون.",
    de: "Hauptkomponente 1 (PCA). Misst aktiven Kriegseinsatz (T4/T5-Kills + gefallene Truppen). Rechts (+X) = Frontkämpfer. Links (-X) = Farmer und Sammler.",
    es: "Componente Principal 1 (PCA). Mide el esfuerzo bélico activo (bajas T4/T5 + tropas muertas). Derecha (+X) = Guerreros de primera línea. Izquierda (-X) = Granjeros.",
    fr: "Composante Principale 1 (PCA). Mesure l'effort de guerre réel (kills T4/T5 + troupes mortes). Droite (+X) = Combattants de première ligne. Gauche (-X) = Fermiers.",
    id: "Komponen Utama 1 (PCA). Mengukur upaya tempur aktif (bunuhan T4/T5 + pasukan gugur). Kanan (+X) = Pejuang garis depan. Kiri (-X) = Petani/pengumpul.",
    ko: "주성분 1 (PCA). 능동적인 전쟁 교전 강도(T4/T5 킬 + 전사자 비율)를 측정합니다. 오른쪽(+X) = 최전선 전투원. 왼쪽(-X) = 파밍 및 비전투원.",
    pt: "Componente Principal 1 (PCA). Mede o esforço de guerra ativo (baixas T4/T5 + tropas mortas). Direita (+X) = Guerreiros de linha de frente. Esquerda (-X) = Agricultores.",
    ru: "Главная компонента 1 (PCA). Измеряет боевую активность (убийства T4/T5 + погибшие войска). Справа (+X) = бойцы передовой. Слева (-X) = мирные сборщики и фермеры.",
    tr: "Temel Bileşen 1 (PCA). Aktif savaş eforunu ölçer (T4/T5 öldürme + ölen askerler). Sağ (+X) = Ön cephe savaşçıları. Sol (-X) = Çiftçiler ve toplayıcılar.",
    vi: "Thành phần Chính 1 (PCA). Đo lường mức độ tham chiến thực tế (hạ gục T4/T5 + tử trận). Bên phải (+X) = Tiền tuyến. Bên trái (-X) = Nông dân cày cuốc.",
    zh: "第1主成分 (PCA)。衡量绝对战场交战强度 (T4/T5击杀 + 阵亡将士与战力比)。右侧 (+X) = 浴血前锋主力。左侧 (-X) = 和平采集农夫。"
  },
  tooltip_dim2_title: {
    en: "Dim 2 (Y): Celestial Altitude",
    ar: "البعد 2 (Y): الارتفاع السماوي",
    de: "Dim 2 (Y): Himmlische Höhe",
    es: "Dim 2 (Y): Altitud Celeste",
    fr: "Dim 2 (Y) : Altitude Céleste",
    id: "Dim 2 (Y): Ketinggian Langit",
    ko: "차원 2 (Y): 천체 고도",
    pt: "Dim 2 (Y): Altitude Celeste",
    ru: "Изм 2 (Y): Небесная высота",
    tr: "Boyut 2 (Y): Göksel Yükseklik",
    vi: "Chiều 2 (Y): Độ cao Thiên thể",
    zh: "维度 2 (Y): 苍穹海拔"
  },
  tooltip_dim2_desc: {
    en: "Principal Component 2 (PCA). Measures structural scale and economic height. High (+Y, Top) = Mega-whales and rally anchors. Low (-Y, Bottom) = Mid/low-power support governors.",
    ar: "المكون الرئيسي 2 (PCA). يقيس الحجم الهيكلي والقوة الاقتصادية. الأعلى (+Y) = كبار الحيتان وركائز الحشود. الأسفل (-Y) = أصحاب القوة المتوسطة والمنخفضة.",
    de: "Hauptkomponente 2 (PCA). Misst strukturellen Umfang und Wirtschaftskraft. Oben (+Y) = Mega-Wale und Rallye-Anker. Unten (-Y) = Kleinere Support-Accounts.",
    es: "Componente Principal 2 (PCA). Mide la escala estructural y poder. Arriba (+Y) = Mega-ballenas y anclas de asamblea. Abajo (-Y) = Cuentas secundarias y apoyo.",
    fr: "Composante Principale 2 (PCA). Mesure la puissance brute et l'échelle économique. Haut (+Y) = Méga-baleines et piliers. Bas (-Y) = Comptes de soutien.",
    id: "Komponen Utama 2 (PCA). Mengukur skala kekuatan dan ekonomi. Atas (+Y) = Paus raksasa dan jangkar reli. Bawah (-Y) = Akun pendukung.",
    ko: "주성분 2 (PCA). 구조적 규모와 경제적 높이(순수 전투력 및 기술)를 측정합니다. 상단(+Y) = 메가 고래 및 핵심 앵커. 하단(-Y) = 중소형 지원 계정.",
    pt: "Componente Principal 2 (PCA). Mede a escala estrutural e poderio econômico. Cima (+Y) = Mega-baleias e âncoras de comício. Baixo (-Y) = Contas de apoio menores.",
    ru: "Главная компонента 2 (PCA). Отражает мощь и экономический масштаб. Вверху (+Y) = мега-киты и якоря сборов. Внизу (-Y) = аккаунты поддержки.",
    tr: "Temel Bileşen 2 (PCA). Yapısal büyüklüğü ve gücü ölçer. Yukarı (+Y) = Mega balinalar ve ralli direkleri. Aşağı (-Y) = Orta/alt kademe destek hesapları.",
    vi: "Thành phần Chính 2 (PCA). Đo quy mô sức mạnh và kinh tế. Trên (+Y) = Đại cá voi và trụ cột tập hợp. Dưới (-Y) = Tài khoản hỗ trợ.",
    zh: "第2主成分 (PCA)。衡量统帅宏观战力与科技底蕴。上方 (+Y) = 顶级巨鲸与集结支柱。下方 (-Y) = 中小战力支援部队。"
  },
  tooltip_dim3_title: {
    en: "Dim 3 (Z): Social Gravity",
    ar: "البعد 3 (Z): جاذبية الدعم الاجتماعي",
    de: "Dim 3 (Z): Soziale Gravitation",
    es: "Dim 3 (Z): Gravedad Social",
    fr: "Dim 3 (Z) : Gravité Sociale",
    id: "Dim 3 (Z): Gravitasi Sosial",
    ko: "차원 3 (Z): 사회적 중력",
    pt: "Dim 3 (Z): Gravidade Social",
    ru: "Изм 3 (Z): Социальная гравитация",
    tr: "Boyut 3 (Z): Sosyal Çekim",
    vi: "Chiều 3 (Z): Trọng lực Xã hội",
    zh: "维度 3 (Z): 军团重力"
  },
  tooltip_dim3_desc: {
    en: "Principal Component 3 (PCA). Measures logistics, resource assistance transferred, and alliance helps. High (+Z, Foreground) = Kingdom supply backbone.",
    ar: "المكون الرئيسي 3 (PCA). يقيس الخدمات اللوجستية، والمساعدات الموردة، ومساعدات التحالف. الأمام (+Z) = العمود الفقري لإمدادات المملكة.",
    de: "Hauptkomponente 3 (PCA). Misst Logistik, Ressourcentransfers und Allianz-Hilfen. Vordergrund (+Z) = Versorgungsrückgrat des Königreichs.",
    es: "Componente Principal 3 (PCA). Mide logística, asistencia de recursos enviada y ayudas de alianza. Frente (+Z) = Columna vertebral de suministros.",
    fr: "Composante Principale 3 (PCA). Mesure la logistique, les transferts de ressources et aides. Premier plan (+Z) = Pilier de ravitaillement du royaume.",
    id: "Komponen Utama 3 (PCA). Mengukur logistik, bantuan sumber daya yang dikirim, dan bantuan aliansi. Depan (+Z) = Tulang punggung pasokan.",
    ko: "주성분 3 (PCA). 군수 보급, 자원 원조량 및 연맹 지원 횟수를 측정합니다. 전면(+Z) = 왕국의 보급망을 지탱하는 물류의 중추.",
    pt: "Componente Principal 3 (PCA). Mede a logística, assistência de recursos transferida e ajudas de aliança. Frente (+Z) = Coluna vertebral de suprimentos.",
    ru: "Главная компонента 3 (PCA). Оценивает логистику, отправку ресурсов и помощь альянсу. Впереди (+Z) = снабженческий хребет королевства.",
    tr: "Temel Bileşen 3 (PCA). Lojistiği, aktarılan kaynak yardımını ve ittifak yardımlarını ölçer. Ön plan (+Z) = Krallığın ikmal omurgası.",
    vi: "Thành phần Chính 3 (PCA). Đo hậu cần, viện trợ tài nguyên và hỗ trợ liên minh. Phía trước (+Z) = Trụ cột tiếp tế của vương quốc.",
    zh: "第3主成分 (PCA)。衡量后勤保障力、资源输送总量与联盟协助。近景 (+Z) = 王国战略补给中枢与坚实后盾。"
  },
  tooltip_dim4_title: {
    en: "Dim 4 (W): Combat Purity",
    ar: "البعد 4 (W): نقاء القتال",
    de: "Dim 4 (W): Kampfreinheit",
    es: "Dim 4 (W): Pureza de Combate",
    fr: "Dim 4 (W) : Pureté au Combat",
    id: "Dim 4 (W): Kemurnian Tempur",
    ko: "차원 4 (W): 전투 순도",
    pt: "Dim 4 (W): Pureza de Combate",
    ru: "Изм 4 (W): Боевая чистота",
    tr: "Boyut 4 (W): Savaş Saflığı",
    vi: "Chiều 4 (W): Độ thuần Chiến đấu",
    zh: "维度 4 (W): 战阵纯度"
  },
  tooltip_dim4_desc: {
    en: "4D Hyperplane Tesseract Coordinate (PC4). Distinguishes genuine battlefield impact from stat-padding (T1 duels). Use the 4D Slider or 'Drift' to stereographically rotate the cluster.",
    ar: "إحداثي تيسراكت رباعي الأبعاد (PC4). يميز تأثير المعركة الحقيقي عن تضخيم الإحصائيات (قتال T1). استخدم شريط 4D أو 'الانجراف' لتدوير المشعب.",
    de: "4D-Hyperwürfel-Koordinate (PC4). Unterscheidet echten Kampfwert von künstlich aufgeblähten Stats (T1-Duelle). Nutzen Sie den 4D-Schieberegler oder 'Drift'.",
    es: "Coordenada del Teseracto 4D (PC4). Distingue el impacto real en combate del relleno de estadísticas (duelos T1). Usa el control deslizante 4D o 'Deriva'.",
    fr: "Coordonnée du Tesseract 4D (PC4). Distingue l'impact réel au combat du gonflement de stats (duels T1). Utilisez le curseur 4D ou 'Dérive'.",
    id: "Koordinat Tesseract 4D (PC4). Membedakan dampak tempur nyata dari manipulasi statistik (duel T1). Gunakan penggeser 4D atau 'Drift'.",
    ko: "4D 테서랙트 초공간 좌표 (PC4). 허위 통계 부풀리기(T1 결투작)와 실제 전장의 공헌도를 정밀하게 분리합니다. 4D 슬라이더 또는 드리프트로 회전시켜 확인하세요.",
    pt: "Coordenada do Tesseract 4D (PC4). Distingue o impacto real em combate da inflação de estatísticas (duelos T1). Use o controle 4D ou 'Deriva'.",
    ru: "Координата 4D-тессеракта (PC4). Отделяет реальный боевой вклад от накрутки статистики (дуэли T1). Используйте 4D-ползунок или дрейф для вращения.",
    tr: "4D Tesseract Koordinatı (PC4). Gerçek savaş etkisini şişirilmiş istatistiklerden (T1 düelloları) ayırır. Kümeyi döndürmek için 4D Kaydırıcıyı veya 'Sürüklenme'yi kullanın.",
    vi: "Tọa độ Siêu lập phương 4D (PC4). Phân biệt thực lực chiến đấu với việc cày điểm ảo (đấu T1). Dùng thanh trượt 4D hoặc 'Trôi' để xoay cụm.",
    zh: "4D超立方体高维坐标 (PC4)。精准剥离T1刷分水分，识别真正的纯粹战力。拖动4D滑块或开启'漂移'可在四维空间立体旋转透视。"
  },
  tooltip_dim5_title: {
    en: "Dim 5: Spectral Topology & Clan Filaments",
    ar: "البعد 5: الطوبولوجيا الطيفية وخيوط العشيرة",
    de: "Dim 5: Spektrale Topologie & Clan-Filamente",
    es: "Dim 5: Topología Espectral y Filamentos de Clan" ,
    fr: "Dim 5 : Topologie Spectrale & Filaments de Clan",
    id: "Dim 5: Topologi Spektral & Filamen Klan",
    ko: "차원 5: 분광 위상 및 클랜 필라멘트",
    pt: "Dim 5: Topologia Espectral e Filamentos de Clã",
    ru: "Изм 5: Спектральная топология и нити кланов",
    tr: "Boyut 5: İzgesel Topoloji ve Klan Filamentleri",
    vi: "Chiều 5: Cấu trúc Quang phổ & Sợi Clan",
    zh: "维度 5: 光谱拓扑与家族星轨"
  },
  tooltip_dim5_desc: {
    en: "Color-codes stellar combat archetypes and builds constellation filaments. Dashed lines link shared naming clans; solid lines anchor alliance members to their primary rally leads.",
    ar: "يصنف النجوم حسب أنماط القتال ويرسم خطوط الأبراج. الخطوط المتقطعة تصل العشائر المشتركة، والمتصلة تصل الأعضاء بقادة الحشود.",
    de: "Farbcodiert stellare Kampfarchetypen und bildet Konstellationsfilamente. Gestrichelte Linien verbinden Namensclans; durchgezogene Linien verankern Mitglieder an Rallyeleitern.",
    es: "Codifica por colores los arquetipos de combate estelares y crea filamentos. Líneas discontinuas unen clanes con el mismo nombre; líneas continuas anclan miembros a los líderes.",
    fr: "Attribue des couleurs aux archétypes de combat et trace les filaments. Pointillés pour les clans de noms ; lignes continues pour les membres reliés aux meneurs.",
    id: "Mengkodekan warna arketipe tempur bintang dan membangun filamen konstelasi. Garis putus-putus menghubungkan klan senama; garis padat menambatkan anggota ke pemimpin reli.",
    ko: "항성 전투 원형을 색상화하고 별자리 필라멘트를 형성합니다. 점선은 동일 명칭 클랜을, 실선은 연맹원을 핵심 집결 리더에게 연결합니다.",
    pt: "Codifica por cores os arquétipos de combate estelares e cria filamentos. Tracejado conecta clãs com nomes iguais; contínuo ancora membros aos líderes de comício.",
    ru: "Кодирует цветом боевые архетипы и строит нити созвездий. Пунктир соединяет именные кланы; сплошные линии крепят участников к лидерам сборов.",
    tr: "Yıldız savaş arketiplerini renklendirir ve takımyıldız filamentleri oluşturur. Kesikli çizgiler isim klanlarını; düz çizgiler üyeleri ralli liderlerine bağlar.",
    vi: "Phối màu các loại sao chiến đấu và tạo sợi chòm sao. Nét đứt nối clan chung tên; nét liền neo thành viên vào trưởng tập hợp.",
    zh: "通过恒星色彩标定战斗人格，并构建星座引力丝状网。虚线连接同名家族网络，实线将盟友引力锚定到核心集结手。"
  },
  legend_sec_spectral_title: {
    en: "Stellar Spectral Classes (Star Colors)",
    ar: "الفئات النجمية الطيفية (ألوان النجوم)",
    de: "Stellare Spektralklassen (Sternfarben)",
    es: "Clases Espectrales Estelares (Colores de Estrellas)",
    fr: "Classes Spectrales Stellaires (Couleurs d'Étoiles)",
    id: "Kelas Spektral Bintang (Warna Bintang)",
    ko: "항성 분광 분류 (별의 색상)",
    pt: "Classes Espectrais Estelares (Cores das Estrelas)",
    ru: "Звездные спектральные классы (цвета звезд)",
    tr: "Yıldız İzgesel Sınıfları (Yıldız Renkleri)",
    vi: "Các lớp Quang phổ Sao (Màu sắc Sao)",
    zh: "恒星光谱分类 (星辰色彩学)"
  },
  legend_star_o_title: {
    en: "O-Hypergiant (Cyan Star)",
    ar: "العملاق الفائق O (نجم سماوي)",
    de: "O-Hyperriese (Cyanfarbener Stern)",
    es: "O-Hipergigante (Estrella Cian)",
    fr: "O-Hypergéante (Étoile Cyan)",
    id: "O-Hiperaksasa (Bintang Sian)",
    ko: "O형 극대거성 (청록색 별)",
    pt: "O-Hipergigante (Estrela Ciano)",
    ru: "O-гипергигант (бирюзовая звезда)",
    tr: "O-Hiperdevi (Camgöbeği Yıldız)",
    vi: "O-Siêu sao khổng lồ (Sao Xanh lơ)",
    zh: "O型特超巨星 (青蓝耀星)"
  },
  legend_star_o_desc: {
    en: "Frontline Blood Martyrs: Elite combat contribution with top-tier T4/T5 kills, immense dead troops, and very low T1 duel padding. Battlefield leaders.",
    ar: "شهداء دماء الخطوط الأمامية: مساهمة قتالية نخبوية مع قتلى T4/T5 هائلين وموتى مرتفعين دون تضخيم T1.",
    de: "Frontkämpfer-Blutzeugen: Höchste T4/T5-Kills, enorme gefallene Truppen und minimale T1-Duelle. Echte Schlachtenlenker.",
    es: "Mártires de Sangre de Primera Línea: Aporte de combate élite con altas bajas T4/T5, muchas tropas muertas y sin relleno T1.",
    fr: "Martyrs du Front : Contribution d'élite au combat avec éliminations T4/T5 élevées, pertes héroïques et pas de rembourrage T1.",
    id: "Martir Garis Depan: Kontribusi tempur elit dengan bunuhan T4/T5 tinggi, pasukan gugur masif, dan tanpa manipulasi T1.",
    ko: "최전선 선봉 순교자: 압도적인 T4/T5 처치와 막대한 전사자 수를 기록하며 T1 작업이 전무한 왕국의 진정한 결사대.",
    pt: "Mártires de Linha de Frente: Contribuição de combate de elite com muitas baixas T4/T5, tropas mortas expressivas e sem enchimento T1.",
    ru: "Мученики передовой: элитный боевой вклад с высокими убийствами T4/T5, огромными потерями и без накрутки T1.",
    tr: "Ön Cephe Şehitleri: Yüksek T4/T5 öldürme, muazzam ölen asker ve sıfıra yakın T1 şişirmesi ile elit savaş katkısı.",
    vi: "Liệt sĩ Tiền tuyến: Đóng góp chiến đấu xuất sắc với điểm hạ T4/T5 cao, tử trận lớn và không cày ảo T1.",
    zh: "前线浴血先锋: 拥有极高的T4/T5真实击杀与阵亡将士，无任何T1刷分作弊，真正的王国定海神针。"
  },
  legend_star_b_title: {
    en: "B-Pulsar (Electric Purple Star)",
    ar: "نجم B النباض (نجم أرجواني كهربي)",
    de: "B-Pulsar (Elektrisch violetter Stern)",
    es: "B-Púlsar (Estrella Púrpura Eléctrica)",
    fr: "B-Pulsar (Étoile Violette Électrique)",
    id: "B-Pulsar (Bintang Ungu Elektrik)",
    ko: "B형 펄서 (전기 보라색 별)",
    pt: "B-Pulsar (Estrela Púrpura Elétrica)",
    ru: "B-пульсар (электрическая фиолетовая звезда)",
    tr: "B-Pulsar (Elektrik Mor Yıldız)",
    vi: "B-Sao xung (Sao Tím Điện)",
    zh: "B型脉冲星 (电光紫星)"
  },
  legend_star_b_desc: {
    en: "Tactical Mercenaries: High kill-point efficiency, tactical open-field engagements, and surgical troop trades.",
    ar: "المرتزقة التكتيكيون: كفاءة عالية في نقاط القتل ومناوشات ميدانية تكتيكية محسوبة بدقة.",
    de: "Taktische Söldner: Hohe Killpoint-Effizienz, taktische Feldschlachten und präzise Truppentausche.",
    es: "Mercenarios Tácticos: Alta eficiencia de puntos de muerte, batallas a campo abierto tácticas y quirúrgicas.",
    fr: "Mercenaires Tactiques : Haute efficacité en points d'élimination et échanges chirurgicaux sur le terrain.",
    id: "Tentara Bayaran Taktis: Efisiensi poin bunuh tinggi, pertempuran lapangan terbuka yang taktis dan terukur.",
    ko: "전술 용병: 뛰어난 킬포인트 교환비와 기동성 높은 오픈필드 정밀 타격에 특화된 정예 전력.",
    pt: "Mercenários Táticos: Alta eficiência em pontos de morte e confrontos de campo aberto cirúrgicos.",
    ru: "Тактические наемники: высокая эффективность очков убийств, точные полевые бои и выверенный размен войсками.",
    tr: "Taktiksel Paralı Askerler: Yüksek öldürme puanı verimliliği ve cerrahi açık alan çatışmaları.",
    vi: "Lính đánh thuê Chiến thuật: Hiệu suất điểm hạ gục cao, giao tranh mở có tính toán chính xác.",
    zh: "战术佣兵: 极高战损交换比，擅长野战微操与精确打击，行踪敏捷的高效收割者。"
  },
  legend_star_m_title: {
    en: "M-Red Supergiant (Ruby Red Star)",
    ar: "العملاق الأحمر M (نجم أحمر ياقوتي)",
    de: "M-Roter Überriese (Rubinroter Stern)",
    es: "M-Supergigante Roja (Estrella Rojo Rubí)",
    fr: "M-Supergéante Rouge (Étoile Rouge Rubis)",
    id: "M-Superaksasa Merah (Bintang Merah Delima)",
    ko: "M형 적색초거성 (루비 레드 별)",
    pt: "M-Supergigante Vermelha (Estrela Vermelho Rubi)",
    ru: "M-красный сверхгигант (рубиново-красная звезда)",
    tr: "M-Kızıl Üstdevi (Yakut Kırmızı Yıldız)",
    vi: "M-Siêu khổng lồ Đỏ (Sao Đỏ Ruby)",
    zh: "M型红超巨星 (血红巨星)"
  },
  legend_star_m_desc: {
    en: "Padded Whales: High raw power with elevated T1 duel ratios and disproportionately low dead troops. High structural weight, questionable war output.",
    ar: "الحيتان المبطنة: قوة خام عالية مع نسب مرتفعة لمبارزات T1 وموتى قليلين جداً. وزن ثقيل ومردود حربي مشكوك فيه.",
    de: "Aufgeblähte Wale: Hohe Macht mit übermäßig vielen T1-Duellen und unverhältnismäßig wenigen Toten. Totes Gewicht.",
    es: "Ballenas Rellenas: Gran poder bruto con alto porcentaje de duelos T1 y bajas tropas muertas. Peso sin aporte real.",
    fr: "Baleines Gonflées : Puissance brute élevée mais ratios de duels T1 gonflés et pertes anormalement basses. Poids mort.",
    id: "Paus Menggembung: Kekuatan besar dengan rasio duel T1 tinggi dan pasukan gugur sangat rendah. Beban pasif.",
    ko: "부풀려진 고래: 높은 순수 전투력을 지녔으나 T1 결투작 비율이 높고 전사자가 현저히 적어 실전성이 의심되는 계정.",
    pt: "Baleias Infladas: Poder bruto alto com muitos duelos T1 e pouquíssimas tropas mortas. Peso morto no reino.",
    ru: "Дутые киты: высокая мощь при огромной доле дуэлей T1 и непропорционально малых потерях. Балласт в KvK.",
    tr: "Şişirilmiş Balinalar: Yüksek güç, ancak aşırı T1 düellosu ve orantısız derecede az ölen asker. Ağır ama verimsiz.",
    vi: "Cá voi Điểm ảo: Lực chiến cao nhưng cày T1 nhiều và tỷ lệ tử trận thấp bất thường. Tải trọng chết.",
    zh: "水分虚浮巨鲸: 战力极高但伴随大量低级T1假决斗刷分，阵亡极低，典型的虚胖型军备负担。"
  },
  legend_star_d_title: {
    en: "D-White Dwarf (Silver/Slate Star)",
    ar: "القزم الأبيض D (نجم فضي)",
    de: "D-Weißer Zwerg (Silberner Stern)",
    es: "D-Enana Blanca (Estrella Plateada)",
    fr: "D-Naine Blanche (Étoile Argentée)",
    id: "D-Katai Putih (Bintang Perak)",
    ko: "D형 백색왜성 (은빛 별)",
    pt: "D-Anã Branca (Estrela Prateada)",
    ru: "D-белый карлик (серебристая звезда)",
    tr: "D-Beyaz Cüce (Gümüş Yıldız)",
    vi: "D-Sao lùn Trắng (Sao Bạc)",
    zh: "D型白矮星 (银灰矮星)"
  },
  legend_star_d_desc: {
    en: "Automated Gatherers / Farm Bots: High resource gathering and assistance volume with virtually zero combat casualties.",
    ar: "الجامعون الآليون / بوتات المزارع: جمع موارد عالٍ ومساعدات مرتفعة مع انعدام الخسائر القتالية تقريباً.",
    de: "Automatisierte Sammler / Farm-Bots: Hohe Ressourcensammlung und Unterstützung, jedoch praktisch keine Kampfverluste.",
    es: "Recolectores Automatizados / Bots de Granja: Gran volumen de recolección y asistencia sin bajas de combate.",
    fr: "Récolteurs Automatisés / Bots de Ferme : Forte récolte et transferts de ressources sans quasi aucune perte au combat.",
    id: "Pengumpul Otomatis / Bot Ladang: Pengumpulan dan bantuan sumber daya tinggi dengan hampir nol korban tempur.",
    ko: "자동 채집기 / 파밍 봇: 높은 자원 채집량과 자원 원조를 수행하지만 전투 사상자가 전무한 경제용 계정.",
    pt: "Coletores Automatizados / Bots de Farm: Alta coleta e assistência de recursos com quase nenhuma perda em batalha.",
    ru: "Автоматизированные сборщики / фермоботы: высокий сбор ресурсов и передачи, но практически нулевые боевые потери.",
    tr: "Otomatik Toplayıcılar / Çiftlik Botları: Yüksek kaynak toplama ve yardım hacmi, sıfıra yakın savaş kaybı.",
    vi: "Thu thập Tự động / Bot Nông trại: Thu hoạch và viện trợ tài nguyên cao với thương vong chiến đấu gần như bằng không.",
    zh: "自动化采集器 / 农夫号: 具备极高的资源采集与王国运输量，但几乎无任何交火战损。"
  },
  legend_close: {
    en: "Close Codex",
    ar: "إغلاق المخطوطة",
    de: "Kodex schließen",
    es: "Cerrar Códice",
    fr: "Fermer le Codex",
    id: "Tutup Kodeks",
    ko: "코덱스 닫기",
    pt: "Fechar Códice",
    ru: "Закрыть кодекс",
    tr: "Kodeksi Kapat",
    vi: "Đóng Bộ quy tắc",
    zh: "关闭法典"
  }
};

locales.forEach(loc => {
  const filePath = path.join(__dirname, '..', 'src', 'messages', `${loc}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.ProjectCerberus) {
    data.ProjectCerberus = {};
  }

  Object.entries(translations).forEach(([key, map]) => {
    data.ProjectCerberus[key] = map[loc] || map['en'];
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${loc}.json with ${Object.keys(translations).length} keys.`);
});
