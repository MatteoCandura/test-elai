import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { config } from "@config/index";
import { Errors } from "@errors/index";

const authPlugin: FastifyPluginAsync = async (fastify) => {
	await fastify.register(fastifyJwt, {
		secret: config.jwtSecret,
		sign: { expiresIn: "7d" },
	});

	fastify.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
		try {
			await request.jwtVerify();
		} catch {
			throw Errors.unauthorized("Invalid or expired token");
		}
	});
};

declare module "fastify" {
	interface FastifyInstance {
		authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	}
}

export default fp(authPlugin, { name: "auth" });
