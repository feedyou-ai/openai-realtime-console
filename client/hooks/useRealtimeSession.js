import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AGENT_STATE_LABELS,
  AUDIO_PLAYBACK_FALLBACK_MS,
  RESPONSE_AUDIO_EVENTS,
  RESPONSE_DONE_EVENTS,
  getAgentStateFromEvent,
  getRealtimeUserData,
} from "../lib/realtime-state";

export function useRealtimeSession({
  attachMicrophoneToPeerConnection,
  registerRemoteAudioTrack,
  cleanupAudio,
  remoteAudioStream,
}) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [agentState, setAgentState] = useState("disconnected");

  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const settleToListeningTimer = useRef(null);
  const pendingAudioPlayback = useRef(false);
  const audioPlaybackFallbackTimer = useRef(null);
  const hasAgentSpoken = useRef(false);

  const clearSessionTimers = useCallback(() => {
    clearTimeout(settleToListeningTimer.current);
    settleToListeningTimer.current = null;
    clearTimeout(audioPlaybackFallbackTimer.current);
    audioPlaybackFallbackTimer.current = null;
  }, []);

  const resetPlaybackState = useCallback(() => {
    pendingAudioPlayback.current = false;
    hasAgentSpoken.current = false;
  }, []);

  const stopSession = useCallback(
    (nextAgentState = "disconnected") => {
      const finalAgentState =
        typeof nextAgentState === "string" ? nextAgentState : "disconnected";

      if (dataChannel) {
        dataChannel.close();
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (audioElement.current) {
        audioElement.current.srcObject = null;
        audioElement.current = null;
      }

      cleanupAudio();
      setIsSessionActive(false);
      setIsStarting(false);
      setDataChannel(null);
      setAgentState(finalAgentState);
      clearSessionTimers();
      resetPlaybackState();
      peerConnection.current = null;
    },
    [cleanupAudio, clearSessionTimers, dataChannel, resetPlaybackState],
  );

  const startSession = useCallback(async () => {
    if (isStarting || isSessionActive) return;

    setIsStarting(true);
    setAgentState("connecting");

    try {
      const bot = window.location.href.split("/")[4]?.split("?")[0]?.split("#")[0];
      const api = bot ? `https://feedbot-${bot}-app.azurewebsites.net` : "http://localhost:7071";

      const tokenResponse = await fetch(`${api}/api/messages/realtime/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.value;

      const pc = new RTCPeerConnection();

      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (event) => {
        const stream = registerRemoteAudioTrack(event);
        audioElement.current.srcObject = stream;
      };

      await attachMicrophoneToPeerConnection(pc);

      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime/calls";
      const model = new URLSearchParams(window.location.search).get("model") || "gpt-realtime-1.5"; // TODO pick current value using some channel config request from hosting
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      const location = sdpResponse.headers.get("Location");
      const callId = location?.split("/").pop();
      console.log("callId", callId);

      fetch(`${api}/api/messages/realtime/calls`, {
        //fetch('https://feedbot-master-realtime-voice-app.azurewebsites.net/api/messages/realtime/calls?code=cb4ba4ab-93f9-4048-bd10-c4bda0b175d0', {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${EPHEMERAL_KEY}` },
        body: JSON.stringify({ call_id: callId, user_data: getRealtimeUserData(), }),
      })
        .then((response) => response.text())
        .then((response) => console.log("Bot hosting response", response))
        .catch((err) => console.error(err));

      peerConnection.current = pc;
    } catch (error) {
      console.error(error);
      stopSession("failed");
    } finally {
      setIsStarting(false);
    }
  }, [
    attachMicrophoneToPeerConnection,
    isSessionActive,
    isStarting,
    registerRemoteAudioTrack,
    stopSession,
  ]);

  useEffect(() => {
    if (!dataChannel) return;

    const handleMessage = (eventMessage) => {
      const event = JSON.parse(eventMessage.data);
      setEvents((prev) => [event, ...prev]);
      setAgentState((prev) => getAgentStateFromEvent(event, prev));

      if (RESPONSE_AUDIO_EVENTS.has(event.type)) {
        pendingAudioPlayback.current = true;
        clearTimeout(settleToListeningTimer.current);
        settleToListeningTimer.current = null;
        clearTimeout(audioPlaybackFallbackTimer.current);
        audioPlaybackFallbackTimer.current = setTimeout(() => {
          pendingAudioPlayback.current = false;
          setAgentState((prev) => (prev === "thinking" ? "listening" : prev));
        }, AUDIO_PLAYBACK_FALLBACK_MS);
      }

      if (RESPONSE_DONE_EVENTS.has(event.type) && !pendingAudioPlayback.current) {
        clearTimeout(settleToListeningTimer.current);
        settleToListeningTimer.current = setTimeout(() => {
          setAgentState((prev) =>
            prev === "thinking" && hasAgentSpoken.current ? "listening" : prev,
          );
        }, 1400);
      }
    };

    const handleOpen = () => {
      clearSessionTimers();
      resetPlaybackState();
      setIsSessionActive(true);
      setAgentState("thinking");
      setEvents([]);
    };

    const handleClose = () => {
      clearSessionTimers();
      resetPlaybackState();
      setIsSessionActive(false);
      setAgentState("disconnected");
    };

    dataChannel.addEventListener("message", handleMessage);
    dataChannel.addEventListener("open", handleOpen);
    dataChannel.addEventListener("close", handleClose);

    return () => {
      dataChannel.removeEventListener("message", handleMessage);
      dataChannel.removeEventListener("open", handleOpen);
      dataChannel.removeEventListener("close", handleClose);
      clearSessionTimers();
      resetPlaybackState();
    };
  }, [clearSessionTimers, dataChannel, resetPlaybackState]);

  useEffect(() => {
    if (!remoteAudioStream || !isSessionActive) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(remoteAudioStream);
    const analyser = audioContext.createAnalyser();
    let animationFrame = null;
    let quietSince = null;

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.45;
    const samples = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    audioContext.resume().catch(console.error);

    const updateSpeakingFromAudio = () => {
      analyser.getByteFrequencyData(samples);

      const sum = samples.reduce((total, sample) => total + sample * sample, 0);
      const volume = Math.sqrt(sum / samples.length) / 255;
      const now = performance.now();

      if (volume > 0.015) {
        quietSince = null;
        pendingAudioPlayback.current = false;
        hasAgentSpoken.current = true;
        clearSessionTimers();
        setAgentState((prev) => (prev === "failed" || prev === "disconnected" ? prev : "speaking"));
      } else {
        quietSince ??= now;

        if (now - quietSince > 900) {
          setAgentState((prev) =>
            prev === "speaking" && hasAgentSpoken.current ? "listening" : prev,
          );
        }
      }

      animationFrame = requestAnimationFrame(updateSpeakingFromAudio);
    };

    updateSpeakingFromAudio();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [clearSessionTimers, isSessionActive, remoteAudioStream]);

  const statusLabel = useMemo(
    () => AGENT_STATE_LABELS[agentState] || agentState,
    [agentState],
  );
  const isSessionPending = isStarting || (!!dataChannel && !isSessionActive);
  const canStartSession = !isSessionPending && !isSessionActive;

  return {
    startSession,
    stopSession,
    isSessionActive,
    isStarting,
    dataChannel,
    events,
    agentState,
    statusLabel,
    isSessionPending,
    canStartSession,
  };
}
