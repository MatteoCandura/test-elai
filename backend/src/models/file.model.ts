import mongoose, { Schema, HydratedDocument } from "mongoose";
import { ColumnDefinition } from "../types/index";

const columnSchema = new Schema(
	{
		name: { type: String, required: true },
		suggestedType: {
			type: String,
			enum: ["text", "number", "date"],
			default: "text",
		},
		assignedType: {
			type: String,
			enum: ["text", "number", "date"],
			default: "text",
		},
	},
	{ _id: false },
);

const fileSchema = new Schema(
	{
		originalName: { type: String, required: true },
		storedName: { type: String, required: true, unique: true },
		fileSize: { type: Number, required: true },
		mimeType: { type: String, default: "text/csv" },
		uploadedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		columns: { type: [columnSchema], default: [] },
		rowCount: { type: Number, default: 0 },
		previewData: { type: Schema.Types.Mixed, default: [] },
	},
	{ timestamps: true },
);

fileSchema.index({ uploadedBy: 1, createdAt: -1 });

export interface IFile {
	originalName: string;
	storedName: string;
	fileSize: number;
	mimeType: string;
	uploadedBy: mongoose.Types.ObjectId;
	columns: ColumnDefinition[];
	rowCount: number;
	previewData: string[][];
	createdAt: Date;
	updatedAt: Date;
}

export type FileDocument = HydratedDocument<IFile>;
export const FileModel = mongoose.model("File", fileSchema);
