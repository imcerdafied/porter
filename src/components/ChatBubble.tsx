import type { ChatMessage } from "../types";

export function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`message-row message-row--${message.role}`}>
      <div className={`message-bubble message-bubble--${message.role}`}>
        {message.content}
      </div>
    </div>
  );
}
