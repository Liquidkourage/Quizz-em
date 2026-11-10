import { PLAYER_PHASE_PREVIEWS, playerPhasePreviewCopy, type PlayerPhasePreviewId } from '@qhe/core'

/** Player-phone pictures. Closing puts back whatever the phones were already showing. */
export function HostPlayerPhasePreviewPanel({
  activeScene,
  onShow,
}: {
  activeScene: PlayerPhasePreviewId | null
  onShow: (scene: PlayerPhasePreviewId | null) => void
}) {
  const showing = activeScene ? playerPhasePreviewCopy(activeScene).showing : null
  return (
    <section className="space-y-2" aria-label="Player screen preview">
      <p className="text-sm font-bold uppercase tracking-wide text-white/45">Player screens</p>
      <p className="text-sm text-white/60">Shows on the player phones. The live game stays as it is.</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Player screen">
        {PLAYER_PHASE_PREVIEWS.map((scene) => (
          <button
            key={scene.id}
            type="button"
            aria-label={scene.show}
            aria-pressed={activeScene === scene.id}
            onClick={() => onShow(scene.id)}
            className={`min-h-11 rounded-md px-3 py-2.5 text-center text-sm font-bold ${
              activeScene === scene.id
                ? 'border border-amber-400/60 bg-amber-500/25 text-amber-100'
                : 'border border-white/15 text-white/75 hover:bg-white/10'
            }`}
          >
            {scene.show}
          </button>
        ))}
      </div>
      {showing ? <p className="text-sm font-semibold text-amber-100">{showing}</p> : null}
      <button
        type="button"
        onClick={() => onShow(null)}
        className="min-h-11 w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
      >
        Close player preview
      </button>
    </section>
  )
}
