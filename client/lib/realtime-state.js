export const AGENT_STATE_LABELS = {
  disconnected: "Ready to start",
  connecting: "Connecting",
  initializing: "Initializing",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  failed: "Failed",
};

export const RESPONSE_DONE_EVENTS = new Set([
  "response.audio.done",
  "response.output_audio.done",
  "response.done",
  "response.output_item.done",
]);

export const RESPONSE_AUDIO_EVENTS = new Set([
  "response.audio.delta",
  "response.output_audio.delta",
  "response.audio_transcript.delta",
  "response.output_audio_transcript.delta",
]);

export const AUDIO_PLAYBACK_FALLBACK_MS = 5000;

export function getAgentStateFromEvent(event, fallbackState) {
  switch (event.type) {
    case "input_audio_buffer.speech_started":
      return fallbackState === "thinking" || fallbackState === "speaking"
        ? fallbackState
        : "listening";
    case "input_audio_buffer.speech_stopped":
      return fallbackState === "speaking" ? "speaking" : "thinking";
    case "response.created":
    case "response.output_item.added":
    case "response.content_part.added":
      return fallbackState === "speaking" ? "speaking" : "thinking";
    case "response.audio_transcript.delta":
    case "response.output_audio_transcript.delta":
      return fallbackState === "speaking" ? "speaking" : "thinking";
    case "response.text.delta":
      return "thinking";
    case "response.audio.delta":
    case "response.output_audio.delta":
      return fallbackState === "speaking" ? "speaking" : "thinking";
    case "response.audio.done":
    case "response.output_audio.done":
    case "response.done":
    case "response.output_item.done":
      return fallbackState === "speaking" || fallbackState === "thinking"
        ? fallbackState
        : "listening";
    case "error":
      return "failed";
    default:
      return fallbackState;
  }
}

export function getRealtimeUserPayload() {
  const searchParams = new URLSearchParams(window.location.search);
  const userData = {};

  for (const [key, value] of searchParams.entries()) {
    if (key === "admin" || key === "customer") continue;

    if (Object.hasOwn(userData, key)) {
      userData[key] = Array.isArray(userData[key])
        ? [...userData[key], value]
        : [userData[key], value];
    } else {
      userData[key] = value;
    }
  }

  return {
    userRole: searchParams.has("admin") ? "admin" : searchParams.has("customer") ? "customer" : "user",
    userData,
  };
}
