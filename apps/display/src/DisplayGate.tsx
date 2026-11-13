import { useCallback, useState } from 'react'
import DisplayRouter from './DisplayRouter.tsx'
import PairingScreen from './PairingScreen.tsx'
import {
  clearSavedDisplayVenue,
  displayVenueOnBoot,
  publishDisplayVenue,
  readSavedDisplayVenue,
  stripDisplayVenueFromAddress,
} from './displaySession'
import { readDisplayRoomFromUrl } from './displayUrlParams'

type GateState = { venue: string | null; pairedViaHandshake: boolean }

export default function DisplayGate() {
  const [{ venue, pairedViaHandshake }, setGate] = useState<GateState>(() => {
    if (typeof window === 'undefined') {
      return { venue: null, pairedViaHandshake: false }
    }
    const room = displayVenueOnBoot(readDisplayRoomFromUrl(), readSavedDisplayVenue())
    return { venue: room, pairedViaHandshake: false }
  })

  const followVenue = useCallback((vc: string) => {
    const next = vc.trim().toUpperCase()
    if (!next) return
    publishDisplayVenue(next)
    setGate((current) => (current.venue === next ? current : { venue: next, pairedViaHandshake: true }))
  }, [])

  const onReleased = useCallback(() => {
    clearSavedDisplayVenue()
    stripDisplayVenueFromAddress()
    setGate({ venue: null, pairedViaHandshake: false })
  }, [])

  if (!venue) {
    return <PairingScreen onPaired={followVenue} />
  }

  return (
    <DisplayRouter
      key={venue}
      venueCode={venue}
      pairingBootstrap={pairedViaHandshake}
      onReleased={onReleased}
      onVenueCode={followVenue}
    />
  )
}
