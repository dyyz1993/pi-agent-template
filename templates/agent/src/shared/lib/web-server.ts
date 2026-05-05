import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { networkInterfaces } from "os";
import { createHttpHandler } from "@shared/http-routes";
import { createWsHandler } from "../../gateway/ws-handler";
import { createLogger } from "@shared/logger";

const log = createLogger("web-server");

export interface WebServerConfig {
	port: number;
	authToken: string;
	maxUploadSize: number;
	corsOrigin: string;
}

export interface WebServerResult {
	httpServer: Server;
	wss: ReturnType<typeof createWsHandler>;
	port: number;
	authToken: string;
	close: () => Promise<void>;
}

export function getLocalIP(): string {
	const nets = networkInterfaces();
	for (const name of Object.keys(nets)) {
		const interfaces = nets[name];
		if (!interfaces) continue;
		for (const net of interfaces) {
			if (net.family === "IPv4" && !net.internal) {
				return net.address;
			}
		}
	}
	return "127.0.0.1";
}

function checkPort(port: number): Promise<number> {
	return new Promise((resolve, reject) => {
		const testServer = createServer();
		testServer.once("error", (err: NodeJS.ErrnoException) => {
			testServer.close();
			reject(err);
		});
		testServer.once("listening", () => {
			testServer.close();
			resolve(port);
		});
		testServer.listen(port);
	});
}

export async function findAvailablePort(startPort: number, maxRetries = 10): Promise<number> {
	for (let port = startPort; port < startPort + maxRetries; port++) {
		try {
			await checkPort(port);
			return port;
		} catch {
			continue;
		}
	}
	throw new Error(`No available port found after ${maxRetries} retries starting from ${startPort}`);
}

function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const s = createServer();
		s.listen(0, () => {
			const addr = s.address();
			s.close(() => {
				if (typeof addr === "object" && addr) {
					resolve(addr.port);
				} else {
					reject(new Error("Failed to allocate port"));
				}
			});
		});
		s.on("error", reject);
	});
}

export async function createWebServer(config: WebServerConfig): Promise<WebServerResult> {
	const port = config.port === 0 ? await getFreePort() : await findAvailablePort(config.port);

	const httpServer = createServer();

	const wss = createWsHandler(httpServer, {
		config: {
			port,
			authToken: config.authToken,
			maxUploadSize: config.maxUploadSize,
		},
	});

	httpServer.on(
		"request",
		createHttpHandler({
			config: {
				port,
				authToken: config.authToken,
				maxUploadSize: config.maxUploadSize,
				corsOrigin: config.corsOrigin,
			},
			getWebSocketClientCount: () => wss.clients.size,
		})
	);

	return new Promise((resolve, reject) => {
		httpServer.listen(port, () => {
			log.info("Web server started", { port, corsOrigin: config.corsOrigin });

			resolve({
				httpServer,
				wss,
				port,
				authToken: config.authToken,
				close: () =>
					new Promise<void>((res) => {
						wss.clients.forEach((ws) => ws.close());
						wss.close(() => {
							httpServer.close(() => res());
						});
					}),
			});
		});
		httpServer.on("error", reject);
	});
}
