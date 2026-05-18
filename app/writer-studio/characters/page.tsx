import { getMockCharacterDatabase } from "@/lib/writer-studio";

export default function WriterStudioCharactersPage() {
  const characters = getMockCharacterDatabase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Character Database</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Keep story memory close to the draft
          </h2>
          <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
            This is the early shell for character tracking inside a studio. Main and
            side roles, notes, and future continuity tooling can all attach here later.
          </p>
        </div>
        <button type="button" className="story-button-secondary">
          Add Character
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {characters.map((character) => (
          <div
            key={character.id}
            className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="theme-heading text-lg font-semibold">{character.name}</p>
              <span className="theme-meta rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] uppercase tracking-[0.24em]">
                {character.type}
              </span>
            </div>
            <p className="theme-body mt-4 text-sm leading-6">{character.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
