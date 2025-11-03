import React, { useState, useEffect } from "react";
import type { SceneCollection, SceneConfig } from "../scene/types.js";
import "./dialogue.css";

export interface DialogueSceneProps {
  sceneName?: string;
  speaker?: string;
  scenes: SceneCollection;
  className?: string;
}

/**
 * Visual scene component that displays background and actor images
 */
export function DialogueScene({ sceneName, speaker, scenes, className }: DialogueSceneProps) {
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(1);
  const [nextBackground, setNextBackground] = useState<string | null>(null);
  const [lastSceneName, setLastSceneName] = useState<string | undefined>(undefined);
  
  // Get scene config - use last scene if current node has no scene
  const activeSceneName = sceneName || lastSceneName;
  const sceneConfig: SceneConfig | undefined = activeSceneName ? scenes.scenes[activeSceneName] : undefined;
  const backgroundImage = sceneConfig?.background;

  // Get all actors from the current scene
  const sceneActors = sceneConfig ? Object.keys(sceneConfig.actors) : [];

  // Handle background transitions
  useEffect(() => {
    if (backgroundImage && backgroundImage !== currentBackground) {
      if (currentBackground === null) {
        // First background - set immediately
        setCurrentBackground(backgroundImage);
        setBackgroundOpacity(1);
        if (sceneName) setLastSceneName(sceneName);
      } else {
        // Transition: fade out, change, fade in
        setBackgroundOpacity(0);
        setTimeout(() => {
          setNextBackground(backgroundImage);
          setTimeout(() => {
            setCurrentBackground(backgroundImage);
            setNextBackground(null);
            setBackgroundOpacity(1);
            if (sceneName) setLastSceneName(sceneName);
          }, 50);
        }, 300); // Half of transition duration
      }
    } else if (sceneName && sceneName !== lastSceneName) {
      // New scene name set, update tracking
      setLastSceneName(sceneName);
    }
    // Never clear background - keep it until a new one is explicitly set
  }, [backgroundImage, currentBackground, sceneName, lastSceneName]);

  // Default background color when no scene
  const defaultBgColor = "rgba(26, 26, 46, 1)"; // Dark blue-purple

  return (
    <div
      className={`yd-scene ${className || ""}`}
      style={{
        backgroundColor: currentBackground ? undefined : defaultBgColor,
        backgroundImage: currentBackground ? `url(${currentBackground})` : undefined,
        opacity: backgroundOpacity,
      }}
    >
      {/* Next background (during transition) */}
      {nextBackground && (
        <div
          className="yd-scene-next"
          style={{
            backgroundImage: `url(${nextBackground})`,
            opacity: 1 - backgroundOpacity,
          }}
        />
      )}

      {/* Actor image - show only the speaking actor, aligned to top */}
      {sceneConfig && speaker && (() => {
        // Find the actor that matches the speaker (case-insensitive)
        const speakingActorName = sceneActors.find(
          actorName => actorName.toLowerCase() === speaker.toLowerCase()
        );
        
        if (!speakingActorName) return null;
        
        const actorConfig = sceneConfig.actors[speakingActorName];
        if (!actorConfig?.image) return null;

        return (
          <img
            key={speakingActorName}
            className="yd-actor"
            src={actorConfig.image}
            alt={speakingActorName}
            onError={(e) => {
              console.error(`Failed to load actor image for ${speakingActorName}:`, actorConfig.image, e);
            }}
          />
        );
      })()}
    </div>
  );
}

