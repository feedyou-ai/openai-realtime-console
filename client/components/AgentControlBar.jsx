import { ChevronDown, Circle, Mic, MicOff, PhoneCall, PhoneOff } from "lucide-react";

export default function AgentControlBar({
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
