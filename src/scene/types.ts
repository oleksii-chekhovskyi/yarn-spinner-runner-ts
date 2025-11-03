/**
 * Scene configuration types
 */

export interface ActorConfig {
  image?: string; // Path to actor image
}

export interface SceneConfig {
  background: string; // Path to background image
  actors: Record<string, ActorConfig>; // Actor name -> config
}

export interface SceneCollection {
  scenes: Record<string, SceneConfig>; // Scene name -> config
}

