import { beforeEach, describe, expect, it } from "vitest";
import {
  RobustiveDiagram,
  RobustiveObjectType,
  RobustiveParseSyntaxError,
  RobustiveRelationType,
} from "./robustive";

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
    });

    it("基本コースの始め、Actor --- Boundaryが解析できること", async () => {
      const text = `robustive
    A[User] --- B[SignIn]`;

      const result = await d.parse(text);

      expect(result).not.toBeNull();
      expect(result.basics.type).toBe(RobustiveObjectType.Actor);
      expect(result.basics.text).toBe("User");
      expect(result.basics.relations[0].type).toBe(
        RobustiveRelationType.Related
      );
      expect(result.basics.relations[0].to.type).toBe(
        RobustiveObjectType.Boundary
      );
      expect(result.basics.relations[0].to.text).toBe("SignIn");
      expect(result.alternatives.length).toBe(0);
    });

    it("基本コース、Boundary -->[Condition] Controller が解析できること", async () => {
      const text = `robustive
    A[User] --- B[SignIn]
        -->[touch button] C[App checks if the user has a session](checkSession)`;

      const result = await d.parse(text);
      console.log("***", result.basics.relations);
      console.log("***", result.basics.relations[0][0]);
      console.log("***", result.basics.relations[0][0].to);
      console.log("***", result.basics.relations[0][0].to.relations[0].to);

      expect(result).not.toBeNull();
      expect(result.basics.type).toBe(RobustiveObjectType.Actor);
      expect(result.basics.text).toBe("User");
      expect(result.basics.relations[0].type).toBe(
        RobustiveRelationType.Related
      );
      expect(result.basics.relations[0].to.type).toBe(
        RobustiveObjectType.Boundary
      );
      expect(result.basics.relations[0].to.text).toBe("SignIn");
      expect(result.alternatives.length).toBe(0);
    });

    describe("異常系", async () => {
      it("stateDiagramで始まるテキストは構文エラーで解析できないこと", async () => {
        const text = `stateDiagram
        A[User] --- B[iPhone's home]`;

        await expect(d.parse(text)).rejects.toThrow(RobustiveParseSyntaxError); // 任意のエラーのスローを期待
      });
    });
  });
});
