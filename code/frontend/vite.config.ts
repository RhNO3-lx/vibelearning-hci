import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "math", test: /node_modules\/katex/, priority: 30 },
            {
              name: "graph",
              test: /node_modules\/(?:@xyflow|d3-)/,
              priority: 20,
            },
            {
              name: "markdown",
              test: /node_modules\/(?:react-markdown|remark-|rehype-|micromark|mdast-|hast-|unified)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
