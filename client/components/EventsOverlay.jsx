import { Radio, X } from "lucide-react";
import EventLog from "./EventLog";

export default function EventsOverlay({ events, onClose }) {
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-zinc-950/30">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close events overlay"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-[520px] flex-col border-l border-zinc-200 bg-white shadow-2xl">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 px-4">
          <Radio className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-900">Realtime events</h2>
          <button
            type="button"
            onClick={onClose}
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
  );
}
