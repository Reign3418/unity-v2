const fs = require('fs');
const path = require('path');

const visionDir = 'E:\\UnityBU\\unity-v2\\src\\app\\api\\aws\\admin\\vision';
const dirs = ['ap', 'flag', 'forge', 'resources', 'soc-camps', 'speedup'];

dirs.forEach(dir => {
    const routePath = path.join(visionDir, dir, 'route.js');
    if (!fs.existsSync(routePath)) return;
    
    let content = fs.readFileSync(routePath, 'utf8');
    
    // Add imports if they don't exist
    if (!content.includes('import { auth }')) {
        content = content.replace('import { getGlobalConfig } from "@/lib/awsDynamo";', 'import { getGlobalConfig } from "@/lib/awsDynamo";\nimport { auth } from "@/lib/auth";\nimport { logEvent } from "@/lib/eventLogger";');
    }

    // Find the successful return line: return NextResponse.json(...)
    // Usually it's `return NextResponse.json(parsed);` or `return NextResponse.json({ success: true, data: parsed });`
    const regex = /return\s+NextResponse\.json\(\s*(?:parsed|{\s*success:\s*true\s*,\s*data:\s*parsed\s*})\s*\);/;
    
    if (regex.test(content) && !content.includes('logEvent(')) {
        const replacement = `
        const session = await auth();
        logEvent('VISION_${dir.toUpperCase().replace('-', '_')}_SCAN', {}, {
            userEmail: session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || ''
        });

        $&`;
        content = content.replace(regex, replacement);
        fs.writeFileSync(routePath, content, 'utf8');
        console.log(`Patched ${dir}`);
    } else {
        console.log(`Skipped ${dir} - Regex not matched or already logged`);
    }
});

// hoh already imports auth
const hohPath = path.join(visionDir, 'hoh', 'route.js');
if (fs.existsSync(hohPath)) {
    let content = fs.readFileSync(hohPath, 'utf8');
    if (!content.includes('import { logEvent }')) {
        content = content.replace('import { auth } from "@/lib/auth";', 'import { auth } from "@/lib/auth";\nimport { logEvent } from "@/lib/eventLogger";');
    }
    const hohRegex = /return\s+NextResponse\.json\(\s*\{\s*success:\s*true/;
    if (hohRegex.test(content) && !content.includes("logEvent('VISION_HOH_SCAN'")) {
        const replacement = `
        logEvent('VISION_HOH_SCAN', {}, {
            userEmail: session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || ''
        });

        $&`;
        content = content.replace(hohRegex, replacement);
        fs.writeFileSync(hohPath, content, 'utf8');
        console.log('Patched hoh');
    }
}
