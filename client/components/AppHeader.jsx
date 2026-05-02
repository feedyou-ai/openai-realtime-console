import { Radio } from "lucide-react";

export default function AppHeader({ showAdminEvents, isEventsOpen, onOpenEvents }) {
  return (
    <nav className="z-10 flex h-16 shrink-0 items-center">
      <div
        className={[
          "relative m-4 flex w-full items-center justify-center gap-4",
          showAdminEvents
            ? "border-0 border-b border-solid border-zinc-200 pb-2"
            : "",
        ].join(" ")}
      >
        <img
          className="h-auto w-24"
          src="https://feedyou.ai/wp-content/uploads/2022/02/Feedyou_logo_red_clean.svg"
        />
        {showAdminEvents && !isEventsOpen && (
          <button
            type="button"
            onClick={onOpenEvents}
            className="absolute right-0 inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            <Radio className="h-4 w-4" />
            Events
          </button>
        )}
      </div>
    </nav>
  );
}
