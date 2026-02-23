if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is required in production");
}

export const config = {
	port: parseInt(process.env.PORT || "3000", 10),
	host: process.env.HOST || "0.0.0.0",
	mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/test_elai",
	jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
	uploadDir: process.env.UPLOAD_DIR || "./uploads",
	csvPreviewRows: parseInt(process.env.CSV_PREVIEW_ROWS || "100", 10),
	maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || "50", 10),
	corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4200",
} as const;
