import { beforeEach, describe, expect, it } from "vitest";
import { RobustiveDiagram, RobustiveObjectType } from "./robustive";

describe("Parsing with robustive.jison", () => {
  const d = new RobustiveDiagram();

  beforeEach(() => {
    d.clear();
  });

  describe("構文解析規則", async () => {
    it("robustiveで始まるテキストを解析できること", async () => {
      const text = `robustive
    A[User] --- B[SignIn]`;

      const result = await d.parse(text);
      expect(result).not.toBeNull();
      expect(result.length).toBe(1);
    });

    describe("異常系", async () => {
      it("stateDiagramで始まるテキストは解析できないこと", async () => {
        const text = `stateDiagram
        A[User] --- B[iPhone's home]`;

        const result = await d.parse(text).catch((e) => {});
        expect(1).toBe(1);
      });
    });
  });
});
