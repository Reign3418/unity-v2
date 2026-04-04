const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'ar', 'zh', 'vi', 'ko', 'ru', 'tr', 'de', 'pt', 'id'];

const data = {
    "en": {
        "Settings": {
            "title": "Settings",
            "subtitle": "User Preferences & Account Configuration",
            "section_account": "Linked Account",
            "not_signed_in": "Not signed in",
            "auth_desc": "Authenticate via Discord to link your account.",
            "high_command": "High Command",
            "discord_id": "Discord ID: {id}",
            "section_notifications": "Notification Preferences",
            "discord_pings": "Discord Pings",
            "discord_pings_desc": "Receive pings for KvK alerts and server events",
            "email_notifs": "Email Notifications",
            "email_notifs_desc": "Receive Unity system emails (coming soon)",
            "section_dashboard": "Dashboard Preferences",
            "show_alliance_tag": "Show Alliance Tag on Cards",
            "show_alliance_tag_desc": "Display [TAG] badges on governor profile cards",
            "default_kingdom": "Default Kingdom",
            "default_kingdom_desc": "Kingdom pre-selected in analysis dropdowns",
            "no_arch_keys": "No Architecture Keys found",
            "section_api": "Global Architecture Override",
            "hybrid_mode": "Hybrid LLM Mode",
            "api_desc": "Unity runs OCR Screenshot reading through a central Master Database key. If you wish to use your own secure API key to prevent hitting the global quota, you may link your personal key here. Your key is stored locally in your browser.",
            "gemini_key": "Gemini API Key",
            "gemini_model": "Gemini LLM Model",
            "gemini_flash_rec": "Gemini 2.5 Flash (Recommended)",
            "gemini_pro": "Gemini 2.5 Pro (Slower, High Precision)",
            "gemini_legacy": "Gemini 1.5 Flash (Legacy)",
            "btn_saved": "Preferences Saved",
            "btn_save": "Save Preferences"
        },
        "Changelog": {
            "title": "Changelog",
            "subtitle": "Unity Platform Version History",
            "label_major": "Major"
        }
    },
    "es": {
        "Settings": {
            "title": "Configuración",
            "subtitle": "Preferencias y Configuración de Cuenta",
            "section_account": "Cuenta Vinculada",
            "not_signed_in": "No iniciaste sesión",
            "auth_desc": "Autentícate con Discord para vincular.",
            "high_command": "Alto Mando",
            "discord_id": "ID de Discord: {id}",
            "section_notifications": "Notificaciones",
            "discord_pings": "Pings de Discord",
            "discord_pings_desc": "Recibe alertas y eventos KvK",
            "email_notifs": "Alertas de Correo",
            "email_notifs_desc": "Recibe correos del sistema (próximamente)",
            "section_dashboard": "Preferencias de Panel",
            "show_alliance_tag": "Mostar Etiqueta de Alianza",
            "show_alliance_tag_desc": "Visualiza [TAG] en las tarjetas de perfil",
            "default_kingdom": "Reino por Defecto",
            "default_kingdom_desc": "El reino preseleccionado",
            "no_arch_keys": "No hay reinos",
            "section_api": "Sobrescritura de Arquitectura",
            "hybrid_mode": "Modo Híbrido LLM",
            "api_desc": "Si deseas usar tu propia clave API de Google Cloud para el escáner OCR, ponla aquí.",
            "gemini_key": "Clave API de Gemini",
            "gemini_model": "Modelo LLM de Gemini",
            "gemini_flash_rec": "Gemini 2.5 Flash (Recomendado)",
            "gemini_pro": "Gemini 2.5 Pro (Más lento)",
            "gemini_legacy": "Gemini 1.5 Flash (Legado)",
            "btn_saved": "Guardado",
            "btn_save": "Guardar Preferencias"
        },
        "Changelog": {
            "title": "Historial de Cambios",
            "subtitle": "Historial de Versiones de Unity",
            "label_major": "Mayor"
        }
    },
    "fr": {
        "Settings": {
            "title": "Paramètres",
            "subtitle": "Préférences Utilisateur & Compte",
            "section_account": "Compte Lié",
            "not_signed_in": "Non connecté",
            "auth_desc": "Connectez-vous via Discord pour lier.",
            "high_command": "Haut Commandement",
            "discord_id": "ID Discord: {id}",
            "section_notifications": "Préférences de Notification",
            "discord_pings": "Pings Discord",
            "discord_pings_desc": "Recevez des alertes KvK et serveur",
            "email_notifs": "Notifications Email",
            "email_notifs_desc": "Bientôt disponible",
            "section_dashboard": "Tableau de Bord",
            "show_alliance_tag": "Afficher l'Alliance",
            "show_alliance_tag_desc": "Afficher les badges [TAG] sur les profils",
            "default_kingdom": "Royaume par Défaut",
            "default_kingdom_desc": "Pré-sélectionné dans les menus",
            "no_arch_keys": "Aucune clé d'architecture",
            "section_api": "Architecture Globale",
            "hybrid_mode": "Mode Hybride LLM",
            "api_desc": "Si vous souhaitez utiliser votre propre clé pour l'OCR afin d'éviter les quotas globaux, entrez-la ici.",
            "gemini_key": "Clé API Gemini",
            "gemini_model": "Modèle LLM Gemini",
            "gemini_flash_rec": "Gemini 2.5 Flash (Recommandé)",
            "gemini_pro": "Gemini 2.5 Pro",
            "gemini_legacy": "Gemini 1.5 Flash",
            "btn_saved": "Enregistré",
            "btn_save": "Sauvegarder"
        },
        "Changelog": {
            "title": "Mises à jour",
            "subtitle": "Historique des Versions",
            "label_major": "Majeur"
        }
    },
    "ar": {
        "Settings": {
            "title": "الإعدادات",
            "subtitle": "تفضيلات المستخدم وحسابه",
            "section_account": "الحساب المرتبط",
            "not_signed_in": "غير مسجل الدخول",
            "auth_desc": "اربط حسابك عبر ديسكورد.",
            "high_command": "القيادة العليا",
            "discord_id": "معرف ديسكورد: {id}",
            "section_notifications": "تفضيلات الإشعارات",
            "discord_pings": "تنبيهات ديسكورد",
            "discord_pings_desc": "تلقي تنبيهات الأحداث",
            "email_notifs": "إشعارات البريد",
            "email_notifs_desc": "قريبًا",
            "section_dashboard": "تفضيلات اللوحة",
            "show_alliance_tag": "إظهار التحالف",
            "show_alliance_tag_desc": "أظهر علامة التحالف مع الملف الشخصي",
            "default_kingdom": "المملكة الافتراضية",
            "default_kingdom_desc": "المملكة المحددة بشكل افتراضي",
            "no_arch_keys": "لم يتم العثور على ممالك",
            "section_api": "الإعدادات العالمية للأداة",
            "hybrid_mode": "الوضع المتطور",
            "api_desc": "يمكنك استخدام مفتاح API الخاص بك لتجاوز الحدود المفروضة على السيرفر.",
            "gemini_key": "مفتاح API لجيمناي",
            "gemini_model": "نموذج جيمناي",
            "gemini_flash_rec": "جيمناي 2.5 فلاش (يوصى به)",
            "gemini_pro": "جيمناي 2.5 برو (دقة أعلى)",
            "gemini_legacy": "جيمناي 1.5 فلاش (القديم)",
            "btn_saved": "تم الحفظ",
            "btn_save": "حفظ التفضيلات"
        },
        "Changelog": {
            "title": "سجل التغييرات",
            "subtitle": "إصدارات النظام",
            "label_major": "تحديث رئيسي"
        }
    },
    "zh": {
        "Settings": {
            "title": "设置",
            "subtitle": "用户偏好配置",
            "section_account": "已链接的账号",
            "not_signed_in": "未登录",
            "auth_desc": "通过 Discord 登录绑定账号。",
            "high_command": "最高指挥官",
            "discord_id": "Discord ID: {id}",
            "section_notifications": "通知偏好",
            "discord_pings": "Discord 提醒",
            "discord_pings_desc": "接收 KVK 警报和服务器更新",
            "email_notifs": "电子邮件通知",
            "email_notifs_desc": "接收 Unity 系统邮件 (即将推出)",
            "section_dashboard": "仪表板偏好设置",
            "show_alliance_tag": "显示联盟标签",
            "show_alliance_tag_desc": "在执政官卡片上显示 [TAG] 徽章",
            "default_kingdom": "默认王国",
            "default_kingdom_desc": "在下拉菜单中预先选择的分析王国",
            "no_arch_keys": "未能获取密钥",
            "section_api": "全局架构覆盖",
            "hybrid_mode": "混合 LLM 模式",
            "api_desc": "你可以使用个人的 API 密钥覆盖系统全局的配额限制以加快 OCR 扫描。",
            "gemini_key": "Gemini API 密钥",
            "gemini_model": "Gemini LLM 模型",
            "gemini_flash_rec": "Gemini 2.5 Flash (推荐)",
            "gemini_pro": "Gemini 2.5 Pro (较慢)",
            "gemini_legacy": "Gemini 1.5 Flash (旧版)",
            "btn_saved": "配置已保存",
            "btn_save": "保存偏好"
        },
        "Changelog": {
            "title": "更新日志",
            "subtitle": "Unity 开发历史版本",
            "label_major": "大版本"
        }
    }
};

const dir = path.join(process.cwd(), 'src', 'messages');

locales.forEach(loc => {
    const file = path.join(dir, `${loc}.json`);
    if (fs.existsSync(file)) {
        let json = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        if (data[loc]) {
            json.Settings = data[loc].Settings;
            json.Changelog = data[loc].Changelog;
        } else {
            // fallback to EN
            json.Settings = data["en"].Settings;
            json.Changelog = data["en"].Changelog;
        }
        
        fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated Settings/Changelog for ${loc}.json`);
    }
});
