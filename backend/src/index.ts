import { buildApp } from "./app";
import { config } from "@config/index";

async function main() {
	const app = await buildApp();

	const shutdown = async () => {
		await app.close();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	try {
		await app.listen({ port: config.port, host: config.host });
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

main();
