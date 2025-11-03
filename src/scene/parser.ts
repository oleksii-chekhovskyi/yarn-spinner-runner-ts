/**
 * Scene configuration parser using js-yaml
 * Supports YAML string or plain object
 */

import yaml from "js-yaml";
import type { SceneCollection, SceneConfig, ActorConfig } from "./types.js";

/**
 * Parse scene configuration from YAML string or object
 */
export function parseScenes(input: string | Record<string, unknown>): SceneCollection {
  // If already an object, use it directly
  if (typeof input === "object" && input !== null) {
    return parseScenesFromObject(input);
  }

  // Parse YAML string
  try {
    const parsed = yaml.load(input) as Record<string, unknown>;
    return parseScenesFromObject(parsed || {});
  } catch (error) {
    console.error("Failed to parse YAML scene config:", error);
    throw new Error(`Invalid YAML scene configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseScenesFromObject(obj: Record<string, unknown>): SceneCollection {
  const scenes: Record<string, SceneConfig> = {};
  
  // Extract global actors if defined separately
  const globalActors: Record<string, ActorConfig> = {};
  if (typeof obj.actors === "object" && obj.actors !== null) {
    for (const [actorName, actorData] of Object.entries(obj.actors)) {
      if (typeof actorData === "object" && actorData !== null) {
        // Nested format: actorName: { image: "..." }
        globalActors[actorName] = {
          image: typeof actorData.image === "string" ? actorData.image : undefined,
        };
      } else if (typeof actorData === "string") {
        // Shorthand: actorName: "/path/to/image.png"
        globalActors[actorName] = { image: actorData };
      }
    }
  }

  // Parse scenes
  if (typeof obj.scenes === "object" && obj.scenes !== null) {
    const scenesObj = obj.scenes as Record<string, unknown>;
    for (const [sceneName, sceneData] of Object.entries(scenesObj)) {
      if (typeof sceneData === "object" && sceneData !== null) {
        const data = sceneData as Record<string, unknown>;
        const sceneActors: Record<string, ActorConfig> = { ...globalActors }; // Start with global actors

        // Override with scene-specific actors if defined
        if (typeof data.actors === "object" && data.actors !== null) {
          for (const [actorName, actorData] of Object.entries(data.actors)) {
            if (typeof actorData === "object" && actorData !== null) {
              sceneActors[actorName] = {
                image: typeof actorData.image === "string" ? actorData.image : undefined,
              };
            } else if (typeof actorData === "string") {
              sceneActors[actorName] = { image: actorData };
            }
          }
        }

        scenes[sceneName] = {
          background: typeof data.background === "string" ? data.background : "",
          actors: sceneActors,
        };
      } else if (typeof sceneData === "string") {
        // Shorthand: scene1: "/path/to/background.png" (uses global actors)
        scenes[sceneName] = {
          background: sceneData,
          actors: { ...globalActors },
        };
      }
    }
  }

  return { scenes };
}
