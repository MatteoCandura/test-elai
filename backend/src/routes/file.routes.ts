import fs from "node:fs";
import path from "node:path";
import { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import FileService from "@services/file.service";
import { ALLOWED_EXTENSIONS } from "@services/parser.service";
import { Errors } from "@errors/index";
import { config } from "@config/index";
import type { ColumnDefinition } from "../types/index";
import hasPermission from "@middlewares/auth.middleware";

interface ColumnsBody {
	columns: ColumnDefinition[];
}

interface FileParams {
	id: string;
}

const fileRoutes: FastifyPluginAsync = async (fastify) => {
	const fileService = new FileService(fastify.log);
	await fastify.register(multipart, {
		limits: {
			fileSize: config.maxUploadSizeMb * 1024 * 1024,
			files: 1,
		},
	});

	fastify.addHook("onRequest", fastify.authenticate);

	fastify.post("/upload", async (request, reply) => {
		const file = await request.file();
		if (!file) {
			throw Errors.badRequest("No file provided");
		}

		const ext = path.extname(file.filename).toLowerCase();
		if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
			throw Errors.badRequest(`Only ${ALLOWED_EXTENSIONS.join(", ")} files are allowed`);
		}

		const result = await fileService.upload(file, request.user.userId);
		return reply.code(201).send({ file: result });
	});

	fastify.get("/", async (request, reply) => {
		const files = await fileService.listFiles(request.user.userId, hasPermission(request, "view_all"));
		return reply.send({ files });
	});

	fastify.get<{ Params: FileParams }>("/:id", async (request, reply) => {
		const file = await fileService.getFileById(
			request.params.id,
			request.user.userId,
			hasPermission(request, "view_all"),
		);
		if (!file) throw Errors.notFound("File");
		return reply.send({ file });
	});

	fastify.put<{ Params: FileParams; Body: ColumnsBody }>("/:id/columns", async (request, reply) => {
		const file = await fileService.updateColumns(
			request.params.id,
			request.body.columns,
			request.user.userId,
			hasPermission(request, "edit_all"),
		);
		if (!file) throw Errors.notFound("File");
		return reply.send({ file });
	});

	fastify.delete<{ Params: FileParams }>("/:id", async (request, reply) => {
		const deleted = await fileService.deleteFile(
			request.params.id,
			request.user.userId,
			hasPermission(request, "delete_all"),
		);
		if (!deleted) throw Errors.notFound("File");
		return reply.code(204).send();
	});

	fastify.get<{ Params: FileParams }>("/:id/download", async (request, reply) => {
		const fileInfo = await fileService.getFilePath(
			request.params.id,
			request.user.userId,
			hasPermission(request, "view_all"),
		);
		if (!fileInfo) throw Errors.notFound("File");

		const { filePath, originalName, mimeType } = fileInfo;

		const safeFilename = originalName.replace(/["\r\n\\]/g, "_");
		reply.header("Content-Disposition", `attachment; filename="${safeFilename}"`);
		reply.header("Content-Type", mimeType);

		return reply.send(fs.createReadStream(filePath));
	});
};

export default fileRoutes;
