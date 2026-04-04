const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'fr', 'ar', 'zh', 'vi', 'ko', 'ru', 'tr', 'de', 'pt', 'id'];

const data = {
    "en": {
        "ScatterPlotDev": {
            "title": "Understanding the Matrix",
            "intro": "The Behavioral PCA Engine (Principal Component Analysis) is an advanced machine learning module designed to mathematically compress 8 dimensions of raw governor telemetry (Power, Kill Points, T4/T5 Deaths, Online Activity Vectors) into a digestible 2D visual coordinate plane.",
            "x_axis_title": "THE X-AXIS: ACTIVITY VOLATILITY (PC1)",
            "x_axis_desc": "The horizontal axis measures aggregate action volume. A governor placed far to the right (positive X) has exhibited a high magnitude of statistical volatility—meaning massive shifts in power, severe troop deaths, and skyrocketing kill points compared to the baseline population curve. A negative X placement indicates stagnation or extreme passivity relative to the kingdom average.",
            "y_axis_title": "THE Y-AXIS: TRADING EFFICIENCY (PC2)",
            "y_axis_desc": "The vertical axis computes raw sociological efficiency. Governors placed high on the matrix (positive Y) are scoring massive Kill Points while sustaining suspiciously low permanent troop deaths (T4/T5 Deads). Those mapped deep in the negative Y quadrant are 'bleeding out'—absorbing catastrophic permanent troop losses for marginal competitive point gain, serving as structural feeders.",
            "quadrants_title": "THE FOUR QUADRANTS:",
            "q_heroes": "(Heroes) — High volatility, extreme efficiency. The ultimate elite garrison leaders.",
            "q_warriors": "(Warriors) — High volatility, terrible efficiency. Brutal field fighters absorbing massive losses to win.",
            "q_farmers": "(Farmers) — Low volatility, high power consumption. Visually growing infrastructure but doing zero combat.",
            "q_slackers": "(Slackers) — Low volatility, zero growth. The truly plateaued dead-weight accounts.",
            "q_feeders": "(Feeders) — Low volatility, terrible efficiency. Structurally broken accounts bleeding infrastructure.",
            "dev_notes_title": "DEVELOPER'S NOTES (THE THEORY OF THE MATRIX):",
            "dev_notes_1": "The Longitudinal Volatility Algorithm: To paint a mathematically precise picture of player consistency, the backend dynamically slices the requested timeframe into up to 5 equidistant chronological waypoints (Start, 3 Mid-Scans, and End) pulling concurrently from AWS DynamoDB. Instead of just calculating 'Total KP Gained', the engine calculates the standard deviation across these discrete intervals. Plotted on the X-Axis (Volatility), a player who steadily grinds the exact same amount every week is statistically grounded (Variance ~0), while a player who sleeps for 3 weeks and spikes massively on the final week is mathematically flung to the absolute explosive edges of the matrix."
        },
        "Community": {
            "title": "Unity Community Hub",
            "subtitle": "Submit Feedback & Live Global Feed",
            "submit_title": "Submit Feedback",
            "placeholder": "Describe your idea or report a bug...",
            "btn_posting": "Posting...",
            "btn_post": "Post",
            "sign_in": "Sign in with Discord",
            "sign_in_desc": "to post messages and interact with the kingdom community.",
            "live_feed": "Live Global Feed",
            "no_posts_title": "No Posts Yet",
            "no_posts_desc": "Be the first to post in the Community Hub."
        },
        "Hunter": {
            "tab_trajectory": "Identity Trajectory",
            "tab_talent": "Talent Acquisition",
            "hunter_title": "Player Hunter",
            "hunter_desc": "Query the AWS Cloud Database to find players matching specific power criteria across multiple kingdoms in real time.",
            "export_excel": "Export to Excel",
            "target_kd": "Target Kingdoms (Comma Separated)",
            "min_power": "Min Power",
            "max_power": "Max Power",
            "btn_scanning": "Scanning AWS Target Nodes...",
            "btn_start_hunt": "Start Hunt",
            "table_title": "Acquisition Radar Candidates",
            "no_candidates": "No candidates found in this bracket.",
            "col_kd": "Kingdom",
            "col_id": "ID",
            "col_tag": "Tag",
            "col_name": "Name",
            "col_power": "Power",
            "col_kp": "Kill Points",
            "traj_title": "Identity Trajectory Tracker",
            "traj_desc": "Paste a bulk list of Governor IDs or Player Names (one per line). The engine will cross-reference the AWS Global Timeline to disambiguate their permanent identities, mapping their migration history across all known kingdoms.",
            "traj_placeholder": "Enter IDs or Names...\n135042283",
            "btn_traj_scan": "Scanning Global Database...",
            "btn_traj_exec": "Execute Trajectory Scan",
            "err_unverified": "Target Completely Unverified / Not in Global Registry",
            "lbl_latest_kd": "Latest KD",
            "lbl_latest_power": "Latest Power",
            "err_no_scans": "NO RECENT SCANS",
            "hist_migration": "Kingdom Migration Trajectory",
            "hist_alias": "Known Alias Evolution",
            "raw_timeline": "Raw AWS Timeline Scans",
            "zeroed": "🚨 ZEROED / SWARMED"
        }
    },
    "zh": {
        "ScatterPlotDev": {
            "title": "理解矩阵",
            "intro": "行为PCA引擎是一个高级机器学习模块...",
            "x_axis_title": "X轴: 活跃波动率 (PC1)",
            "x_axis_desc": "高表现的波动...",
            "y_axis_title": "Y轴: 交易效率 (PC2)",
            "y_axis_desc": "高击杀低阵亡...",
            "quadrants_title": "四个象限:",
            "q_heroes": "(英雄) — 高波动, 极致效率。终极精英驻防。",
            "q_warriors": "(战士) — 高波动, 极低效率。牺牲巨大的野战指挥官。",
            "q_farmers": "(农夫) — 低波动, 高战力吸收。",
            "q_slackers": "(摸鱼者) — 低波动, 零增长。",
            "q_feeders": "(送分者) — 低波动, 极低效率。破坏王国的分数。",
            "dev_notes_title": "开发者日记 (矩阵理论):",
            "dev_notes_1": "纵向波动算法：计算长期方差..."
        },
        "Community": {
            "title": "Unity 社区大厅",
            "subtitle": "提交反馈 & 实时全球动态",
            "submit_title": "提交反馈",
            "placeholder": "描述你的想法或报告 Bug...",
            "btn_posting": "发布中...",
            "btn_post": "发布",
            "sign_in": "登录 Discord",
            "sign_in_desc": "以发布消息并与王国社区互动。",
            "live_feed": "实时全球动态",
            "no_posts_title": "在此等待第一篇帖子",
            "no_posts_desc": "在社区大厅中发表您的意见。"
        },
        "Hunter": {
            "tab_trajectory": "身份轨迹",
            "tab_talent": "招募雷达",
            "hunter_title": "玩家猎人",
            "hunter_desc": "查询 AWS 数据库，按战力抓取各个王国的玩家...",
            "export_excel": "导出到 Excel",
            "target_kd": "目标王国 (用逗号分隔)",
            "min_power": "最低战斗力",
            "max_power": "最高战斗力",
            "btn_scanning": "正在扫描 AWS 目标节点...",
            "btn_start_hunt": "开始狩猎",
            "table_title": "雷达监测名单",
            "no_candidates": "该区间内没有找到符合条件的候选人。",
            "col_kd": "王国",
            "col_id": "ID",
            "col_tag": "联盟",
            "col_name": "名称",
            "col_power": "战力",
            "col_kp": "击杀分",
            "traj_title": "身份轨迹追踪器",
            "traj_desc": "批量粘贴玩家 ID 或名字。引擎会自动交叉对比过去数据分析他们的移民倾向。",
            "traj_placeholder": "输入 ID 或 名字...\n135042283",
            "btn_traj_scan": "正在扫描全球数据库...",
            "btn_traj_exec": "执行轨迹扫描",
            "err_unverified": "目标未验证 / 未在全球数据库中发现",
            "lbl_latest_kd": "最后位置",
            "lbl_latest_power": "最新战力",
            "err_no_scans": "没有最近扫描数据",
            "hist_migration": "王国移民轨迹",
            "hist_alias": "曾用名演化",
            "raw_timeline": "原始 AWS 时间线",
            "zeroed": "🚨 被清零 / 围殴"
        }
    }
};

const dir = path.join(process.cwd(), 'src', 'messages');

locales.forEach(loc => {
    const file = path.join(dir, `${loc}.json`);
    if (fs.existsSync(file)) {
        let json = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        let targetData = data[loc] || data["en"];
        
        json.ScatterPlotDev = targetData.ScatterPlotDev;
        json.Community = targetData.Community;
        json.Hunter = targetData.Hunter;
        
        fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated final modules for ${loc}.json`);
    }
});
