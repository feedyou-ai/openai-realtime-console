import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import { AURA_COLOR } from "../lib/aura-colors";

export default function AgentAuraPanel({ agentState, audioTrack, canStartSession, onStartSession }) {
  return (
    <button
      type="button"
      disabled={!canStartSession}
      onClick={onStartSession}
      className="group relative flex aspect-square h-[min(448px,calc(100vw-32px),calc(100vh-260px))] min-h-[240px] items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 disabled:cursor-default"
      aria-label="Start realtime session"
    >
      <AgentAudioVisualizerAura
        size="xl"
        state={agentState}
        audioTrack={audioTrack}
        color={AURA_COLOR}
        colorShift={agentState === "listening" ? 0.1 : 0.5}
        themeMode="light"
        className={`h-full transition-opacity duration-500 ${
          agentState === "disconnected" ? "opacity-70" : "opacity-100"
        }`}
      />
    </button>
  );
}
