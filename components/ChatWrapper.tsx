"use client";

import { useState } from "react";
import { ChatModal } from "./ChatModal";
import { ChatTrigger } from "./ChatTrigger";

interface EdgePosition {
  side: "left" | "right" | "top" | "bottom";
  offset: number;
}

export function ChatWrapper() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [position, setPosition] = useState<EdgePosition>({
    side: "right",
    offset: 85,
  });

  return (
    <>
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        position={position}
      />
      {!isChatOpen && (
        <ChatTrigger
          isOpen={isChatOpen}
          onClick={() => setIsChatOpen(true)}
          position={position}
          onPositionChange={setPosition}
        />
      )}
    </>
  );
}
