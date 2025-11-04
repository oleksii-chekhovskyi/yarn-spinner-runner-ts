import React, { useState, useEffect, useRef } from "react";
import type { MarkupParseResult } from "../markup/types.js";
import { MarkupRenderer } from "./MarkupRenderer.js";

export interface TypingTextProps {
  text: string;
  markup?: MarkupParseResult;
  typingSpeed?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  cursorBlinkDuration?: number;
  cursorClassName?: string;
  className?: string;
  onComplete?: () => void;
  disabled?: boolean;
}

export function TypingText({
  text,
  markup,
  typingSpeed = 100,
  showCursor = true,
  cursorCharacter = "|",
  cursorBlinkDuration = 530,
  cursorClassName = "",
  className = "",
  onComplete,
  disabled = false,
}: TypingTextProps) {
  const [displayedLength, setDisplayedLength] = useState(disabled ? text.length : 0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Handle cursor blinking
  useEffect(() => {
    if (!showCursor || disabled) {
      return;
    }
    cursorIntervalRef.current = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, cursorBlinkDuration);
    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [showCursor, cursorBlinkDuration, disabled]);

  // Handle typing animation
  useEffect(() => {
    if (disabled) {
      setDisplayedLength(text.length);
      if (onCompleteRef.current && text.length > 0) {
        onCompleteRef.current();
      }
      return;
    }

    // Reset when text changes
    setDisplayedLength(0);

    if (text.length === 0) {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
      return;
    }

    let index = 0;
    const typeNextCharacter = () => {
      if (index < text.length) {
        index += 1;
        setDisplayedLength(index);
        if (typingSpeed <= 0) {
          requestAnimationFrame(typeNextCharacter);
        } else {
          typingTimeoutRef.current = setTimeout(typeNextCharacter, typingSpeed);
        }
      } else if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    };

    if (typingSpeed <= 0) {
      requestAnimationFrame(typeNextCharacter);
    } else {
      typingTimeoutRef.current = setTimeout(typeNextCharacter, typingSpeed);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, disabled, typingSpeed]);

  const visibleLength = markup ? Math.min(displayedLength, markup.text.length) : Math.min(displayedLength, text.length);

  return (
    <span className={className}>
      <span>
        {markup ? (
          <MarkupRenderer text={text} markup={markup} length={visibleLength} />
        ) : (
          text.slice(0, visibleLength)
        )}
      </span>
      {showCursor && !disabled && (
        <span
          className={`yd-typing-cursor ${cursorClassName}`}
          style={{
            opacity: cursorVisible ? 1 : 0,
            transition: `opacity ${cursorBlinkDuration / 2}ms ease-in-out`,
          }}
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  );
}
