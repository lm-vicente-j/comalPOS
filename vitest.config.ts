import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/integration/**/*.test.ts"],
        setupFiles: ["tests/integration/setup.ts"],
        // All files share one test database: run them sequentially.
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname),
        },
    },
});
