import fp from "fastify-plugin";
import mongoose from "mongoose";
import { FastifyPluginAsync } from "fastify";
import { config } from "@config/index";

const databasePlugin: FastifyPluginAsync = async (fastify) => {
	try {
		await mongoose.connect(config.mongodbUri);
		fastify.log.info("Connected to MongoDB");

		fastify.addHook("onClose", async () => {
			await mongoose.connection.close();
		});
	} catch (err: unknown) {
		fastify.log.error(err as Error, "MongoDB connection error");
		throw err;
	}
};

export default fp(databasePlugin, { name: "database" });
