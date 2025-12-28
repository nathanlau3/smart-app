"use client";

import { useChatViewModel } from "@/hooks/useChatViewModel";
import {
  ChatHeader,
  ChatSidebar,
  ChatMessages,
  ChatInput,
} from "@/components/chat";

export default function ChatPage() {
  const { state, actions, refs } = useChatViewModel();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[90vh] overflow-hidden bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <ChatHeader
          isListening={state.isListening}
          isSpeechRecognitionSupported={state.isSpeechRecognitionSupported}
          onToggleListening={actions.toggleListening}
          ttsProvider={state.ttsProvider}
          openAIVoice={state.openAIVoice}
          autoSpeak={state.autoSpeak}
          isSpeaking={state.isSpeaking}
          isTTSLoading={state.isTTSLoading}
          isSpeechSynthesisSupported={state.isSpeechSynthesisSupported}
          onSetTtsProvider={actions.setTtsProvider}
          onSetOpenAIVoice={actions.setOpenAIVoice}
          onToggleAutoSpeak={actions.toggleAutoSpeak}
          onCancelSpeaking={actions.cancelSpeaking}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0">
          {/* Agent Sidebar */}
          <ChatSidebar agentState={state.agentState} />

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ChatMessages
              messages={state.messages}
              isLoading={state.isLoading}
            />
            <ChatInput
              ref={refs.inputElementRef}
              input={state.input}
              isLoading={state.isLoading}
              isDisabled={!state.authToken}
              onInputChange={actions.handleInputChange}
              onSubmit={actions.handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
