import { useEffect } from "react";
import {
  PATCH_NOTES,
  markUpdatesRead,
  type PatchNote,
} from "@/features/updates/patch-notes.ts";
import { shortDate } from "@/shared/lib/format.ts";

/**
 * Patch Notes.
 *
 * Opening the page is what marks the notes read — the reference console does
 * the same, and a separate "mark as read" button would be one more thing to
 * forget.
 */
export function SoftwareUpdates() {
  // The sidebar reads the same marker and recomputes on navigation, so the
  // badge clears when the doctor leaves this page.
  useEffect(markUpdatesRead, []);

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <h1 className="mb-4 text-lg font-semibold">Patch Notes</h1>

      <div className="mx-auto max-w-4xl space-y-4 pb-10">
        {PATCH_NOTES.map((note) => (
          <NoteCard key={note.date} note={note} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: PatchNote }) {
  return (
    <article className="rounded-lg border border-line px-6 py-5">
      <h2 className="text-xl font-semibold">Software Update</h2>
      <div className="mt-1 text-xs text-muted">{shortDate(note.date)}</div>
      <div className="mt-0.5 text-sm font-semibold">{note.title}</div>

      {note.intro && <p className="mt-2 text-sm text-muted">{note.intro}</p>}

      <div className="mt-4 space-y-4">
        {note.sections.map((s) => (
          <section key={s.heading}>
            <h3 className="text-sm font-semibold underline decoration-line underline-offset-4">
              {s.heading}
            </h3>
            <p className="mt-1.5 pl-4 text-sm leading-relaxed">{s.body}</p>
            {s.points && (
              <ul className="mt-1.5 ml-8 list-disc space-y-0.5 text-sm text-muted">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
