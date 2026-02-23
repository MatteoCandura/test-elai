import mongoose, { Schema, HydratedDocument } from "mongoose";
import bcrypt from "bcrypt";
import { Permission, VALID_PERMISSIONS } from "../types/index";

const userSchema = new Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 8,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		permissions: {
			type: [String],
			default: [],
			enum: [...VALID_PERMISSIONS],
		},
	},
	{ timestamps: true },
);

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 12);
	next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
	return bcrypt.compare(candidate, this.password);
};

export interface IUser {
	email: string;
	password: string;
	name: string;
	permissions: Permission[];
	createdAt: Date;
	updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser & { comparePassword(candidate: string): Promise<boolean> }>;
export const User = mongoose.model("User", userSchema);
