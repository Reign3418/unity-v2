const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'src', 'messages');

const newKeys = {
  en: {
    card_spawn_kd: "Estimated Starting Horizon",
    card_spawn_kd_desc: "The cluster of active new kingdoms when this character was created",
    label_continent: "Continent"
  },
  ar: {
    card_spawn_kd: "أفق مملكة البداية التقديري",
    card_spawn_kd_desc: "مجموعة الممالك الجديدة النشطة عند إنشاء هذه الشخصية",
    label_continent: "القارة"
  },
  de: {
    card_spawn_kd: "Geschätztes Start-Königreich",
    card_spawn_kd_desc: "Gruppe aktiver neuer Königreiche bei Erstellung dieses Charakters",
    label_continent: "Kontinent"
  },
  es: {
    card_spawn_kd: "Reino de Inicio Estimado",
    card_spawn_kd_desc: "Grupo de reinos nuevos activos al crearse este personaje",
    label_continent: "Continente"
  },
  fr: {
    card_spawn_kd: "Royaume de Départ Estimé",
    card_spawn_kd_desc: "Grappe de nouveaux royaumes actifs lors de la création de ce personnage",
    label_continent: "Continent"
  },
  id: {
    card_spawn_kd: "Perkiraan Kerajaan Awal",
    card_spawn_kd_desc: "Gugusan kerajaan baru yang aktif saat karakter ini dibuat",
    label_continent: "Benua"
  },
  ko: {
    card_spawn_kd: "추정 시작 왕국",
    card_spawn_kd_desc: "이 캐릭터 생성 당시 신규 생성되던 왕국 군집",
    label_continent: "대륙"
  },
  pt: {
    card_spawn_kd: "Reino Inicial Estimado",
    card_spawn_kd_desc: "Grupo de novos reinos ativos quando este personagem foi criado",
    label_continent: "Continente"
  },
  ru: {
    card_spawn_kd: "Примерное начальное королевство",
    card_spawn_kd_desc: "Кластер новых открывавшихся королевств на момент создания персонажа",
    label_continent: "Континент"
  },
  tr: {
    card_spawn_kd: "Tahmini Başlangıç Krallığı",
    card_spawn_kd_desc: "Bu karakter oluşturulduğunda aktif olan yeni krallıklar kümesi",
    label_continent: "Kıta"
  },
  vi: {
    card_spawn_kd: "Vương quốc Bắt đầu Ước tính",
    card_spawn_kd_desc: "Cụm vương quốc mới mở khi nhân vật này được tạo",
    label_continent: "Châu lục"
  },
  zh: {
    card_spawn_kd: "估算出生起始王国",
    card_spawn_kd_desc: "该角色创角时由系统自动分配的新服集群",
    label_continent: "大洲/赛区"
  }
};

const langs = Object.keys(newKeys);

for (const lang of langs) {
  const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.AccountAgeAudit) data.AccountAgeAudit = {};

  Object.assign(data.AccountAgeAudit, newKeys[lang]);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${lang}.json with starting kingdom keys.`);
}

console.log('Parity sync complete.');
