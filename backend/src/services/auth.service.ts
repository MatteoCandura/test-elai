import { User, UserDocument } from "@models/user.model";
import { Errors } from "@errors/index";

export default class AuthService {
	// bootstrap: il primo utente in assoluto diventa admin con tutti i permessi
	async register(data: { email: string; password: string; name: string }): Promise<UserDocument> {
		const existingUser = await User.findOne({ email: data.email });
		if (existingUser) {
			throw Errors.conflict("Email already registered");
		}
		const isFirstUser = (await User.countDocuments()) === 0;
		const user = new User(data);
		if (isFirstUser) {
			user.permissions = ["view_all", "delete_all", "edit_all", "manage_users"];
		}
		await user.save();

		return user as UserDocument;
	}

	// stesso messaggio per email e password sbagliata — evita user enumeration
	async login(email: string, password: string): Promise<UserDocument> {
		const user = (await User.findOne({ email })) as UserDocument | null;
		if (!user) {
			throw Errors.unauthorized("Invalid email or password");
		}
		const isValid = await user.comparePassword(password);
		if (!isValid) {
			throw Errors.unauthorized("Invalid email or password");
		}
		return user;
	}

	async getById(id: string): Promise<UserDocument | null> {
		return User.findById(id).select("-password") as Promise<UserDocument | null>;
	}
}
