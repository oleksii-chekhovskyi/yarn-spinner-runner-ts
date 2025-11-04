import React, { useState, useEffect, useRef } from "react";

export interface TypingTextProps {
  text: string;
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
  typingSpeed = 100,
  showCursor = true,
  cursorCharacter = "|",
  cursorBlinkDuration = 530,
  cursorClassName = "",
  className = "",
  onComplete,
  disabled = false,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
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
      // If disabled, show full text immediately
      setDisplayedText(text);
      if (onCompleteRef.current && text.length > 0) {
        onCompleteRef.current();
      }
      return;
    }

    // Reset when text changes
    setDisplayedText("");

    if (text.length === 0) {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
      return;
    }

    let index = 0;
    const typeNextCharacter = () => {
      if (index < text.length) {
        index++;
        setDisplayedText(text.slice(0, index));
        
       
        // If speed is 0 or very small, type next character immediately (use requestAnimationFrame for smoother animation)
        if (typingSpeed <= 0) {
          // Use requestAnimationFrame for instant/smooth rendering
          requestAnimationFrame(() => {
            typeNextCharacter();
          });
        } else {
          typingTimeoutRef.current = setTimeout(() => {
            typeNextCharacter();
          }, typingSpeed);
        }
      } else {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    };

    // Start typing
    if (typingSpeed <= 0) {
      // Start immediately if speed is 0
      requestAnimationFrame(() => {
        typeNextCharacter();
      });
    } else {
      typingTimeoutRef.current = setTimeout(() => {
        typeNextCharacter();
      }, typingSpeed);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, disabled]);

  return (
    <span className={className}>
      <span>{displayedText}</span>
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
