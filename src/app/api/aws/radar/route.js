import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q'); // name or alliance

        // Locate the physical AI Output file on the host machine
        // Force an absolute localized path specifically for the Experimental Lab
        const rawPath = "e:\\Unity BU\\rok-bot-farm\\radar_db.json";
        
        if (!fs.existsSync(rawPath)) {
            return NextResponse.json({ success: false, message: 'Radar Database offline. Have you started the autonomous PyTesseract scan sweep?' }, { status: 404 });
        }

        const dataBuffer = fs.readFileSync(rawPath, 'utf8');
        const db = JSON.parse(dataBuffer);

        if (!query) {
            return NextResponse.json({ success: true, count: db.length, data: db });
        }

        // Fuzzy search radar strings
        const searchStr = query.toLowerCase();
        const results = db.filter(node => 
            node.name.toLowerCase().includes(searchStr) || 
            node.alliance.toLowerCase().includes(searchStr)
        );

        return NextResponse.json({ success: true, count: results.length, data: results });

    } catch (error) {
        console.error("Radar API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
