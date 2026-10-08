const fs = require('fs');
const path = require('path');

const locales = ['en', 'ar', 'de', 'es', 'fr', 'id', 'ko', 'pt', 'ru', 'tr', 'vi', 'zh'];

const translations = {
  legend_sec_blackhole_title: {
    en: "Gravitational Singularities (Supermassive Black Holes)",
    ar: "التفردات الثقالية (الثقوب السوداء الهائلة)",
    de: "Gravitative Singularitäten (Supermassereiche Schwarze Löcher)",
    es: "Singularidades Gravitacionales (Agujeros Negros Supermasivos)",
    fr: "Singularités Gravitationnelles (Trous Noirs Supermassifs)",
    id: "Singularitas Gravitasi (Lubang Hitam Supermasif)",
    ko: "중력 특이점 (초거대 블랙홀)",
    pt: "Singularidades Gravitacionais (Buracos Negros Supermassivos)",
    ru: "Гравитационные сингулярности (сверхмассивные черные дыры)",
    tr: "Kütleçekimsel Tekillikler (Süper Kütleli Kara Delikler)",
    vi: "Điểm kỳ dị Trọng lực (Lỗ đen Siêu khối lượng)",
    zh: "引力奇点 (超大质量黑洞)"
  },
  legend_sec_blackhole_desc: {
    en: "When a governor sustains catastrophic battlefield sacrifice (millions of dead troops), their star undergoes gravitational collapse into a Supermassive Black Hole. An obsidian void core (event horizon) surrounded by a blazing relativistic accretion disk and polar plasma jets.",
    ar: "عندما يقدم القائد تضحيات ميدانية كارثية (ملايين القوات الميتة)، ينهار نجمه تحت وطأة الجاذبية إلى ثقب أسود هائل. نواة فراغية سوداء يحيط بها قرص تراكمي متوهج ونفاثات بلازما قطبية.",
    de: "Wenn ein Kommandant katastrophale Schlachtfeldopfer erbringt (Millionen gefallene Truppen), kollabiert sein Stern gravitativ zu einem Schwarzen Loch. Ein pechschwarzer Ereignishorizont umgeben von einer relativistischen Akkretionsscheibe und Polarjets.",
    es: "Cuando un gobernador sufre un sacrificio catastrófico en batalla (millones de tropas muertas), su estrella colapsa en un Agujero Negro Supermasivo. Un horizonte de sucesos de vacío rodeado por un disco de acreción ardiente y chorros polares.",
    fr: "Lorsqu'un gouverneur subit un sacrifice héroïque massif (millions de troupes mortes), son étoile s'effondre en un Trou Noir Supermassif. Un horizon des événements noir entouré d'un disque d'accrétion ardent et de jets de plasma.",
    id: "Ketika seorang komandan melakukan pengorbanan medan perang masif (jutaan pasukan gugur), bintangnya runtuh menjadi Lubang Hitam Supermasif. Inti kehampaan hitam dikelilingi cakram akresi relativistik menyala dan semburan plasma polar.",
    ko: "사령관이 전장에서 괴멸적인 희생(수백만 명 이상의 전사자)을 치르면, 항성이 중력 붕괴를 일으켜 초거대 블랙홀로 변모합니다. 칠흑 같은 사건의 지평선 주위로 불타는 상대론적 강착원반과 양극 플라즈마 제트가 회전합니다.",
    pt: "Quando um governador sofre sacrifício catastrófico em batalha (milhões de tropas mortas), sua estrela colapsa em um Buraco Negro Supermassivo. Um horizonte de eventos negro cercado por um disco de acreção incandescente e jatos polares.",
    ru: "Когда командир несет колоссальные боевые потери (миллионы погибших войск), его звезда переживает гравитационный коллапс в сверхмассивную черную дыру. Черный горизонт событий в кольце раскаленного аккреционного диска и полярных джетов.",
    tr: "Bir komutan savaş alanında muazzam bir fedakarlık gösterdiğinde (milyonlarca ölen asker), yıldızı kütleçekimsel çöküş yaşayarak Süper Kütleli Kara Deliğe dönüşür. Akresyon diski ve kutup jetleriyle çevrili zifiri karanlık bir olay ufku.",
    vi: "Khi một chỉ huy chịu tổn thất chiến trường khổng lồ (hàng triệu lính tử trận), ngôi sao của họ sẽ suy sụp hấp dẫn thành Lỗ đen Siêu khối lượng. Một vùng chân không đen kịt bao quanh bởi đĩa bồi tụ rực lửa và tia plasma cực.",
    zh: "当统帅在战场上付出极其惨烈的牺牲 (数百万以上的阵亡将士) 时，其恒星发生灾难性引力坍缩，化作超大质量黑洞。漆黑纯粹的视界核心被旋转炽热的相对论吸积盘与极向等离子体喷流环绕。"
  },
  legend_sec_sizing_title: {
    en: "Dynamic Size & Luminosity Metrics",
    ar: "مقاييس الحجم واللمعان الديناميكي",
    de: "Dynamische Größen- und Helligkeitsmetriken",
    es: "Métricas de Tamaño y Luminosidad Dinámica",
    fr: "Métriques Dynamiques de Taille et Luminosité",
    id: "Metrik Ukuran & Luminositas Dinamis",
    ko: "동적 크기 및 광도 지표",
    pt: "Métricas de Tamanho e Luminosidade Dinâmica",
    ru: "Метрики динамического размера и светимости" ,
    tr: "Dinamik Boyut ve Parlaklık Metrikleri",
    vi: "Số liệu Kích thước & Độ sáng Động",
    zh: "动态体积与光度演化机制"
  },
  legend_sec_sizing_desc: {
    en: "Star Size is scaled by Governor Power (2px dwarf to 9px hypergiant). Star Luminosity & Pulse Speed reflect War Exertion: high-activity warriors burn with radiant white incandescence and rapid solar flares, while inactive farmers and stat-padders dim into cold embers.",
    ar: "يتدرج حجم النجم حسب قوة القائد (من 2 بكسل إلى 9 بكسل). يعكس لمعان النجم وسرعة نبضه المجهود الحربي: المحاربون النشطون يتوهجون ببياض ساطع ونبضات سريعة، بينما يخفت المزارعون غير النشطين إلى جمرات باردة.",
    de: "Die Sterngröße skaliert mit der Macht (2px Zwerg bis 9px Hyperriese). Helligkeit & Pulsieren spiegeln den Kriegseinsatz wider: Aktive Krieger leuchten weißglühend mit schnellen Fackeln; inaktive Farmer verblassen zu kalter Asche.",
    es: "El tamaño estelar escala con el poder del gobernador (enanas de 2px a hipergigantes de 9px). La luminosidad y pulsación reflejan el esfuerzo bélico: guerreros activos arden incandescentes; granjeros inactivos se apagan como brasas frías.",
    fr: "La taille stellaire varie avec la puissance (naines 2px à hypergéantes 9px). La luminosité et pulsations reflètent l'effort de guerre : combattants ardents et éclatants vs fermiers inactifs estompés en braises froides.",
    id: "Ukuran bintang diskalakan oleh Kekuatan Gubernur (katai 2px hingga hiperaksasa 9px). Luminositas & denyut mencerminkan Upaya Perang: prajurit aktif bersinar pijar putih dengan denyut cepat, sementara akun pasif meredup jadi bara dingin.",
    ko: "항성 크기는 사령관 전투력에 비례하여 동적으로 팽창합니다 (2px 왜성부터 9px 극대거성). 광도와 박동 속도는 참전 강도를 반영합니다: 맹렬한 전투원은 백열광과 강력한 플레어를 방출하며, 비전투 파밍 계정은 차가운 잔불처럼 어둡게 식어갑니다.",
    pt: "O tamanho da estrela escala com o poder do governador (anãs de 2px a hipergigantes de 9px). A luminosidade e pulso refletem o esforço de guerra: combatentes ativos brilham intensamente; fazendeiros inativos diminuem como brasas frias.",
    ru: "Размер звезды масштабируется силой губернатора (от 2px до 9px). Светимость и пульсация отражают боевую активность: воины передовой пылают ярким белым светом, а пассивные фермеры тускнеют до холодных углей.",
    tr: "Yıldız boyutu Komutan Gücü ile ölçeklenir (2px cüceden 9px hiperdeve). Parlaklık ve nabız hızı savaş eforunu yansıtır: Aktif savaşçılar parıldayan akkor ışıkla yanarken, pasif çiftçiler soğuk közlere dönüşür.",
    vi: "Kích thước sao tỷ lệ theo Lực chiến (từ sao lùn 2px đến siêu khổng lồ 9px). Độ sáng và nhịp đập phản ánh Mức độ tham chiến: chiến binh tiền tuyến phát sáng chói lọi, trong khi tài khoản thụ động mờ dần thành tàn tro lạnh.",
    zh: "星辰体积由统帅真实战力对数缩放 (从2px矮星到9px特超巨星)。恒星光度与脉动频率深度绑定战场参战率: 高战狂人绽放炽白核聚变耀斑与高速律动，低效农夫与刷分虚胖号则黯淡冷却为冰冷余烬。"
  },
  hud_black_hole_warning: {
    en: "GRAVITATIONAL SINGULARITY // SUPERMASSIVE BLACK HOLE",
    ar: "تفرد ثقالي // ثقب أسود هائل",
    de: "GRAVITATIVE SINGULARITÄT // SUPERMASSEREICHES SCHWARZES LOCH",
    es: "SINGULARIDAD GRAVITACIONAL // AGUJERO NEGRO SUPERMASIVO",
    fr: "SINGULARITÉ GRAVITATIONNELLE // TROU NOIR SUPERMASSIF",
    id: "SINGULARITAS GRAVITASI // LUBANG HITAM SUPERMASIF",
    ko: "중력 특이점 // 초거대 블랙홀",
    pt: "SINGULARIDADE GRAVITACIONAL // BURACO NEGRO SUPERMASSIVO",
    ru: "ГРАВИТАЦИОННАЯ СИНГУЛЯРНОСТЬ // СВЕРХМАССИВНАЯ ЧЕРНАЯ ДЫРА",
    tr: "KÜTLEÇEKİMSEL TEKİLLİK // SÜPER KÜTLELİ KARA DELİK",
    vi: "ĐIỂM KỲ DỊ TRỌNG LỰC // LỖ ĐEN SIÊU KHỐI LƯỢNG",
    zh: "引力奇点 // 超大质量黑洞"
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
