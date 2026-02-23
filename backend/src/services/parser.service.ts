import fs from "node:fs";
import csvParser from "csv-parser";
import * as xlsx from "xlsx";
import { ColumnDefinition, ColumnType } from "../types/index";

const DATE_PATTERNS = [
	/^\d{4}-\d{2}-\d{2}$/,
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
	/^\d{2}\/\d{2}\/\d{4}$/,
	/^\d{2}-\d{2}-\d{4}$/,
	/^\d{1,2}\s\w+\s\d{4}$/,
];

export const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export default class ParserService {
	// distrugge lo stream appena raggiunge maxRows — il flag `resolved` evita doppia resolve
	async parseCsvPreview(
		filePath: string,
		maxRows: number,
	): Promise<{
		headers: string[];
		rows: string[][];
		totalRowsRead: number;
	}> {
		return new Promise((resolve, reject) => {
			const headers: string[] = [];
			const rows: string[][] = [];
			let rowCount = 0;
			let resolved = false;

			const readStream = fs.createReadStream(filePath);
			const parser = readStream.pipe(csvParser());

			parser.on("headers", (hdrs: string[]) => {
				headers.push(...hdrs);
			});

			parser.on("data", (row: Record<string, string>) => {
				if (rowCount >= maxRows) {
					if (!resolved) {
						resolved = true;
						readStream.destroy();
						resolve({ headers, rows, totalRowsRead: rowCount });
					}
					return;
				}
				rows.push(headers.map((h) => row[h] ?? ""));
				rowCount++;
			});

			parser.on("end", () => {
				if (!resolved) {
					resolved = true;
					resolve({ headers, rows, totalRowsRead: rowCount });
				}
			});

			parser.on("error", (err) => {
				if (!resolved) {
					resolved = true;
					reject(err);
				}
			});

			readStream.on("error", (err) => {
				if (!resolved) {
					resolved = true;
					reject(err);
				}
			});
		});
	}

	async countCsvRows(filePath: string): Promise<number> {
		return new Promise((resolve, reject) => {
			let count = 0;
			const stream = fs.createReadStream(filePath).pipe(csvParser());
			stream.on("data", () => {
				count++;
			});
			stream.on("end", () => resolve(count));
			stream.on("error", reject);
		});
	}

	// usa solo il primo foglio. raw: false forza tutto a stringa per uniformità col CSV
	async parseExcelPreview(
		filePath: string,
		maxRows: number,
	): Promise<{
		headers: string[];
		rows: string[][];
		totalRowsRead: number;
	}> {
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		if (!sheetName) {
			return { headers: [], rows: [], totalRowsRead: 0 };
		}

		const sheet = workbook.Sheets[sheetName];
		const data = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });

		if (data.length === 0) {
			return { headers: [], rows: [], totalRowsRead: 0 };
		}

		const headers = (data[0] as unknown[]).map((h) => String(h ?? ""));
		const allDataRows = data
			.slice(1)
			.map((row) => headers.map((_, i) => String((row as unknown[])[i] ?? "")));

		return {
			headers,
			rows: allDataRows.slice(0, maxRows),
			totalRowsRead: allDataRows.length,
		};
	}

	// soglia 80%: se almeno l'80% dei valori non vuoti matcha un tipo, quello viene suggerito
	suggestColumnTypes(headers: string[], rows: string[][]): ColumnDefinition[] {
		const THRESHOLD = 0.8;

		return headers.map((header, colIndex) => {
			const values = rows
				.map((row) => row[colIndex])
				.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");

			if (values.length === 0) {
				return {
					name: header,
					suggestedType: "text" as ColumnType,
					assignedType: "text" as ColumnType,
				};
			}

			const numberHits = values.filter((v) => {
				const str = String(v).trim().replace(/,/g, "");
				return !isNaN(parseFloat(str)) && isFinite(Number(str));
			}).length;
			const numberRatio = numberHits / values.length;

			const dateHits = values.filter((v) => {
				const str = String(v).trim();
				if (DATE_PATTERNS.some((p) => p.test(str))) return true;
				const parsed = Date.parse(str);
				return !isNaN(parsed) && str.length > 4;
			}).length;
			const dateRatio = dateHits / values.length;

			let suggestedType: ColumnType = "text";
			if (numberRatio >= THRESHOLD) {
				suggestedType = "number";
			} else if (dateRatio >= THRESHOLD) {
				suggestedType = "date";
			}

			return {
				name: header,
				suggestedType,
				assignedType: suggestedType,
			};
		});
	}
}
