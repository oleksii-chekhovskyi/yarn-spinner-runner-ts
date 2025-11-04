import React, { useState, useEffect, useMemo, useRef } from "react";
import type { SceneCollection, SceneConfig } from "../scene/types.js";
// Note: CSS is imported in the browser demo entry point (examples/browser/main.tsx)
// This prevents Node.js from trying to resolve CSS imports during tests

export interface DialogueSceneProps {
  sceneName?: string;
  speaker?: string;
  scenes: SceneCollection;
  className?: string;
  actorTransitionDuration?: number;
}

/**
 * Visual scene component that displays background and actor images
 */
export function DialogueScene({
  sceneName,
  speaker,
  scenes,
  className,
  actorTransitionDuration = 350,
}: DialogueSceneProps) {

  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(1);
  const [nextBackground, setNextBackground] = useState<string | null>(null);
  const [lastSceneName, setLastSceneName] = useState<string | undefined>(undefined);
  const [lastSpeaker, setLastSpeaker] = useState<string | undefined>(undefined);
  const [activeActor, setActiveActor] = useState<{ name: string; image: string } | null>(null);
  const [previousActor, setPreviousActor] = useState<{ name: string; image: string } | null>(null);
  const [currentActorVisible, setCurrentActorVisible] = useState(false);
  const [previousActorVisible, setPreviousActorVisible] = useState(false);
  const previousActorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Get scene config - use last scene if current node has no scene
  const activeSceneName = sceneName || lastSceneName;
  const sceneConfig: SceneConfig | undefined = activeSceneName ? scenes.scenes[activeSceneName] : undefined;
  const backgroundImage = sceneConfig?.background;

  const activeSpeakerName = speaker || lastSpeaker;

  const resolvedActor = useMemo(() => {
    if (!sceneConfig || !activeSpeakerName) {
      return null;
    }

    const actorEntries = Object.entries(sceneConfig.actors);
    const matchingActor = actorEntries.find(
      ([actorName]) => actorName.toLowerCase() === activeSpeakerName.toLowerCase()
    );

    if (!matchingActor) {
      return null;
    }

    const [actorName, actorConfig] = matchingActor;
    if (!actorConfig?.image) {
      return null;
    }

    return { name: actorName, image: actorConfig.image };
  }, [sceneConfig, activeSpeakerName]);
  
  // Track last speaker - update when speaker is provided, keep when undefined
  useEffect(() => {
    if (speaker) {
      setLastSpeaker(speaker);
    }
    // Never clear speaker - keep it until a new one is explicitly set
  }, [speaker]);

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

  // Handle actor portrait transitions (cross-fade between speakers)
  useEffect(() => {
    let fadeOutTimeout: ReturnType<typeof setTimeout> | null = null;

    setActiveActor((currentActor) => {
      const currentImage = currentActor?.image ?? null;
      const currentName = currentActor?.name ?? null;
      const nextImage = resolvedActor?.image ?? null;
      const nextName = resolvedActor?.name ?? null;

      if (currentImage === nextImage && currentName === nextName) {
        return currentActor;
      }

      if (currentActor) {
        setPreviousActor(currentActor);
        setPreviousActorVisible(true);
        fadeOutTimeout = setTimeout(() => {
          setPreviousActorVisible(false);
        }, 0);
      } else {
        setPreviousActor(null);
        setPreviousActorVisible(false);
      }

      setCurrentActorVisible(false);

      return resolvedActor;
    });

    return () => {
      if (fadeOutTimeout !== null) {
        clearTimeout(fadeOutTimeout);
      }
    };
  }, [resolvedActor]);

  useEffect(() => {
    if (!activeActor) {
      return;
    }

    const fadeInTimeout = setTimeout(() => {
      setCurrentActorVisible(true);
    }, 0);

    return () => {
      clearTimeout(fadeInTimeout);
    };
  }, [activeActor]);

  // Remove previous actor once fade-out completes
  useEffect(() => {
    if (!previousActor) {
      return;
    }

    if (previousActorTimeoutRef.current) {
      clearTimeout(previousActorTimeoutRef.current);
    }

    previousActorTimeoutRef.current = setTimeout(() => {
      setPreviousActor(null);
      previousActorTimeoutRef.current = null;
    }, actorTransitionDuration);

    return () => {
      if (previousActorTimeoutRef.current) {
        clearTimeout(previousActorTimeoutRef.current);
        previousActorTimeoutRef.current = null;
      }
    };
  }, [previousActor, actorTransitionDuration]);

  // Default background color when no scene
  const defaultBgColor = "rgba(26, 26, 46, 1)"; // Dark blue-purple
  const handleActorImageError = (actorName: string, imageUrl: string) => () => {
    console.error(`Failed to load actor image for ${actorName}:`, imageUrl);
  };

  const sceneStyle: React.CSSProperties & { ["--yd-actor-transition"]: string } = {
    backgroundColor: currentBackground ? undefined : defaultBgColor,
    backgroundImage: currentBackground ? `url(${currentBackground})` : undefined,
    opacity: backgroundOpacity,
    ["--yd-actor-transition"]: `${Math.max(actorTransitionDuration, 0)}ms`,
  };

  return (
    <div className={`yd-scene ${className || ""}`} style={sceneStyle}>
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

      {/* Actor portraits with cross-fade */}
      {previousActor && (
        <img
          key={`${previousActor.name}-previous`}
          className={`yd-actor yd-actor--previous ${previousActorVisible ? "yd-actor--visible" : ""}`}
          src={previousActor.image}
          alt={previousActor.name}
          onError={handleActorImageError(previousActor.name, previousActor.image)}
        />
      )}
      {activeActor && (
        <img
          key={`${activeActor.name}-current`}
          className={`yd-actor yd-actor--current ${currentActorVisible ? "yd-actor--visible" : ""}`}
          src={activeActor.image}
          alt={activeActor.name}
          onError={handleActorImageError(activeActor.name, activeActor.image)}
        />
      )}
    </div>
  );
}
