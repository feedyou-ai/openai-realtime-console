import { useEffect, useRef, useState } from "react";
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import { AURA_COLOR } from "../lib/aura-colors";

const DISCONNECTED_OPACITY_CLASS = "opacity-60 group-hover:opacity-100";
const DEFAULT_OPACITY_CLASS = "opacity-100";
const LISTENING_COLOR_SHIFT = 0.1;
const DISCONNECTED_IDLE_COLOR_SHIFT = 0.3;
const DISCONNECTED_HOVER_COLOR_SHIFT = 0.5;
const COLOR_SHIFT_TRANSITION_MS = 450;

function getAuraOpacityClass(agentState) {
  return agentState === "disconnected"
    ? DISCONNECTED_OPACITY_CLASS
    : DEFAULT_OPACITY_CLASS;
}

function getTargetColorShift(agentState, isAuraHighlighted) {
  if (agentState === "listening") {
    return LISTENING_COLOR_SHIFT;
  }

  if (agentState !== "disconnected") {
    return DISCONNECTED_HOVER_COLOR_SHIFT;
  }

  return isAuraHighlighted
    ? DISCONNECTED_HOVER_COLOR_SHIFT
    : DISCONNECTED_IDLE_COLOR_SHIFT;
}

function useAnimatedNumber(targetValue, durationMs) {
  const [value, setValue] = useState(targetValue);
  const valueRef = useRef(targetValue);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let frameId;
    let startTime;
    const startValue = valueRef.current;

    const step = (timestamp) => {
      if (startTime === undefined) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const easedProgress = 1 - (1 - progress) * (1 - progress);
      const nextValue = startValue + (targetValue - startValue) * easedProgress;

      valueRef.current = nextValue;
      setValue(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    if (Math.abs(targetValue - valueRef.current) < 0.001) {
      setValue(targetValue);
      return undefined;
    }

    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [durationMs, targetValue]);

  return value;
}

export default function AgentAuraPanel({ agentState, audioTrack, canStartSession, onStartSession }) {
  const [isHovered, setIsHovered] = useState(false);
  const auraOpacityClass = getAuraOpacityClass(agentState);
  const targetColorShift = getTargetColorShift(agentState, isHovered);
  const colorShift = useAnimatedNumber(targetColorShift, COLOR_SHIFT_TRANSITION_MS);

  return (
    <button
      type="button"
      disabled={!canStartSession}
      onClick={onStartSession}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="group relative flex aspect-square h-[min(448px,calc(100vw-32px),calc(100vh-260px))] min-h-[240px] items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 disabled:cursor-default"
      aria-label="Start realtime session"
    >
      <AgentAudioVisualizerAura
        size="xl"
        state={agentState}
        audioTrack={audioTrack}
        color={AURA_COLOR}
        colorShift={colorShift}
        themeMode="light"
        className={`h-full transition-opacity duration-500 ease-out ${auraOpacityClass}`}
      />
    </button>
  );
}
