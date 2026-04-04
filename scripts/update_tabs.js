const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'ar', 'zh', 'vi', 'ko', 'ru', 'tr', 'de', 'pt', 'id'];

const data = {
    "en": {
        "Tabs": {
            "Overview": "Overview",
            "Growth Analysis": "Growth Analysis",
            "Kingdom Analysis": "Kingdom Analysis",
            "Alliance Duel": "Alliance Duel",
            "Scatter Plot": "Scatter Plot",
            "Hall of Legends": "Hall of Legends",
            "Team Builder": "Team Builder",
            "Alliance Merge": "Alliance Merge",
            "Fixed MGE": "Fixed MGE",
            "Roster Linker": "Roster Linker",
            "Configuration": "Configuration",
            "Results": "Results",
            "workbench_title": "Kingdom Workbench",
            "workbench_subtitle": "Interactive Legacy Tools",
            "tab_in_dev": "Tab In Development",
            "tab_in_dev_desc": "The component is currently undergoing V2 framework migration.",
            "r4_clearance": "R4 Clearance Required",
            "r4_desc": "Your current role does not have permission to view this utility."
        }
    },
    "es": {
        "Tabs": {
            "Overview": "Resumen",
            "Growth Analysis": "Análisis de Crecimiento",
            "Kingdom Analysis": "Análisis de Reino",
            "Alliance Duel": "Duelo de Alianzas",
            "Scatter Plot": "Gráfico de Dispersión",
            "Hall of Legends": "Salón de Leyendas",
            "Team Builder": "Creador de Equipos",
            "Alliance Merge": "Fusión de Alianzas",
            "Fixed MGE": "MGE Fijo",
            "Roster Linker": "Enlace de Plantillas",
            "Configuration": "Configuración",
            "Results": "Resultados",
            "workbench_title": "Mesa de Trabajo del Reino",
            "workbench_subtitle": "Herramientas Interactivas",
            "tab_in_dev": "Pestaña en Desarrollo",
            "tab_in_dev_desc": "El componente está migrando.",
            "r4_clearance": "Se requiere R4",
            "r4_desc": "Sin permisos."
        }
    },
    "zh": {
        "Tabs": {
            "Overview": "总览",
            "Growth Analysis": "数据增长分析",
            "Kingdom Analysis": "王国分析",
            "Alliance Duel": "联盟对决",
            "Scatter Plot": "离散数据图 (坐标系)",
            "Hall of Legends": "传奇大厅",
            "Team Builder": "组队系统",
            "Alliance Merge": "联盟合服",
            "Fixed MGE": "最强执政官",
            "Roster Linker": "名单链接绑定",
            "Configuration": "后台管理",
            "Results": "KVK 结算",
            "workbench_title": "王国工作台",
            "workbench_subtitle": "互动遗留工具",
            "tab_in_dev": "开发中",
            "tab_in_dev_desc": "正在向新框架迁移中。",
            "r4_clearance": "需要 R4 权限",
            "r4_desc": "您的角色无查看权限。"
        }
    }
};

const dir = path.join(process.cwd(), 'src', 'messages');

locales.forEach(loc => {
    const file = path.join(dir, `${loc}.json`);
    if (fs.existsSync(file)) {
        let json = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        let targetData = data[loc] || data["en"];
        json.Tabs = targetData.Tabs;
        
        fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated Tabs for ${loc}.json`);
    }
});
