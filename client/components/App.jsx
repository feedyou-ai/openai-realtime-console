import { useMemo, useState } from "react";
import AgentAuraPanel from "./AgentAuraPanel";
import AgentControlBar from "./AgentControlBar";
import AppHeader from "./AppHeader";
import EventsOverlay from "./EventsOverlay";
import { useAudioDevices } from "../hooks/useAudioDevices";
import { useRealtimeSession } from "../hooks/useRealtimeSession";

export default function App() {
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const audioDevices = useAudioDevices();
  const realtimeSession = useRealtimeSession({
    attachMicrophoneToPeerConnection: audioDevices.attachMicrophoneToPeerConnection,
    registerRemoteAudioTrack: audioDevices.registerRemoteAudioTrack,
    cleanupAudio: audioDevices.cleanupAudio,
    remoteAudioStream: audioDevices.remoteAudioStream,
  });

  const auraAudioTrack =
    realtimeSession.agentState === "listening"
      ? audioDevices.localAudioTrack
      : audioDevices.agentAudioTrack;
  const showAdminEvents = useMemo(
    () => new URLSearchParams(window.location.search).has("admin"),
    [],
  );

  return (
    <>
      <AppHeader showAdminEvents={showAdminEvents} onOpenEvents={() => setIsEventsOpen(true)} />

      <main className="absolute bottom-0 left-0 right-0 top-16 overflow-hidden">
        <section className="flex h-full flex-col items-center justify-center gap-8 px-4 pb-12">
          <AgentAuraPanel
            agentState={realtimeSession.agentState}
            audioTrack={auraAudioTrack}
            canStartSession={realtimeSession.canStartSession}
            onStartSession={realtimeSession.startSession}
          />

          <AgentControlBar
            audioInputs={audioDevices.audioInputs}
            selectedAudioInputId={audioDevices.selectedAudioInputId}
            agentState={realtimeSession.agentState}
            statusLabel={realtimeSession.statusLabel}
            canStartSession={realtimeSession.canStartSession}
            isSessionActive={realtimeSession.isSessionActive}
            isMicEnabled={audioDevices.isMicEnabled}
            isStarting={realtimeSession.isStarting}
            isSessionPending={realtimeSession.isSessionPending}
            onStartSession={realtimeSession.startSession}
            onAudioInputChange={audioDevices.changeAudioInput}
            onMicToggle={audioDevices.toggleMicrophone}
            onDisconnect={realtimeSession.stopSession}
          />
        </section>
      </main>

      {isEventsOpen && (
        <EventsOverlay events={realtimeSession.events} onClose={() => setIsEventsOpen(false)} />
      )}
    </>
  );
}
