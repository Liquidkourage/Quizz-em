import type { VenueSeatingChartTable } from './venueWallModel'
import { DISPLAY_TEXT_WELCOME_PRIMARY_CQ } from './displayTypography'
import { DisplayVenueLabelRule, DisplayVenuePanelCornerBrackets } from './DisplayVenuePanelChrome'
import { SeatingPlayerList, SeatingTableDiagram } from './SeatingTableFelt'

export function SeatingTableCard({ table }: { table: VenueSeatingChartTable }) {
  const occupiedSeatNums = table.seats.map((s) => s.seatNum)

  return (
    <article
      className="@container seating-table-card flex h-full w-full min-h-0 min-w-0 flex-col"
      aria-label={`Table ${table.tableNum}, ${table.seats.length} players`}
    >
      <div className="seating-table-card-frame welcome-panel-frame relative h-full min-h-0 w-full overflow-visible">
        <div className="seating-table-card-surface welcome-panel-surface welcome-panel-surface--join relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#060608]/96">
          <div className="seating-table-card-body flex min-h-0 flex-1 flex-col">
            <header className="seating-table-card-header shrink-0">
              <DisplayVenueLabelRule>Table</DisplayVenueLabelRule>
              <p
                className={`seating-table-card-number welcome-led-glyphs welcome-led-glyphs--count tabular-nums leading-none ${DISPLAY_TEXT_WELCOME_PRIMARY_CQ}`}
                aria-label={`Table number ${table.tableNum}`}
              >
                {table.tableNum}
              </p>
            </header>

            <div className="seating-table-card-map-well shrink-0">
              <SeatingTableDiagram occupiedSeatNums={occupiedSeatNums} variant="premium" />
            </div>

            <div className="seating-table-card-roster min-h-0 flex-1">
              <SeatingPlayerList seats={table.seats} showAllSlots variant="premium" />
            </div>
          </div>
        </div>

        <div className="welcome-panel-corners" aria-hidden>
          <DisplayVenuePanelCornerBrackets />
        </div>
      </div>
    </article>
  )
}
