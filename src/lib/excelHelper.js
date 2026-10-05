import ExcelJS from "exceljs";

/**
 * Reads an Excel (.xlsx / .xls) buffer and extracts all worksheets into structured JSON objects.
 * 
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @returns {Promise<{ sheetNames: string[], summaryDtg: string|null, sheets: Record<string, Array<Record<string, any>>> }>}
 */
export async function parseExcelWorkbook(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheetNames = workbook.worksheets.map(w => w.name);
    let summaryDtg = null;

    const summarySheet = workbook.getWorksheet("Summary") || workbook.getWorksheet("summary");
    if (summarySheet) {
        const cellF2 = summarySheet.getCell("F2");
        if (cellF2 && cellF2.value) {
            summaryDtg = String(cellF2.text || cellF2.value || "");
        }
    }

    const sheets = {};

    workbook.worksheets.forEach(worksheet => {
        const headers = [];
        const rows = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                row.eachCell((cell, colNumber) => {
                    headers[colNumber] = String(cell.value || "").trim();
                });
            } else {
                const rowData = {};
                let hasValue = false;
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const header = headers[colNumber];
                    if (!header) return;

                    let val = cell.value;
                    if (val && typeof val === "object") {
                        if (val.result !== undefined) val = val.result;
                        else if (val.text !== undefined) val = val.text;
                        else if (val.richText && Array.isArray(val.richText)) {
                            val = val.richText.map(t => t.text).join("");
                        }
                    }

                    if (val !== undefined && val !== null) {
                        hasValue = true;
                        rowData[header] = val;
                    } else {
                        rowData[header] = 0;
                    }
                });

                if (hasValue) {
                    rows.push(rowData);
                }
            }
        });

        sheets[worksheet.name] = rows;
    });

    return {
        sheetNames,
        summaryDtg,
        sheets
    };
}

/**
 * Reads a single worksheet Excel buffer into JSON rows.
 * 
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function parseExcelBuffer(buffer) {
    const result = await parseExcelWorkbook(buffer);
    const firstSheet = result.sheetNames[0];
    return firstSheet ? (result.sheets[firstSheet] || []) : [];
}

/**
 * Exports an array of JSON objects to an Excel (.xlsx) file and triggers download.
 * 
 * @param {Array<Record<string, any>>} data 
 * @param {string} fileName 
 * @param {string} [sheetName="KingdomData"]
 */
export async function downloadExcelFile(data, fileName, sheetName = "KingdomData") {
    if (!data || data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Unity Ecosystem V2";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);
    const keys = Object.keys(data[0]);

    worksheet.columns = keys.map(k => ({
        header: k,
        key: k,
        width: Math.max(k.length + 4, 14),
    }));

    // Add data rows
    data.forEach(item => worksheet.addRow(item));

    // Style the header row (Dark Navy/Slate with white text)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
