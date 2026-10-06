const fs = require('fs');
const path = require('path');

const locales = ['ar', 'de', 'en', 'es', 'fr', 'id', 'ko', 'pt', 'ru', 'tr', 'vi', 'zh'];

const translations = {
  en: {
    card_mode_title: "Card Purpose & Target",
    card_mode_album: "RoK Photo Album (Anti-Ban Camouflage)",
    card_mode_discord: "Discord / Web Banner",
    card_mode_album_badge: "Lilith Safe • Zero URLs",
    card_mode_discord_badge: "Direct URL Printed",
    card_mode_album_desc: "Camouflaged as an official Kingdom Battle Passport. All URLs and advertising trigger words are removed to pass Lilith Games automated in-game image review. Governors screenshot and scan the Cypher Seal."
  },
  ar: {
    card_mode_title: "غرض البطاقة والهدف",
    card_mode_album: "ألبوم صور RoK (تمويه آمن)",
    card_mode_discord: "لافتة ديسكورد / ويب",
    card_mode_album_badge: "آمن من ليليث • بدون روابط",
    card_mode_discord_badge: "رابط مباشر",
    card_mode_album_desc: "مموهة كجواز معركة رسمي للمملكة. تم حذف جميع الروابط والكلمات التحفيزية لتجاوز فحص الصور الآلي لشركة ليليث بنجاح."
  },
  de: {
    card_mode_title: "Kartenzweck & Ziel",
    card_mode_album: "RoK-Fotoalbum (Tarnungs-Schutz)",
    card_mode_discord: "Discord / Web-Banner",
    card_mode_album_badge: "Lilith-sicher • Keine URLs",
    card_mode_discord_badge: "Direkte URL",
    card_mode_album_desc: "Als offizieller Königreichs-Schlachtpass getarnt. Alle URLs und Trigger-Wörter wurden entfernt, um die automatische Bildprüfung von Lilith Games sicher zu bestehen."
  },
  es: {
    card_mode_title: "Propósito y Destino de la Tarjeta",
    card_mode_album: "Álbum de Fotos RoK (Camuflaje Seguro)",
    card_mode_discord: "Banner de Discord / Web",
    card_mode_album_badge: "Seguro contra Lilith • Sin URLs",
    card_mode_discord_badge: "URL Directa",
    card_mode_album_desc: "Camuflado como un Pasaporte de Batalla oficial del reino. Se han eliminado todas las URLs y palabras clave para superar la revisión automática de imágenes de Lilith."
  },
  fr: {
    card_mode_title: "Objectif & Destination de la Carte",
    card_mode_album: "Album Photo RoK (Camouflage Anti-Ban)",
    card_mode_discord: "Bannière Discord / Web",
    card_mode_album_badge: "Conforme Lilith • Zéro URL",
    card_mode_discord_badge: "URL Directe",
    card_mode_album_desc: "Camouflé en passeport de combat officiel du royaume. Toutes les URLs et mots déclencheurs sont supprimés pour valider la modération automatique des images de Lilith."
  },
  id: {
    card_mode_title: "Tujuan & Target Kartu",
    card_mode_album: "Album Foto RoK (Kamuflase Anti-Ban)",
    card_mode_discord: "Banner Discord / Web",
    card_mode_album_badge: "Aman dari Lilith • Tanpa URL",
    card_mode_discord_badge: "URL Langsung",
    card_mode_album_desc: "Disamarkan sebagai Paspor Pertempuran Kerajaan resmi. Semua URL dan kata pemicu dihapus agar lolos inspeksi gambar otomatis Lilith Games."
  },
  ko: {
    card_mode_title: "카드 용도 및 대상",
    card_mode_album: "RoK 프로필 앨범 (위장 안전 모드)",
    card_mode_discord: "디스코드 / 웹 배너",
    card_mode_album_badge: "릴리스 검열 통과 • URL 없음",
    card_mode_discord_badge: "직접 URL 표기",
    card_mode_album_desc: "공식 왕국 전투 여권 형태로 위장되었습니다. 릴리스 게임즈의 자동 이미지 검열을 통과하기 위해 모든 외부 URL과 트리거 단어가 제거되었습니다."
  },
  pt: {
    card_mode_title: "Finalidade e Destino do Cartão",
    card_mode_album: "Álbum de Fotos RoK (Camuflagem Segura)",
    card_mode_discord: "Banner Discord / Web",
    card_mode_album_badge: "Seguro contra Lilith • Sem URLs",
    card_mode_discord_badge: "URL Direta",
    card_mode_album_desc: "Camuflado como um Passaporte de Batalha oficial do reino. Todas as URLs e palavras de gatilho foram removidas para aprovação na moderação automática de imagens da Lilith."
  },
  ru: {
    card_mode_title: "Назначение и формат карты",
    card_mode_album: "Фотоальбом RoK (Камуфляж от бана)",
    card_mode_discord: "Баннер Discord / Web",
    card_mode_album_badge: "Защита Lilith • Без ссылок",
    card_mode_discord_badge: "Прямая ссылка",
    card_mode_album_desc: "Замаскировано под официальный боевой паспорт королевства. Все ссылки и ключевые слова удалены для успешного прохождения автоматической модерации изображений Lilith."
  },
  tr: {
    card_mode_title: "Kart Amacı ve Hedefi",
    card_mode_album: "RoK Fotoğraf Albümü (Kamuflaj Modu)",
    card_mode_discord: "Discord / Web Afişi",
    card_mode_album_badge: "Lilith Güvenli • URL Yok",
    card_mode_discord_badge: "Doğrudan URL",
    card_mode_album_desc: "Resmi bir Krallık Savaş Pasaportu olarak kamufle edilmiştir. Lilith Games'in otomatik görsel denetimini geçmek için tüm URL'ler ve tetikleyici kelimeler kaldırılmıştır."
  },
  vi: {
    card_mode_title: "Mục đích & Nơi chia sẻ Thẻ",
    card_mode_album: "Album Ảnh RoK (Ngụy trang kiểm duyệt)",
    card_mode_discord: "Banner Discord / Web",
    card_mode_album_badge: "An toàn kiểm duyệt • Không chứa URL",
    card_mode_discord_badge: "Hiển thị URL Trực tiếp",
    card_mode_album_desc: "Được ngụy trang thành Hộ chiếu Chiến đấu chính thức của Vương quốc. Toàn bộ đường dẫn URL và từ khóa quảng cáo đã được loại bỏ để vượt qua bộ lọc kiểm duyệt ảnh tự động của Lilith."
  },
  zh: {
    card_mode_title: "卡片用途与发布渠道",
    card_mode_album: "RoK游戏相册（防封伪装）",
    card_mode_discord: "Discord / 网页横幅",
    card_mode_album_badge: "莉莉丝审核安全 • 零网址",
    card_mode_discord_badge: "直印短链接",
    card_mode_album_desc: "已伪装成王国官方远征通行战报。彻底移除了所有外部网址及营销敏感词，确保100%通过莉莉丝游戏相册自动图像审核。执政官可在相册中截图并通过手机相册或扫码识别密印。"
  }
};

for (const loc of locales) {
  const filePath = path.join(__dirname, '..', 'src', 'messages', `${loc}.json`);
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const trans = translations[loc] || translations.en;

  // Add to Polygraph if exists
  if (data.Polygraph) {
    Object.assign(data.Polygraph, trans);
  }
  // Add to Tools if exists
  if (data.Tools) {
    Object.assign(data.Tools, trans);
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${loc}.json`);
}
