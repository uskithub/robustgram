import "./style.css";

// @ts-ignore: JISON doesn't support types
import { DiagramDefinition, registerDiagram } from "./diagram";
import { run } from "./render";
import { RobustiveDiagram } from "./robustive.js";
import { StateDiagram } from "./state/state.js";

export const initialize = () => {
  registerDiagram("robustive", new RobustiveDiagram());
  registerDiagram("stateDiagram", new StateDiagram());
};

if (typeof document !== "undefined") {
  window.addEventListener(
    "load",
    () => {
      return run().catch((err) =>
        console.error("Mermaid failed to initialize", err)
      );
    },
    false
  );
}
