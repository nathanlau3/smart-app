"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Bot, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type EdgeSide = "left" | "right" | "top" | "bottom";

interface EdgePosition {
  side: EdgeSide;
  offset: number; // percentage along the edge (0-100)
}

interface ChatTriggerProps {
  isOpen: boolean;
  onClick: () => void;
  position: EdgePosition;
  onPositionChange: (position: EdgePosition) => void;
}

export function ChatTrigger({
  isOpen,
  onClick,
  position,
  onPositionChange,
}: ChatTriggerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const clickStartTime = useRef<number>(0);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      clickStartTime.current = Date.now();
      setIsDragging(true);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragPosition({ x: clientX, y: clientY });
    },
    [],
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragPosition({ x: clientX, y: clientY });
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const dragDuration = Date.now() - clickStartTime.current;
      const wasDrag = dragDuration > 150; // Consider it a drag if held for > 150ms

      setIsDragging(false);
      setDragPosition(null);

      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.changedTouches[0].clientY : e.clientY;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calculate distance to each edge
      const distToLeft = clientX;
      const distToRight = windowWidth - clientX;
      const distToTop = clientY;
      const distToBottom = windowHeight - clientY;

      const minDist = Math.min(
        distToLeft,
        distToRight,
        distToTop,
        distToBottom,
      );

      let newSide: EdgeSide;
      let newOffset: number;

      if (minDist === distToLeft) {
        newSide = "left";
        newOffset = Math.max(10, Math.min(90, (clientY / windowHeight) * 100));
      } else if (minDist === distToRight) {
        newSide = "right";
        newOffset = Math.max(10, Math.min(90, (clientY / windowHeight) * 100));
      } else if (minDist === distToTop) {
        newSide = "top";
        newOffset = Math.max(10, Math.min(90, (clientX / windowWidth) * 100));
      } else {
        newSide = "bottom";
        newOffset = Math.max(10, Math.min(90, (clientX / windowWidth) * 100));
      }

      onPositionChange({ side: newSide, offset: newOffset });

      // Only trigger click if it was a quick tap, not a drag
      if (!wasDrag) {
        onClick();
      }
    },
    [isDragging, onPositionChange, onClick],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchend", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Calculate preview position during drag
  const previewPosition = dragPosition
    ? (() => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const distToLeft = dragPosition.x;
        const distToRight = windowWidth - dragPosition.x;
        const distToTop = dragPosition.y;
        const distToBottom = windowHeight - dragPosition.y;
        const minDist = Math.min(
          distToLeft,
          distToRight,
          distToTop,
          distToBottom,
        );

        if (minDist === distToLeft) {
          return {
            side: "left" as EdgeSide,
            offset: (dragPosition.y / windowHeight) * 100,
          };
        } else if (minDist === distToRight) {
          return {
            side: "right" as EdgeSide,
            offset: (dragPosition.y / windowHeight) * 100,
          };
        } else if (minDist === distToTop) {
          return {
            side: "top" as EdgeSide,
            offset: (dragPosition.x / windowWidth) * 100,
          };
        } else {
          return {
            side: "bottom" as EdgeSide,
            offset: (dragPosition.x / windowWidth) * 100,
          };
        }
      })()
    : null;

  // Get actual position (preview during drag, saved position otherwise)
  const currentPos = previewPosition || position;

  // Calculate CSS position based on edge and offset
  const getPositionStyle = (pos: EdgePosition): React.CSSProperties => {
    const buttonSize = 56; // 14 * 4 = 56px (w-14)
    const margin = 16; // margin from edge

    switch (pos.side) {
      case "left":
        return {
          left: margin,
          top: `calc(${pos.offset}% - ${buttonSize / 2}px)`,
        };
      case "right":
        return {
          right: margin,
          top: `calc(${pos.offset}% - ${buttonSize / 2}px)`,
        };
      case "top":
        return {
          top: margin + 64, // Account for header
          left: `calc(${pos.offset}% - ${buttonSize / 2}px)`,
        };
      case "bottom":
        return {
          bottom: margin,
          left: `calc(${pos.offset}% - ${buttonSize / 2}px)`,
        };
    }
  };

  return (
    <>
      {/* Edge highlight indicators while dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Left edge */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-2 transition-all",
              previewPosition?.side === "left"
                ? "bg-primary/40"
                : "bg-muted-foreground/10",
            )}
          />
          {/* Right edge */}
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-2 transition-all",
              previewPosition?.side === "right"
                ? "bg-primary/40"
                : "bg-muted-foreground/10",
            )}
          />
          {/* Top edge */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-2 transition-all",
              previewPosition?.side === "top"
                ? "bg-primary/40"
                : "bg-muted-foreground/10",
            )}
          />
          {/* Bottom edge */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-2 transition-all",
              previewPosition?.side === "bottom"
                ? "bg-primary/40"
                : "bg-muted-foreground/10",
            )}
          />
        </div>
      )}

      <button
        ref={buttonRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={getPositionStyle(currentPos)}
        className={cn(
          "fixed z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing select-none",
          "transition-[opacity,transform,box-shadow]",
          !isDragging && "duration-300", // Only animate when not dragging
          isOpen
            ? "bg-muted text-muted-foreground hover:bg-muted/80 scale-90"
            : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 ai-glow-lg hover:scale-110",
          isDragging && "opacity-90 scale-95 !transition-none",
        )}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <MessageSquare className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-primary" />
          </div>
        )}
      </button>
    </>
  );
}
