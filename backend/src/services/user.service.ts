import fsp from "node:fs/promises";
import path from "node:path";
import { FastifyBaseLogger } from "fastify";
import { User, UserDocument } from "@models/user.model";
import { FileModel } from "@models/file.model";
import { Errors } from "@errors/index";
import { Permission, VALID_PERMISSIONS } from "../types/index";
import { config } from "@config/index";

export default class UserService {
	constructor(private logger: FastifyBaseLogger) {}

	async listUsers(): Promise<UserDocument[]> {
		return User.find()
			.select("-password")
			.sort({ createdAt: -1 }) as unknown as Promise<UserDocument[]>;
	}

	async getUserById(id: string): Promise<UserDocument | null> {
		return User.findById(id).select("-password") as Promise<UserDocument | null>;
	}

	// re-fetch dopo save per escludere la password dalla risposta
	async updateUser(
		id: string,
		data: { name?: string; email?: string },
	): Promise<UserDocument | null> {
		const user = (await User.findById(id)) as UserDocument | null;
		if (!user) return null;

		if (data.name !== undefined) user.name = data.name;
		if (data.email !== undefined) user.email = data.email;
		await user.save();

		const updated = await User.findById(id).select("-password");
		return updated as UserDocument | null;
	}

	// non puoi toglierti manage_users da solo, altrimenti ti blocchi fuori dall'admin
	async updatePermissions(
		userId: string,
		permissions: Permission[],
		requesterId: string,
	): Promise<UserDocument | null> {
		const invalid = permissions.filter((p) => !VALID_PERMISSIONS.includes(p));
		if (invalid.length > 0) {
			throw Errors.badRequest(`Invalid permissions: ${invalid.join(", ")}`);
		}

		if (userId === requesterId && !permissions.includes("manage_users")) {
			throw Errors.badRequest("Cannot remove manage_users permission from yourself");
		}

		const user = (await User.findById(userId)) as UserDocument | null;
		if (!user) return null;

		user.permissions = permissions;
		await user.save();

		const updated = await User.findById(userId).select("-password");
		return updated as UserDocument | null;
	}

	// cancella anche tutti i file dell'utente (disco + DB). no self-delete.
	async deleteUser(userId: string, requesterId: string): Promise<boolean> {
		if (userId === requesterId) {
			throw Errors.badRequest("Cannot delete yourself");
		}

		const user = (await User.findById(userId)) as UserDocument | null;
		if (!user) return false;

		const files = await FileModel.find({ uploadedBy: userId });
		for (const file of files) {
			try {
				await fsp.unlink(path.join(config.uploadDir, file.storedName));
			} catch (err) {
				this.logger.error({ err, storedName: file.storedName }, "Failed to delete user file from disk");
			}
		}
		await FileModel.deleteMany({ uploadedBy: userId });

		await User.findByIdAndDelete(userId);
		return true;
	}
}
