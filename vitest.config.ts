import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test-setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"**/*.test.{ts,tsx}",
				"**/*.d.ts",
				"**/*.config.{ts,js}",
				"src/test-setup.ts",
			],
		},
	},
	resolve: {
		alias: {
			"@": "./src",
		},
	},
});
