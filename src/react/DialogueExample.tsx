import React, { useState, useMemo } from "react";
import { parseYarn } from "../parse/parser.js";
import { compile } from "../compile/compiler.js";
import { useYarnRunner } from "./useYarnRunner.js";
import { DialogueView } from "./DialogueView.js";
import { parseScenes } from "../scene/parser.js";
import type { SceneCollection } from "../scene/types.js";

const DEFAULT_YARN = `title: Start
scene: scene1
---
Narrator: [wave]hello[/wave] [b]hello[/b]  baarter
Narrator: Welcome to yarn-spinner-ts!
npc: This is a dialogue system powered by Yarn Spinner.
Narrator: Click anywhere to continue, or choose an option below.
-> Start the adventure &css{backgroundColor: #4a9eff; color: white;}
    Narrator: Great! Let's begin your journey.
    <<jump NextScene>>
-> Learn more &css{backgroundColor: #2ecc71; color: red;}
    Narrator: Yarn Spinner is a powerful narrative scripting language.
    npc: It supports variables, conditions, and branching stories.
    <<jump NextScene>>
===

title: NextScene
---
npc: blablabla
Narrator: You've reached the next scene!
Narrator: The dialogue system supports rich features like:
Narrator: • Variables and expressions
Narrator: • Conditional branching
Narrator: • Options with CSS styling
Narrator: • Commands and functions
Narrator: This is the end of the demo. Refresh to start again!
===`;

const DEFAULT_SCENES = `
scenes:
    scene1: https://i.pinimg.com/1200x/73/f6/86/73f686e3c62e5982055ce34ed5c331b9.jpg
  
actors:
    user: https://i.pinimg.com/1200x/d3/ed/cd/d3edcd8574301cf78f5e93ecca57e18b.jpg
    Narrator: https://i.pinimg.com/1200x/ad/8d/f4/ad8df4186827c20ba5bdb98883e12262.jpg
    npc: https://i.pinimg.com/1200x/81/12/1c/81121c69ef3e5bf657a7bacd9ff9d08e.jpg
`;

export function DialogueExample() {
  const [yarnText] = useState(DEFAULT_YARN);
  const [error, setError] = useState<string | null>(null);
  const enableTypingAnimation = true;
  
  const scenes: SceneCollection = useMemo(() => {
    try {
      return parseScenes(DEFAULT_SCENES);
    } catch (e) {
      console.warn("Failed to parse scenes:", e);
      return { scenes: {} };
    }
  }, []);

  const program = useMemo(() => {
    try {
      setError(null);
      const ast = parseYarn(yarnText);
      return compile(ast);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [yarnText]);

  const { result, advance } = useYarnRunner(
    program || { nodes: {}, enums: {} },
    {
      startAt: "Start",
      variables: {},
    }
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a2e",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: "1000px", width: "100%" }}>
        <h1 style={{ color: "#ffffff", textAlign: "center", marginBottom: "30px" }}>yarn-spinner-ts Dialogue Demo</h1>

        {error && (
          <div
            style={{
              backgroundColor: "#ff4444",
              color: "#ffffff",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        <DialogueView 
          result={result} 
          onAdvance={advance} 
          scenes={scenes}
          enableTypingAnimation={enableTypingAnimation}
          showTypingCursor={true}
          typingSpeed={20}
          cursorCharacter="$"
          autoAdvanceAfterTyping={true}
          autoAdvanceDelay={2000}
          actorTransitionDuration={1000} 
          pauseBeforeAdvance={enableTypingAnimation ? 1000 : 0}
        />
      </div>
    </div>
  );
}

