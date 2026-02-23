import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { v4 as uuidv4 } from "uuid";
import { FastifyBaseLogger } from "fastify";
import { MultipartFile } from "@fastify/multipart";
import { FileModel, FileDocument } from "@models/file.model";
import ParserService from "./parser.service";
import { config } from "@config/index";
import { ColumnDefinition } from "../types/index";
import { Errors } from "@errors/index";

export default class FileService {
	private parserService = new ParserService();

	constructor(private logger: FastifyBaseLogger) {}

	private resolvePath(storedName: string): string {
		return path.join(config.uploadDir, storedName);
	}

	// CSV: la preview taglia lo stream, quindi rowCount è parziale e va ricalcolato in background.
	// Excel: xlsx legge tutto in memoria, rowCount è già quello definitivo.
	async upload(file: MultipartFile, userId: string): Promise<FileDocument> {
		const ext = path.extname(file.filename).toLowerCase();
		const storedName = `${uuidv4()}${ext}`;
		const filePath = this.resolvePath(storedName);

		await fsp.mkdir(config.uploadDir, { recursive: true });

		const writeStream = fs.createWriteStream(filePath);
		await pipeline(file.file, writeStream);

		const stats = await fsp.stat(filePath);

		const isCsv = ext === ".csv";
		const { headers, rows, totalRowsRead } = isCsv
			? await this.parserService.parseCsvPreview(filePath, config.csvPreviewRows)
			: await this.parserService.parseExcelPreview(filePath, config.csvPreviewRows);

		const columns = this.parserService.suggestColumnTypes(headers, rows);

		const fileRecord = new FileModel({
			originalName: file.filename,
			storedName,
			fileSize: stats.size,
			mimeType: file.mimetype || "text/csv",
			uploadedBy: userId,
			columns,
			rowCount: totalRowsRead,
			previewData: rows,
		});

		await fileRecord.save();

		if (isCsv) {
			void this.countCsvRowsAsync(fileRecord._id.toString(), filePath);
		}

		return fileRecord;
	}

	private async countCsvRowsAsync(fileId: string, filePath: string): Promise<void> {
		try {
			const totalRows = await this.parserService.countCsvRows(filePath);
			await FileModel.findByIdAndUpdate(fileId, { rowCount: totalRows });
		} catch (err) {
			this.logger.error({ err, fileId }, "Failed to count rows for file");
		}
	}

	async listFiles(userId: string, canViewAll: boolean): Promise<FileDocument[]> {
		const filter = canViewAll ? {} : { uploadedBy: userId };
		return FileModel.find(filter)
			.sort({ createdAt: -1 })
			.select("-previewData")
			.populate("uploadedBy", "name email") as unknown as Promise<FileDocument[]>;
	}

	// populate dopo il check permessi: serve l'ObjectId raw per il confronto con userId
	async getFileById(fileId: string, userId: string, canViewAll: boolean): Promise<FileDocument | null> {
		const file = (await FileModel.findById(fileId)) as FileDocument | null;
		if (!file) return null;
		if (!canViewAll && file.uploadedBy.toString() !== userId) {
			return null;
		}
		await file.populate("uploadedBy", "name email");
		return file;
	}

	async updateColumns(
		fileId: string,
		columns: ColumnDefinition[],
		userId: string,
		canEditAll: boolean,
	): Promise<FileDocument | null> {
		const file = (await FileModel.findById(fileId)) as FileDocument | null;
		if (!file) return null;
		if (!canEditAll && file.uploadedBy.toString() !== userId) {
			throw Errors.forbidden("Not authorized to edit this file");
		}

		file.columns = columns;
		await file.save();
		return file;
	}

	// se il file fisico è già sparito dal disco, cancella comunque il record dal DB
	async deleteFile(fileId: string, userId: string, canDeleteAll: boolean): Promise<boolean> {
		const file = (await FileModel.findById(fileId)) as FileDocument | null;
		if (!file) return false;
		if (!canDeleteAll && file.uploadedBy.toString() !== userId) {
			throw Errors.forbidden("Not authorized to delete this file");
		}

		try {
			await fsp.unlink(this.resolvePath(file.storedName));
		} catch (err) {
			this.logger.error({ err, storedName: file.storedName }, "Failed to delete file from disk");
		}

		await FileModel.findByIdAndDelete(fileId);
		return true;
	}

	async getFilePath(
		fileId: string,
		userId: string,
		canViewAll: boolean,
	): Promise<{ filePath: string; originalName: string; mimeType: string } | null> {
		const file = (await FileModel.findById(fileId)) as FileDocument | null;
		if (!file) return null;
		if (!canViewAll && file.uploadedBy.toString() !== userId) {
			throw Errors.forbidden("Not authorized to download this file");
		}

		const filePath = this.resolvePath(file.storedName);
		try {
			await fsp.access(filePath, fs.constants.R_OK);
		} catch {
			throw Errors.notFound("File on disk");
		}

		return {
			filePath,
			originalName: file.originalName,
			mimeType: file.mimeType ?? "text/csv",
		};
	}
}
