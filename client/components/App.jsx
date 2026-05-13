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
    <div className="absolute inset-0 flex overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          showAdminEvents={showAdminEvents}
          isEventsOpen={isEventsOpen}
          onOpenEvents={() => setIsEventsOpen(true)}
        />

        <main className="flex min-h-0 flex-1 overflow-hidden px-4 pb-8">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <AgentAuraPanel
                agentState={realtimeSession.agentState}
                audioTrack={auraAudioTrack}
                canStartSession={realtimeSession.canStartSession}
                onStartSession={realtimeSession.startSession}
              />
            </div>

            <div className="flex shrink-0 justify-center pt-6">
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
            </div>
          </section>
        </main>
      </div>

      {isEventsOpen && (
        <EventsOverlay
          events={realtimeSession.events}
          onClose={() => setIsEventsOpen(false)}
        />
      )}
    </div>
  );
}
