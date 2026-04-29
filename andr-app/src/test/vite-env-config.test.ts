import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("vite env configuration", () => {
  it("loads VITE_* variables from the repository root .env file", () => {
    const configSource = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");

    expect(configSource).toMatch(/envDir:\s*["']\.\.["']/);
  });
});
