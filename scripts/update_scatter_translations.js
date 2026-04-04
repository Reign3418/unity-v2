const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'ar', 'zh', 'vi', 'ko', 'ru', 'tr', 'de', 'pt', 'id'];

const data = {
    "en": {
        "ScatterPlot": {
            "diag_title": "Automated Kingdom Diagnostics (The Blunt Truth)",
            "hero_title": "Heroes",
            "hero_desc": "High Kill Points, Low Deads compared to Kingdom Avg. The most efficient garrison fighters.",
            "warrior_title": "Warriors",
            "warrior_desc": "High Kill Points, High Deads. Brutal field commanders who trade raw power for domination.",
            "slacker_title": "Slackers",
            "slacker_desc": "Neutral Baseline. Inactive, bubbled, plateaued accounts.",
            "farmer_title": "Farmers",
            "farmer_desc": "High Power Growth. Low/zero fighting. Actively hoarding infrastructure.",
            "feeder_title": "Feeders",
            "feeder_desc": "Low Kill Points, High Deads. Structurally broken behaviors that bleed Kingdom score.",
            "verdict_intro": "The AI Engine has dynamically sliced your selected timeframe into up to 5 chronological waypoints, measuring not just 'Total Growth' but the true tracking velocity and weekly reliability of each Governor. ",
            "verdict_zero_heroes": "CRITICAL WARNING: The algorithm detected absolutely zero Heroes in this scan period. Every single player who achieved above-average Kill Points simultaneously absorbed massive casualties. This is a violently bloody fighting population that trades terribly. ",
            "verdict_elite_heroes": "You have {count} highly elite Heroes anchoring your garrison defenses. Protect them at all costs. ",
            "verdict_sparse_heroes": "You have a sparse handful of Heroes ({count}). These are your only truly efficient traders; lean on them heavily for rallies. ",
            "verdict_warriors": "Your core fighting force consists of {count} Warriors. They are generating the vast majority of your points in the open field, but their hospitals are full and bleeding troops. ",
            "verdict_massive_feeders": "URGENT ACTION REQUIRED: The engine has identified a massive structural liability. There are {count} Feeders ({ratio}% of the roster) actively losing T4/T5 troops while contributing nothing. They are point-piñatas. Issue ultimata. ",
            "verdict_controlled_feeders": "You only have {count} Feeders bleeding points, which is a highly controlled liability ratio. ",
            "verdict_farmers": "Furthermore, expose the {count} Farmers who are artificially raising kingdom matchmaking weight by aggressively hoarding power while completely avoiding combat. ",
            "verdict_slackers": "Finally, you have {count} Slackers sitting at the exact kingdom baseline. They aren't growing or fighting. A massive dead-weight problem."
        }
    },
    "es": {
        "ScatterPlot": {
            "diag_title": "Diagnósticos Automatizados del Reino (La Cruda Verdad)",
            "hero_title": "Héroes",
            "hero_desc": "Altos Kill Points, Bajas Muertes. Los luchadores de guarnición más eficientes.",
            "warrior_title": "Guerreros",
            "warrior_desc": "Altos Kill Points, Altas Muertes. Comandantes de campo brutales.",
            "slacker_title": "Vagos",
            "slacker_desc": "Línea base neutral. Cuentas inactivas o estancadas.",
            "farmer_title": "Granjeros",
            "farmer_desc": "Gran crecimiento de poder. Cero combate. Acaparadores de recursos.",
            "feeder_title": "Alimentadores",
            "feeder_desc": "Bajos Kill Points, Altas Muertes. Comportamientos que desangran al Reino.",
            "verdict_intro": "El Motor de IA ha analizado dinámicamente tu periodo de tiempo... ",
            "verdict_zero_heroes": "ADVERTENCIA CRÍTICA: El algoritmo detectó cero Héroes. Población muy sangrienta. ",
            "verdict_elite_heroes": "Tienes {count} Héroes de élite anclando tus defensas. Protégelos. ",
            "verdict_sparse_heroes": "Tienes un puñado de Héroes ({count}). Son tus únicos jugadores eficientes; apóyate en ellos para las congregaciones. ",
            "verdict_warriors": "Tu fuerza principal consta de {count} Guerreros. Generan puntos pero llenan hospitales. ",
            "verdict_massive_feeders": "ACCIÓN URGENTE REQUERIDA: Hay {count} Alimentadores ({ratio}% del registro) perdiendo tropas sin aportar nada. Son piñatas para el enemigo. ",
            "verdict_controlled_feeders": "Solo tienes {count} Alimentadores, una tasa controlada. ",
            "verdict_farmers": "Has detectado {count} Granjeros que inflan el emparejamiento artificialmente. ",
            "verdict_slackers": "Finalmente, tienes {count} Vagos inactivos. Un problema de peso muerto."
        }
    },
    "fr": {
        "ScatterPlot": {
            "diag_title": "Diagnostics Automatisés du Royaume (La Dure Vérité)",
            "hero_title": "Héros",
            "hero_desc": "Hauts Kill Points, Faibles Morts. Dépendants et efficaces.",
            "warrior_title": "Guerriers",
            "warrior_desc": "Les commandants brutaux du champ de bataille.",
            "slacker_title": "Feainéants",
            "slacker_desc": "Neutres, comptes stagnants et sous bulle.",
            "farmer_title": "Fermiers",
            "farmer_desc": "Haut gain puissance, aucun combat. Ils accumulent secrètement.",
            "feeder_title": "Nourrisseurs",
            "feeder_desc": "Ils meurent pour rien et détruisent le score du royaume.",
            "verdict_intro": "L'IA a découpé le temps en 5 points chronologiques... ",
            "verdict_zero_heroes": "CRITIQUE : Il n'y a aucun héros dans ce scan. ",
            "verdict_elite_heroes": "Vous avez {count} Héros d'élite en garnison. Protégez-les. ",
            "verdict_sparse_heroes": "Quelques héros trouvés ({count}). Ce sont vos meilleurs atouts, comptez sur eux. ",
            "verdict_warriors": "Votre armée principale comprend {count} Guerriers. Leurs hôpitaux sont pleins. ",
            "verdict_massive_feeders": "URGENCE : Vous avez {count} Nourrisseurs ({ratio}%) qui donnent des points à l'ennemi. Sanctionnez-les. ",
            "verdict_controlled_feeders": "Seulement {count} Nourrisseurs, ratio propre. ",
            "verdict_farmers": "De plus, réveillez ces {count} Fermiers qui montent le poids du matchmaking sans combattre. ",
            "verdict_slackers": "Enfin, il y a {count} Fainéants complètement inactifs. "
        }
    },
    "ar": {
        "ScatterPlot": {
            "diag_title": "تشخيص المملكة الآلي (الحقيقة الصادمة)",
            "hero_title": "الأبطال",
            "hero_desc": "نقاط قتل عالية، موتى قليلون. مقاتلون بفعالية كبيرة.",
            "warrior_title": "المحاربون",
            "warrior_desc": "نقاط قتل عالية، موتى كثيرون. مقاتلون في الساحات.",
            "slacker_title": "الكسالى",
            "slacker_desc": "حسابات خاملة بدون تقدم.",
            "farmer_title": "المزارعون",
            "farmer_desc": "نمو قوة عالي دون قتال.",
            "feeder_title": "الخاسرون",
            "feeder_desc": "نقاط قتل منخفضة وموتى كثر، يخسرون المملكة.",
            "verdict_intro": "قام الذكاء الاصطناعي بتقسيم إطارك الزمني وقياس النمو... ",
            "verdict_zero_heroes": "تحذير: لم يكتشف الخوارزميات أي أبطال في هذا الفحص. ",
            "verdict_elite_heroes": "لديك {count} نخبة من الأبطال يدعمون حامياتك. ",
            "verdict_sparse_heroes": "لديك القليل من الأبطال ({count}). ",
            "verdict_warriors": "قوتك القتالية هي {count} محاربين، يقاتلون بضراوة ولكن مستشفياتهم ممتلئة. ",
            "verdict_massive_feeders": "تحرك فورا: يوجد {count} خاسرين يرفعون نسبة الخسارة، تصرف معهم. ",
            "verdict_controlled_feeders": "يوجد {count} خاسرين فقط. ",
            "verdict_farmers": "عليك بطرد الـ {count} مزارعين، يرفعون مستوى التطابق دون فائدة. ",
            "verdict_slackers": "أخيرا، هناك {count} كسالى خاملين كليا."
        }
    },
    "zh": {
        "ScatterPlot": {
            "diag_title": "自动化王国诊断（残酷的真相）",
            "hero_title": "英雄",
            "hero_desc": "击杀高，阵亡低，最有效率的防守者。",
            "warrior_title": "战士",
            "warrior_desc": "击杀高，阵亡极高，牺牲惨重的野战指挥官。",
            "slacker_title": "摸鱼者",
            "slacker_desc": "划水，挂机，休眠的玩家。",
            "farmer_title": "农夫",
            "farmer_desc": "高战力增长但绝不打架。",
            "feeder_title": "送分者",
            "feeder_desc": "低击杀高阵亡，给敌军送人头的坑货。",
            "verdict_intro": "AI 引擎自动拆分了扫描记录以评估每个玩家真实的效率... ",
            "verdict_zero_heroes": "严重警告：没有发现任何英雄级别玩家，全在疯狂牺牲。 ",
            "verdict_elite_heroes": "您有 {count} 名精英英雄驻守。保护他们。 ",
            "verdict_sparse_heroes": "您只有少数英雄（{count}）。多依靠他们开集结。 ",
            "verdict_warriors": "您的核心战斗群有 {count} 名战士，他们占据了绝大多数野战但在流血。 ",
            "verdict_massive_feeders": "紧急：发现 {count} 名送分组（比例 {ratio}%），正在源源不断送死，处理他们。 ",
            "verdict_controlled_feeders": "您只有 {count} 名送分玩家，比例可控。 ",
            "verdict_farmers": "另外，您必须曝光那 {count} 名伪造高战力的农夫玩家，他们抬高了 KVK 匹配值。 ",
            "verdict_slackers": "另外，有 {count} 个死寂划水的摸鱼者没有任何作用。"
        }
    }
};

const dir = path.join(process.cwd(), 'src', 'messages');

locales.forEach(loc => {
    const file = path.join(dir, `${loc}.json`);
    if (fs.existsSync(file)) {
        let json = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        if (data[loc]) {
            json.ScatterPlot = data[loc].ScatterPlot;
        } else {
            // fallback to EN
            json.ScatterPlot = data["en"].ScatterPlot;
        }
        
        fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated ${loc}.json`);
    }
});
