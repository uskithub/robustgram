import { beforeEach, describe, expect, it } from "vitest";
import {
  RobustiveDiagram,
  RobustiveObjectType,
  RobustiveParseSyntaxError,
  RobustiveRelationType,
} from "./robustive";
import util from "node:util";

describe("Parsing with robustive.jison", () => {
  const d = new RobustiveDiagram();

  beforeEach(() => {
    d.clear();
  });

  /**
   * spec | pattern
   * -----|----------------
   * x    | A related A
   * o    | A related B
   * x    | A related C
   * x    | A related E
   * x    | A related U
   * x    | A sequential X
   * x    | A conditional X
   * -----|----------------
   * x    | B related X
   * x    | B sequential X
   * x    | B conditional A
   * x    | B conditional B
   * o    | B conditional C
   * x    | B conditional E
   * o    | B conditional U
   * -----|----------------
   * x    | C related A
   * x    | C related B
   * x    | C related C
   * o    | C related E
   * x    | C related U
   * x    | C sequential A
   * o    | C sequential B
   * o    | C sequential C
   * x    | C sequential E
   * o    | C sequential U
   * x    | C conditional A
   * x    | C conditional B
   * o    | C conditional C
   * x    | C conditional E
   * o    | C conditional U
   * -----|----------------
   * x    | U related X
   * x    | U sequential X
   * x    | U conditional A
   * x    | U conditional B
   * o    | U conditional C
   * x    | U conditional E
   * o    | U conditional U
   */
  describe("構文解析規則", async () => {
    it("robustiveで始まるテキストを解析できること", async () => {
      const text = `robustive
    A[User] --- B[SignIn]`;

      const result = await d.parse(text);
      expect(result).not.toBeNull();
      expect(result.hasError).toBeFalsy();
    });

    describe("異常系", async () => {
      it("stateDiagramで始まるテキストは構文エラーで解析できないこと", async () => {
        const text = `stateDiagram
        A[User] --- B[iPhone's home]`;

        await expect(d.parse(text)).rejects.toThrow(RobustiveParseSyntaxError); // 任意のエラーのスローを期待
      });
    });

    describe("基本コースの始め", async () => {
      it("Actor --- Boundaryが解析できること", async () => {
        const text = `robustive
    A[User] --- B[SignIn]`;

        const result = await d.parse(text);

        expect(result).not.toBeNull();
        expect(result.basics.type).toBe(RobustiveObjectType.Actor);
        expect(result.basics.text).toBe("User");
        expect(result.basics.violating).toBeUndefined();
        expect(result.basics.relations[0].type).toBe(
          RobustiveRelationType.Related
        );
        expect(result.basics.relations[0].to.type).toBe(
          RobustiveObjectType.Boundary
        );
        expect(result.basics.relations[0].to.text).toBe("SignIn");
        expect(result.alternatives.length).toBe(0);
        expect(result.hasError).toBeFalsy();
      });

      describe("異常系", async () => {
        it("Boundary は構文違反となること", async () => {
          const text = `robustive
          B[SignIn] -->[touch button] C[App checks if the user has a session](checkSession)`;

          const result = await d.parse(text);

          expect(result).not.toBeNull();
          expect(result.basics.type).toBe(RobustiveObjectType.Boundary);
          expect(result.basics.violating).toBe(
            "Only Actor comes first in the basic course."
          );
          expect(result.hasError).toBeTruthy();
        });

        it("Controller は構文違反となること", async () => {
          const text = `robustive
          C[App checks if the user has a session](checkSession) --- B[SignIn]`;

          const result = await d.parse(text);

          expect(result).not.toBeNull();
          expect(result.basics.type).toBe(RobustiveObjectType.Controller);
          expect(result.basics.violating).toBe(
            "Only Actor comes first in the basic course."
          );
          expect(result.hasError).toBeTruthy();
        });

        it("Entityは構文違反となること", async () => {
          const text = `robustive
          E[UserInfo] -->[touch button] C[App checks if the user has a session](checkSession)`;

          const result = await d.parse(text);

          expect(result).not.toBeNull();
          expect(result.basics.type).toBe(RobustiveObjectType.Entity);
          expect(result.basics.violating).toBe(
            "Only Actor comes first in the basic course."
          );
          expect(result.hasError).toBeTruthy();
        });

        it("Usecase は構文違反となること", async () => {
          const text = `robustive
          U[User signs up](signUp) -->[touch button] C[App checks if the user has a session](checkSession)`;

          const result = await d.parse(text);

          expect(result).not.toBeNull();
          expect(result.basics.type).toBe(RobustiveObjectType.Usecase);
          expect(result.basics.violating).toBe(
            "Only Actor comes first in the basic course."
          );
          expect(result.hasError).toBeTruthy();
        });

        it.todo("Actor --- Actor は構文違反となること");
        it.todo("Actor --- Controller は構文違反となること");
        it.todo("Actor --- Entity は構文違反となること");
        it.todo("Actor --- Usecase は構文違反となること");
        it.todo("Actor --> Actor は構文違反となること");
        it.todo("Actor --> Boundary は構文違反となること");
        it.todo("Actor --> Controller は構文違反となること");
        it.todo("Actor --> Entity は構文違反となること");
        it.todo("Actor --> Usecase は構文違反となること");
        it.todo("Actor -->[Condition] Actor は構文違反となること");
        it.todo("Actor -->[Condition] Boundary は構文違反となること");
        it.todo("Actor -->[Condition] Controller は構文違反となること");
        it.todo("Actor -->[Condition] Entity は構文違反となること");
        it.todo("Actor -->[Condition] Usecase は構文違反となること");
      });
    });

    describe("基本コース", async () => {
      it("Boundary -->[Condition] Controller が解析できること", async () => {
        const text = `robustive
    A[User] --- B[SignIn]
        -->[touch button] C[App checks if the user has a session](checkSession)`;

        const result = await d.parse(text);

        expect(result).not.toBeNull();

        const relation = result.basics.relations[0].to.relations[0];
        expect(relation.type).toBe(RobustiveRelationType.Conditional);
        expect(relation.condition).toBe("touch button");
        expect(relation.violating).toBeUndefined();
        expect(relation.to.type).toBe(RobustiveObjectType.Controller);
        expect(relation.to.text).toBe("App checks if the user has a session");
        expect(relation.to.alias).toBe("checkSession");
        expect(relation.to.violating).toBeUndefined();
        expect(result.alternatives.length).toBe(0);
        expect(result.hasError).toBeFalsy();
      });

      it("Boundary -->[Condition] Usecase が解析できること", async () => {
        const text = `robustive
    A[User] --- B[SignIn]
        -->[touch button] U[User signs up](signUp)`;

        const result = await d.parse(text);

        expect(result).not.toBeNull();

        const relation = result.basics.relations[0].to.relations[0];
        expect(relation.type).toBe(RobustiveRelationType.Conditional);
        expect(relation.condition).toBe("touch button");
        expect(relation.violating).toBeUndefined();
        expect(relation.to.type).toBe(RobustiveObjectType.Usecase);
        expect(relation.to.text).toBe("User signs up");
        expect(relation.to.alias).toBe("signUp");
        expect(relation.to.violating).toBeUndefined();
        expect(result.alternatives.length).toBe(0);
        expect(result.hasError).toBeFalsy();
      });

      it("Controller --- Entity が解析できること", async () => {
        const text = `robustive
    A[User] --- B[SignIn]
        -->[touch button] C[App checks if the user has a session](checkSession)
            --- E[UserInfo]`;

        const result = await d.parse(text);

        expect(result).not.toBeNull();

        const relation =
          result.basics.relations[0].to.relations[0].to.relations[0];
        expect(relation.type).toBe(RobustiveRelationType.Related);
        expect(relation.violating).toBeUndefined();
        expect(relation.to.type).toBe(RobustiveObjectType.Entity);
        expect(relation.to.text).toBe("UserInfo");
        expect(relation.to.violating).toBeUndefined();
        expect(result.alternatives.length).toBe(0);
        expect(result.hasError).toBeFalsy();
      });

      it("Controller --- Entity, Entity が解析できること", async () => {
        const text = `robustive
    A[User] --- B[SignIn]
        -->[touch button] C[App checks if the user has a session](checkSession)
            --- E[UserInfo], E[Version]`;

        const result = await d.parse(text);

        expect(result).not.toBeNull();

        const relations =
          result.basics.relations[0].to.relations[0].to.relations;
        expect(relations[0].type).toBe(RobustiveRelationType.Related);
        expect(relations[0].violating).toBeUndefined();
        expect(relations[0].to.type).toBe(RobustiveObjectType.Entity);
        expect(relations[0].to.text).toBe("UserInfo");
        expect(relations[0].to.violating).toBeUndefined();

        expect(relations[1].type).toBe(RobustiveRelationType.Related);
        expect(relations[1].violating).toBeUndefined();
        expect(relations[1].to.type).toBe(RobustiveObjectType.Entity);
        expect(relations[1].to.text).toBe("Version");
        expect(relations[1].to.violating).toBeUndefined();

        expect(result.alternatives.length).toBe(0);
        expect(result.hasError).toBeFalsy();
      });

      it("Controller --- Entity, Entity, Entity が解析できること", async () => {
        const text = `robustive
    A[User] --- B[SignIn]
        -->[touch button] C[App checks if the user has a session](checkSession)
            --- E[UserInfo], E[Version], E[Timestamp]`;

        const result = await d.parse(text);

        console.debug("***", util.inspect(result, { depth: Infinity }));

        expect(result).not.toBeNull();

        const relations =
          result.basics.relations[0].to.relations[0].to.relations;
        expect(relations[0].type).toBe(RobustiveRelationType.Related);
        expect(relations[0].violating).toBeUndefined();
        expect(relations[0].to.type).toBe(RobustiveObjectType.Entity);
        expect(relations[0].to.text).toBe("UserInfo");
        expect(relations[0].to.violating).toBeUndefined();

        expect(relations[1].type).toBe(RobustiveRelationType.Related);
        expect(relations[1].violating).toBeUndefined();
        expect(relations[1].to.type).toBe(RobustiveObjectType.Entity);
        expect(relations[1].to.text).toBe("Version");
        expect(relations[1].to.violating).toBeUndefined();

        expect(result.alternatives.length).toBe(0);
        expect(result.hasError).toBeFalsy();
      });

      describe("異常系", async () => {
        it.todo("Boundary --- Actor は構文違反となること");

        it.todo("Boundary --- Boundary は構文違反となること");

        it("Boundary --- Controller は構文違反となること", async () => {
          const text = `robustive
      A[User] --- B[SignIn]
          --- C[App checks if the user has a session](checkSession)`;

          const result = await d.parse(text);

          expect(result).not.toBeNull();
          const relation = result.basics.relations[0].to.relations[0];
          expect(relation.violating).toBe(
            '"Related" can only be connected to Boundary or Entity.'
          );

          expect(result.hasError).toBeTruthy();
        });

        it.todo("Boundary --- Entity は構文違反となること");

        it("Boundary --- Usecase は構文違反となること", async () => {
          const text = `robustive
      A[User] --- B[SignIn]
          --- U[User signs up](SignUp)`;

          const result = await d.parse(text);

          expect(result).not.toBeNull();
          const relation = result.basics.relations[0].to.relations[0];
          expect(relation.violating).toBe(
            '"Related" can only be connected to Boundary or Entity.'
          );

          expect(result.hasError).toBeTruthy();
        });

        it.todo("Boundary --> Actor は構文違反となること");
        it.todo("Boundary --> Boundary は構文違反となること");
        it.todo("Boundary --> Controller は構文違反となること");
        it.todo("Boundary --> Entity は構文違反となること");
        it.todo("Boundary --> Usecase は構文違反となること");

        it.todo("Boundary --->[Condition] Actor は構文違反となること");
        it.todo("Boundary --->[Condition] Boundary は構文違反となること");
        it.todo("Boundary --->[Condition] Boundary は構文違反となること");
        it.todo("Boundary --->[Condition] Entity は構文違反となること");
      });
    });
  });
});
