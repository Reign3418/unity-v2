const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Helper function to extract and categorize commits
function generateChangelog() {
    try {
        console.log("Generating dynamic Changelog from Git history...");
        
        // Ensure data directory exists
        const dataDir = path.join(process.cwd(), "src", "data");
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Fetch last 50 commits (hash|message|iso_date)
        const logOutput = execSync('git log --pretty=format:"%h|%s|%cI" -n 100').toString();
        const lines = logOutput.split("\n").filter(l => l.trim().length > 0);

        const groups = {}; // Map of "Month Year" -> { label, date, changes: [] }

        // Categories definitions
        const keywords = {
            new: ["feat", "add", "new", "create", "implement"],
            fix: ["fix", "bug", "patch", "update", "refactor", "tweak", "resolve"],
            security: ["sec", "security", "vuln", "auth", "secret"]
        };

        const detectType = (message) => {
            const lowerMsg = message.toLowerCase();
            for (const key of keywords.security) {
                if (lowerMsg.includes(`${key}:`) || lowerMsg.includes(` ${key} `) || lowerMsg.startsWith(`${key} `)) return "security";
            }
            for (const key of keywords.new) {
                if (lowerMsg.includes(`${key}:`) || lowerMsg.includes(` ${key} `) || lowerMsg.startsWith(`${key} `)) return "new";
            }
            for (const key of keywords.fix) {
                if (lowerMsg.includes(`${key}:`) || lowerMsg.includes(` ${key} `) || lowerMsg.startsWith(`${key} `)) return "fix";
            }
            return "fix"; // default
        };

        lines.forEach((line) => {
            const [hash, message, dateStr] = line.split("|");
            if (!message || message.startsWith("Merge pull request") || message.startsWith("Merge branch")) return;

            const date = new Date(dateStr);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!groups[monthYear]) {
                groups[monthYear] = {
                    version: `Build ${monthYear.split(" ")[1]}.${date.getMonth() + 1}`,
                    date: monthYear,
                    type: "patch", // default visual tag
                    label: `Continuous Delivery - ${monthYear}`,
                    changes: []
                };
            }

            // Cleanup the message prefix like "feat:" or "fix:"
            let cleanMessage = message.replace(/^(feat|fix|sec|security|update|refactor|add|new|chore)(\((.*?)\))?:/i, "").trim();
            // Capitalize first letter
            cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);

            groups[monthYear].changes.push({
                type: detectType(message),
                text: cleanMessage
            });
        });

        const changelogArray = Object.values(groups);

        // Highlight the most recent one as major
        if (changelogArray.length > 0) {
            changelogArray[0].type = "major";
            changelogArray[0].label = "Latest Build Iteration";
        }

        const outputPath = path.join(dataDir, "changelog.json");
        fs.writeFileSync(outputPath, JSON.stringify(changelogArray, null, 2));

        console.log(`✅ Changelog successfully built at ${outputPath} with ${lines.length} commits across ${changelogArray.length} months.`);

    } catch (e) {
        console.error("❌ Failed to generate changelog:", e.message);
        // Fallback dummy file so build doesn't crash if git fails
        const fallbackPath = path.join(process.cwd(), "src", "data", "changelog.json");
        fs.writeFileSync(fallbackPath, JSON.stringify([{
            version: "N/A", date: "Unknown", type: "patch", label: "Git history unavailable", changes: [{ type: "fix", text: "Automated generation failed." }]
        }]));
    }
}

generateChangelog();
