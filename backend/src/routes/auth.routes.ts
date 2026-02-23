import { FastifyInstance, FastifyPluginAsync } from "fastify";
import AuthService from "@services/auth.service";
import { UserDocument } from "@models/user.model";
import { Errors } from "@errors/index";

interface RegisterBody {
	email: string;
	password: string;
	name: string;
}

interface LoginBody {
	email: string;
	password: string;
}

function buildAuthResponse(user: UserDocument, fastify: FastifyInstance) {
	const token = fastify.jwt.sign({
		userId: user._id.toString(),
		email: user.email,
		permissions: user.permissions,
	});
	return {
		token,
		user: {
			id: user._id,
			email: user.email,
			name: user.name,
			permissions: user.permissions,
		},
	};
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
	const authService = new AuthService();

	fastify.post<{ Body: RegisterBody }>(
		"/register",
		{
			schema: {
				body: {
					type: "object",
					required: ["email", "password", "name"],
					properties: {
						email: { type: "string", format: "email" },
						password: { type: "string", minLength: 8 },
						name: { type: "string", minLength: 1 },
					},
				},
			},
		},
		async (request, reply) => {
			const user = await authService.register(request.body);
			reply.code(201).send(buildAuthResponse(user, fastify));
		},
	);

	fastify.post<{ Body: LoginBody }>(
		"/login",
		{
			schema: {
				body: {
					type: "object",
					required: ["email", "password"],
					properties: {
						email: { type: "string", format: "email" },
						password: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const user = await authService.login(request.body.email, request.body.password);
			reply.send(buildAuthResponse(user, fastify));
		},
	);

	fastify.get("/me", { onRequest: [fastify.authenticate] }, async (request, reply) => {
		const user = await authService.getById(request.user.userId);
		if (!user) throw Errors.notFound("User");
		reply.send({ user });
	});
};

export default authRoutes;
