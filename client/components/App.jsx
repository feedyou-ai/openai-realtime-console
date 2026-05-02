import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Circle,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Radio,
  X,
} from "lucide-react";
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import EventLog from "./EventLog";
import { LocalAudioTrack, RemoteAudioTrack } from "livekit-client";

const AGENT_STATE_LABELS = {
  disconnected: "Ready to start",
  connecting: "Connecting",
  initializing: "Initializing",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  failed: "Failed",
};

const AURA_COLOR = import.meta.env.VITE_AURA_COLOR || "#7373e0";

function deriveComplementaryColor(hexColor) {
  if (hexColor === '#7373e0') {
    return '#b474ff';
  }

  const normalized = hexColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "#04a7b1";
  }

  const r = 255 - parseInt(normalized.slice(0, 2), 16);
  const g = 255 - parseInt(normalized.slice(2, 4), 16);
  const b = 255 - parseInt(normalized.slice(4, 6), 16);

  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

const AURA_LISTENING_COLOR =
  import.meta.env.VITE_AURA_LISTENING_COLOR || deriveComplementaryColor(AURA_COLOR);

function getRealtimeUserPayload() {
  const searchParams = new URLSearchParams(window.location.search);
  const userData = {};

  for (const [key, value] of searchParams.entries()) {
    if (key === "admin" || key === "customer") continue;

    if (Object.hasOwn(userData, key)) {
      userData[key] = Array.isArray(userData[key]) ? [...userData[key], value] : [userData[key], value];
    } else {
      userData[key] = value;
    }
  }

  return {
    userRole: searchParams.has("admin") ? "admin" : searchParams.has("customer") ? "customer" : "user",
    userData,
  };
}

const RESPONSE_DONE_EVENTS = new Set([
  "response.audio.done",
  "response.output_audio.done",
  "response.done",
  "response.output_item.done",
]);

const RESPONSE_AUDIO_EVENTS = new Set([
  "response.audio.delta",
  "response.output_audio.delta",
  "response.audio_transcript.delta",
  "response.output_audio_transcript.delta",
]);

const AUDIO_PLAYBACK_FALLBACK_MS = 5000;

function getAgentStateFromEvent(event, fallbackState) {
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

function AgentControlBar({
  audioInputs,
  selectedAudioInputId,
  agentState,
  statusLabel,
  canStartSession,
  isSessionActive,
  isMicEnabled,
  isStarting,
  isSessionPending,
  onStartSession,
  onAudioInputChange,
  onMicToggle,
  onDisconnect,
}) {
  return (
    <div className="relative flex w-full max-w-2xl items-center justify-between gap-3 rounded-[31px] border border-zinc-200 bg-white/95 p-3 shadow-lg shadow-zinc-900/5">
      <div className="inline-flex h-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-white">
        <button
          type="button"
          aria-pressed={isMicEnabled}
          aria-label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
          onClick={onMicToggle}
          className={`inline-flex h-full w-11 items-center justify-center transition ${
            isMicEnabled
              ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          } disabled:cursor-not-allowed disabled:[&_svg]:opacity-35`}
        >
          {isMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>

        <label
          className={`relative flex h-full w-9 items-center justify-center border-l transition ${
            isMicEnabled
              ? "border-zinc-200 bg-zinc-100 hover:bg-zinc-200"
              : "border-red-200 bg-red-50 hover:bg-red-100"
          }`}
        >
          <span className="sr-only">Select microphone</span>
          <select
            value={selectedAudioInputId}
            onChange={(event) => onAudioInputChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-r-full opacity-0"
          >
            <option value="">Default microphone</option>
            {audioInputs.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
          <ChevronDown
            className={`pointer-events-none h-4 w-4 ${
              isMicEnabled ? "text-zinc-600" : "text-red-700"
            }`}
          />
        </label>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex max-w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 text-sm text-zinc-600">
        <Circle
          className={`h-2.5 w-2.5 shrink-0 fill-current ${
            agentState === "failed"
              ? "text-red-500"
              : isSessionActive
                ? "text-green-500"
                : isStarting
                  ? "text-amber-500"
                  : "text-zinc-400"
          }`}
        />
        <span className="truncate">{statusLabel}</span>
      </div>

      {isSessionActive ? (
        <button
          type="button"
          onClick={() => onDisconnect()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-xs font-bold tracking-wider text-red-700 transition hover:bg-red-100"
        >
          <PhoneOff className="h-4 w-4" />
          <span>END</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={!canStartSession}
          onClick={() => onStartSession()}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold tracking-wider text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PhoneCall className="h-4 w-4" />
          <span>{isSessionPending ? "STARTING" : "START"}</span>
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [agentState, setAgentState] = useState("disconnected");
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [audioInputs, setAudioInputs] = useState([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [agentAudioTrack, setAgentAudioTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const localMediaStream = useRef(null);
  const localAudioSender = useRef(null);
  const liveKitAudioTrack = useRef(null);
  const settleToListeningTimer = useRef(null);
  const pendingAudioPlayback = useRef(false);
  const audioPlaybackFallbackTimer = useRef(null);
  const hasAgentSpoken = useRef(false);

  async function refreshAudioInputs() {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    setAudioInputs(devices.filter((device) => device.kind === "audioinput"));
  }

  async function createMicrophoneStream(deviceId = selectedAudioInputId) {
    const audio = deviceId ? { deviceId: { exact: deviceId } } : true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio });
    const [track] = stream.getAudioTracks();

    if (track) {
      track.enabled = isMicEnabled;
    }

    return stream;
  }

  async function startSession() {
    if (isStarting || isSessionActive) return;

    setIsStarting(true);
    setAgentState("connecting");

    try {
      const bot = window.location.href.split("/")[4]?.split("?")[0]?.split("#")[0];
      const api = bot ? `https://feedbot-${bot}-app.azurewebsites.net` : "http://localhost:7071";

      // Get an ephemeral key from the Fastify server
      const tokenResponse = await fetch(`${api}/api/messages/realtime/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getRealtimeUserPayload()),
      });
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.value;

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => {
        const stream = e.streams[0] || new MediaStream([e.track]);
        audioElement.current.srcObject = stream;

        if (e.track?.kind === "audio") {
          const track = new RemoteAudioTrack(e.track, e.track.id, e.receiver);
          track.setMediaStream(stream);
          liveKitAudioTrack.current = track;
          setAgentAudioTrack(liveKitAudioTrack.current);
          setRemoteAudioStream(stream);
        }
      };

      // Add local audio track for microphone input in the browser
      const ms = await createMicrophoneStream();
      const [localTrack] = ms.getAudioTracks();
      localMediaStream.current = ms;
      localAudioSender.current = pc.addTrack(localTrack, ms);
      setLocalAudioTrack(new LocalAudioTrack(localTrack));
      await refreshAudioInputs();

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime/calls";
      const model = "gpt-realtime-1.5";
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
        body: JSON.stringify({ call_id: callId }),
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
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession(nextAgentState = "disconnected") {
    const finalAgentState =
      typeof nextAgentState === "string" ? nextAgentState : "disconnected";

    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (localMediaStream.current) {
      localMediaStream.current.getTracks().forEach((track) => track.stop());
    }
    if (audioElement.current) {
      audioElement.current.srcObject = null;
      audioElement.current = null;
    }

    liveKitAudioTrack.current = null;
    localAudioSender.current = null;
    localMediaStream.current = null;
    setIsSessionActive(false);
    setIsStarting(false);
    setDataChannel(null);
    setAgentAudioTrack(null);
    setLocalAudioTrack(null);
    setRemoteAudioStream(null);
    setAgentState(finalAgentState);
    clearTimeout(settleToListeningTimer.current);
    settleToListeningTimer.current = null;
    clearTimeout(audioPlaybackFallbackTimer.current);
    audioPlaybackFallbackTimer.current = null;
    pendingAudioPlayback.current = false;
    hasAgentSpoken.current = false;
    peerConnection.current = null;
  }

  async function changeAudioInput(deviceId) {
    setSelectedAudioInputId(deviceId);

    if (!localAudioSender.current) return;

    try {
      const nextStream = await createMicrophoneStream(deviceId);
      const [nextTrack] = nextStream.getAudioTracks();

      if (!nextTrack) return;

      await localAudioSender.current.replaceTrack(nextTrack);
      setLocalAudioTrack(new LocalAudioTrack(nextTrack));

      if (localMediaStream.current) {
        localMediaStream.current.getTracks().forEach((track) => track.stop());
      }

      localMediaStream.current = nextStream;
      await refreshAudioInputs();
    } catch (error) {
      console.error(error);
    }
  }

  function toggleMicrophone() {
    const nextEnabled = !isMicEnabled;
    setIsMicEnabled(nextEnabled);
    localMediaStream.current
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = nextEnabled;
      });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      const handleMessage = (e) => {
        const event = JSON.parse(e.data);
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
        clearTimeout(settleToListeningTimer.current);
        settleToListeningTimer.current = null;
        clearTimeout(audioPlaybackFallbackTimer.current);
        audioPlaybackFallbackTimer.current = null;
        pendingAudioPlayback.current = false;
        hasAgentSpoken.current = false;
        setIsSessionActive(true);
        setAgentState("thinking");
        setEvents([]);
      };
      const handleClose = () => {
        clearTimeout(settleToListeningTimer.current);
        settleToListeningTimer.current = null;
        clearTimeout(audioPlaybackFallbackTimer.current);
        audioPlaybackFallbackTimer.current = null;
        pendingAudioPlayback.current = false;
        hasAgentSpoken.current = false;
        setIsSessionActive(false);
        setAgentState("disconnected");
      };

      // Append new server events to the list
      dataChannel.addEventListener("message", handleMessage);

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", handleOpen);

      dataChannel.addEventListener("close", handleClose);

      return () => {
        dataChannel.removeEventListener("message", handleMessage);
        dataChannel.removeEventListener("open", handleOpen);
        dataChannel.removeEventListener("close", handleClose);
        clearTimeout(settleToListeningTimer.current);
        settleToListeningTimer.current = null;
        clearTimeout(audioPlaybackFallbackTimer.current);
        audioPlaybackFallbackTimer.current = null;
        pendingAudioPlayback.current = false;
        hasAgentSpoken.current = false;
      };
    }
  }, [dataChannel]);

  useEffect(() => {
    refreshAudioInputs().catch(console.error);

    navigator.mediaDevices?.addEventListener?.("devicechange", refreshAudioInputs);

    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshAudioInputs);
    };
  }, []);

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
        clearTimeout(settleToListeningTimer.current);
        settleToListeningTimer.current = null;
        clearTimeout(audioPlaybackFallbackTimer.current);
        audioPlaybackFallbackTimer.current = null;
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
  }, [remoteAudioStream, isSessionActive]);

  const statusLabel = useMemo(
    () => AGENT_STATE_LABELS[agentState] || agentState,
    [agentState],
  );
  const auraAudioTrack = agentState === "listening" ? localAudioTrack : agentAudioTrack;
  const isSessionPending = isStarting || (!!dataChannel && !isSessionActive);
  const canStartSession = !isSessionPending && !isSessionActive;
  const showAdminEvents = useMemo(
    () => new URLSearchParams(window.location.search).has("admin"),
    [],
  );

  return (
    <>
      <nav className="absolute left-0 right-0 top-0 z-10 flex h-16 items-center">
        <div className="m-4 flex w-full items-center gap-4 border-0 border-b border-solid border-zinc-200 pb-2">
          <img
            className="h-auto w-24"
            src="https://feedyou.ai/wp-content/uploads/2022/02/Feedyou_logo_red_clean.svg"
          />
          {showAdminEvents && (
            <button
              type="button"
              onClick={() => setIsEventsOpen(true)}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              <Radio className="h-4 w-4" />
              Events
            </button>
          )}
        </div>
      </nav>
      <main className="absolute bottom-0 left-0 right-0 top-16 overflow-hidden">
        <section className="flex h-full flex-col items-center justify-center gap-8 px-4 pb-12">
          <button
            type="button"
            disabled={!canStartSession}
            onClick={startSession}
            className="group relative flex aspect-square h-[min(448px,calc(100vw-32px),calc(100vh-260px))] min-h-[240px] items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 disabled:cursor-default"
            aria-label="Start realtime session"
          >
            <AgentAudioVisualizerAura
              size="xl"
              state={agentState}
              audioTrack={auraAudioTrack}
              color={agentState === "listening" ? AURA_LISTENING_COLOR : AURA_COLOR}
              colorShift={0.3}
              themeMode="light"
              className={`h-full transition-opacity duration-500 ${
                agentState === "disconnected" ? "opacity-70" : "opacity-100"
              }`}
            />
          </button>

          <AgentControlBar
            audioInputs={audioInputs}
            selectedAudioInputId={selectedAudioInputId}
            agentState={agentState}
            statusLabel={statusLabel}
            canStartSession={canStartSession}
            isSessionActive={isSessionActive}
            isMicEnabled={isMicEnabled}
            isStarting={isStarting}
            isSessionPending={isSessionPending}
            onStartSession={startSession}
            onAudioInputChange={changeAudioInput}
            onMicToggle={toggleMicrophone}
            onDisconnect={stopSession}
          />
        </section>
      </main>

      {isEventsOpen && (
        <div className="fixed inset-0 z-20 flex justify-end bg-zinc-950/30">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close events overlay"
            onClick={() => setIsEventsOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-[520px] flex-col border-l border-zinc-200 bg-white shadow-2xl">
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 px-4">
              <Radio className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Realtime events</h2>
              <button
                type="button"
                onClick={() => setIsEventsOpen(false)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Close events overlay"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <EventLog events={events} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
