import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FARE_LABEL } from "../src/city";
import { CHROME, TITLE } from "../src/copy";

const root = join(import.meta.dir, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function playerFiles(): string[] {
  const src = walk(join(root, "src")).filter((path) => /\.(ts|css|html)$/.test(path));
  return [join(root, "index.html"), join(root, "package.json"), join(root, "README.md"), ...src];
}

const forbidden = ["滴滴", "滴滴出行", "DiDi", "didi"];

describe("trademark and copy guards", () => {
  test("player-facing sources avoid the blocked names", () => {
    const hits: string[] = [];
    for (const path of playerFiles()) {
      const text = readFileSync(path, "utf8");
      const lower = text.toLowerCase();
      for (const word of forbidden) {
        if (lower.includes(word.toLowerCase())) hits.push(`${path} :: ${word}`);
      }
    }
    expect(hits).toEqual([]);
  });

  test("package name, title and start copy stay clear", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string };
    expect(pkg.name).toBe("express-driver-sim");
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).toContain("《网约车司机模拟器》");
    expect(TITLE).toBe("《网约车司机模拟器》");
    expect(CHROME.join("\n")).toContain("出车开工");
    expect(html.toLowerCase()).not.toContain("didi");
  });

  test("readme headings do not use the blocked name", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    const headings = readme.split("\n").filter((line) => line.startsWith("#"));
    expect(headings.join("\n").toLowerCase()).not.toContain("didi");
    expect(headings.join("\n")).not.toContain("滴滴");
  });

  test("no official rate claims", () => {
    const blob = playerFiles().map((path) => readFileSync(path, "utf8")).join("\n");
    expect(blob).not.toContain("官方现行价");
    expect(blob).not.toContain("固定抽成 14%");
    expect(blob).not.toContain("固定抽成14%");
    expect(blob).not.toContain("本游戏采用");
    expect(FARE_LABEL).toBe("模拟计价、非官方");
  });

  test("hk taxi props stay out of the game", () => {
    const blob = playerFiles().map((path) => readFileSync(path, "utf8")).join("\n");
    for (const word of ["HK$", "车租", "份子钱", "石油气", "尿急", "咪表", "茶餐廳"]) {
      expect(blob).not.toContain(word);
    }
  });
});
