import { type FormEvent, useState } from "react";

export function ChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (message: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const sent = await onSend(value);
    if (sent) setValue("");
  }

  return (
    <form className="chat-composer" onSubmit={submit}>
      <input
        aria-label="Type your message"
        autoComplete="off"
        disabled={disabled}
        maxLength={4000}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask about your stay…"
        value={value}
      />
      <button
        aria-label="Send message"
        className="send-button"
        disabled={disabled || !value.trim()}
        type="submit"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m3 3 18 9-18 9 3-9-3-9Zm3.8 7.5h8.4L6.9 6.4l1.1 4.1Zm0 3L6.9 17.6l8.3-4.1H6.8Z" />
        </svg>
      </button>
    </form>
  );
}
