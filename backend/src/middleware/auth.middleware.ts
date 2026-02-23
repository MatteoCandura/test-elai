import { FastifyRequest } from "fastify";
import { Permission } from "../types/index";

export default function hasPermission(request: FastifyRequest, permission: Permission): boolean {
	return request.user?.permissions?.includes(permission) ?? false;
}
