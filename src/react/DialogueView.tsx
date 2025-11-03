import React from "react";
import type { RuntimeResult } from "../runtime/results.js";
import { DialogueScene } from "./DialogueScene.js";
import type { SceneCollection } from "../scene/types.js";
import "./dialogue.css";

export interface DialogueViewProps {
  result: RuntimeResult | null;
  onAdvance: (optionIndex?: number) => void;
  className?: string;
  scenes?: SceneCollection;
}

// Helper to parse CSS string into object
function parseCss(cssStr: string | undefined): React.CSSProperties {
  if (!cssStr) return {};
  const styles: React.CSSProperties = {};
  // Improved parser: handles quoted values and commas
  // Split by semicolon, but preserve quoted strings
  const rules: string[] = [];
  let currentRule = "";
  let inQuotes = false;
  let quoteChar = "";
  
  for (let i = 0; i < cssStr.length; i++) {
    const char = cssStr[i];
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      currentRule += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      currentRule += char;
    } else if (char === ";" && !inQuotes) {
      rules.push(currentRule.trim());
      currentRule = "";
    } else {
      currentRule += char;
    }
  }
  if (currentRule.trim()) {
    rules.push(currentRule.trim());
  }
  
  rules.forEach((rule) => {
    if (!rule) return;
    const colonIndex = rule.indexOf(":");
    if (colonIndex === -1) return;
    const prop = rule.slice(0, colonIndex).trim();
    const value = rule.slice(colonIndex + 1).trim();
    if (prop && value) {
      // Convert kebab-case to camelCase
      const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      // Remove quotes from value if present, and strip !important (React doesn't support it)
      let cleanValue = value.trim();
      if (cleanValue.endsWith("!important")) {
        cleanValue = cleanValue.slice(0, -10).trim();
      }
      if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
        cleanValue = cleanValue.slice(1, -1);
      } else if (cleanValue.startsWith("'") && cleanValue.endsWith("'")) {
        cleanValue = cleanValue.slice(1, -1);
      }
      (styles as any)[camelProp] = cleanValue;
    }
  });
  return styles;
}

export function DialogueView({ result, onAdvance, className, scenes }: DialogueViewProps) {
  const sceneName = result?.type === "text" || result?.type === "options" ? result.scene : undefined;
  const speaker = result?.type === "text" ? result.speaker : undefined;
  const sceneCollection = scenes || { scenes: {} };

  if (!result) {
    return (
      <div className={`yd-empty ${className || ""}`}>
        <p>Dialogue ended or not started.</p>
      </div>
    );
  }

  if (result.type === "text") {
    const nodeStyles = parseCss(result.nodeCss);
    return (
      <div className="yd-container">
        <DialogueScene sceneName={sceneName} speaker={speaker} scenes={sceneCollection} />
        <div
          className={`yd-dialogue-box ${result.isDialogueEnd ? "yd-text-box-end" : ""} ${className || ""}`}
          style={nodeStyles} // Only apply dynamic node CSS
          onClick={() => !result.isDialogueEnd && onAdvance()}
        >
          <div className="yd-text-box">
            {result.speaker && (
              <div className="yd-speaker">
                {result.speaker}
              </div>
            )}
            <p className={`yd-text ${result.speaker ? "yd-text-with-speaker" : ""}`}>
              {result.text || "\u00A0"}
            </p>
            {!result.isDialogueEnd && (
              <div className="yd-continue">
                ▼
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (result.type === "options") {
    const nodeStyles = parseCss(result.nodeCss);
    return (
      <div className="yd-container">
        <DialogueScene sceneName={sceneName} speaker={speaker} scenes={sceneCollection} />
        <div className={`yd-options-container ${className || ""}`}>
          <div className="yd-options-box" style={nodeStyles}>
            <div className="yd-options-title">Choose an option:</div>
            <div className="yd-options-list">
              {result.options.map((option, index) => {
                const optionStyles = parseCss(option.css);
                return (
                  <button
                    key={index}
                    className="yd-option-button"
                    onClick={() => onAdvance(index)}
                    style={optionStyles} // Only apply dynamic option CSS
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Command result - auto-advance
  if (result.type === "command") {
    // Auto-advance commands after a brief moment
    React.useEffect(() => {
      const timer = setTimeout(() => onAdvance(), 50);
      return () => clearTimeout(timer);
    }, [result.command, onAdvance]);

    return (
      <div className={`yd-command ${className || ""}`}>
        <p>Executing: {result.command}</p>
      </div>
    );
  }

  return null;
}

