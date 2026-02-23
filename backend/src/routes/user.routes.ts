import { FastifyPluginAsync } from "fastify";
import UserService from "@services/user.service";
import hasPermission from "@middlewares/auth.middleware";
import { Errors } from "@errors/index";
import { type Permission, VALID_PERMISSIONS } from "../types/index";

interface UserParams {
	id: string;
}

interface UpdateUserBody {
	name?: string;
	email?: string;
}

interface UpdatePermissionsBody {
	permissions: Permission[];
}

const userRoutes: FastifyPluginAsync = async (fastify) => {
	const userService = new UserService(fastify.log);

	fastify.addHook("onRequest", fastify.authenticate);

	// tutte le rotte qui sotto richiedono manage_users
	fastify.addHook("onRequest", async (request) => {
		if (!hasPermission(request, "manage_users")) {
			throw Errors.forbidden("Requires manage_users permission");
		}
	});

	fastify.get("/", async (_request, reply) => {
		const users = await userService.listUsers();
		return reply.send({ users });
	});

	fastify.get<{ Params: UserParams }>("/:id", async (request, reply) => {
		const user = await userService.getUserById(request.params.id);
		if (!user) throw Errors.notFound("User");
		return reply.send({ user });
	});

	fastify.put<{ Params: UserParams; Body: UpdateUserBody }>(
		"/:id",
		{
			schema: {
				body: {
					type: "object",
					properties: {
						name: { type: "string", minLength: 1 },
						email: { type: "string", format: "email" },
					},
					additionalProperties: false,
				},
			},
		},
		async (request, reply) => {
			const user = await userService.updateUser(request.params.id, request.body);
			if (!user) throw Errors.notFound("User");
			return reply.send({ user });
		},
	);

	fastify.put<{ Params: UserParams; Body: UpdatePermissionsBody }>(
		"/:id/permissions",
		{
			schema: {
				body: {
					type: "object",
					required: ["permissions"],
					properties: {
						permissions: {
							type: "array",
							items: {
								type: "string",
								enum: [...VALID_PERMISSIONS],
							},
						},
					},
					additionalProperties: false,
				},
			},
		},
		async (request, reply) => {
			const user = await userService.updatePermissions(
				request.params.id,
				request.body.permissions,
				request.user.userId,
			);
			if (!user) throw Errors.notFound("User");
			return reply.send({ user });
		},
	);

	fastify.delete<{ Params: UserParams }>("/:id", async (request, reply) => {
		const deleted = await userService.deleteUser(request.params.id, request.user.userId);
		if (!deleted) throw Errors.notFound("User");
		return reply.code(204).send();
	});
};

export default userRoutes;
