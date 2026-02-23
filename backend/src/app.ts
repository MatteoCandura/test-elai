import Fastify, { FastifyError, FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { MongoServerError } from "mongodb";
import databasePlugin from "./plugins/database";
import authPlugin from "./plugins/auth";
import corsPlugin from "./plugins/cors";
import authRoutes from "@routes/auth.routes";
import fileRoutes from "@routes/file.routes";
import userRoutes from "@routes/user.routes";
import { AppError } from "@errors/index";
import fs from "fs";

export async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify({
		logger: {
			level: "info",
		},
		bodyLimit: 1048576,
	});

	await app.register(corsPlugin);
	await app.register(databasePlugin);
	await app.register(authPlugin);

	await app.register(authRoutes, { prefix: "/api/auth" });
	await app.register(fileRoutes, { prefix: "/api/files" });
	await app.register(userRoutes, { prefix: "/api/users" });

	if (!fs.existsSync("uploads")) {
		fs.mkdirSync("uploads");
	}

	app.get("/api/health", async () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
	}));

	app.setNotFoundHandler((request, reply) => {
		reply.code(404).send({
			statusCode: 404,
			code: "ROUTE_NOT_FOUND",
			message: `Route ${request.method} ${request.url} not found`,
		});
	});

	app.setErrorHandler(
		(
			error: {
				statusCode: number;
				name: string;
				message: string;
				validation?: any;
				errors?: any;
				path?: string;
				value?: any;
				code?: number | string;
			},
			request,
			reply,
		) => {
			if (error instanceof AppError) {
				return reply.code(error.statusCode).send({
					statusCode: error.statusCode,
					code: error.code,
					message: error.message,
				});
			}

			let statusCode = error.statusCode || 400;
			let code = "BAD_REQUEST";
			let details = undefined;

			if (error.validation) {
				code = "VALIDATION_ERROR";
				details = error.validation.map(
					(v: { instancePath: string; params?: { missingProperty?: string }; message?: string }) => ({
						field: v.instancePath.replace(/^\//, "") || v.params?.missingProperty || "unknown",
						message: v.message || "Invalid value",
					}),
				);
			} else if (error.name === "ValidationError") {
				code = "VALIDATION_ERROR";
				details = Object.entries(error.errors || {}).map(([field, err]: [string, any]) => ({
					field,
					message: err.message,
				}));
			} else if (error.name === "CastError") {
				code = "INVALID_ID";
				error.message = `Invalid ${error.path}: ${error.value}`;
			} else if (error instanceof MongoServerError && error.code === 11000) {
				statusCode = 409;
				code = "DUPLICATE_KEY";
				const field = Object.keys(error.keyValue || {})[0] || "unknown";
				error.message = `Duplicate value for field: ${field}`;
			} else if (statusCode >= 500) {
				request.log.error(error);
				return reply.code(500).send({
					statusCode: 500,
					code: "INTERNAL_ERROR",
					message: "Internal Server Error",
				});
			}

			return reply.code(statusCode).send({
				statusCode,
				code,
				message: error.message,
				details,
			});
		},
	);

	return app;
}
