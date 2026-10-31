import { useCallback, useState } from 'react'
import DisplayRouter from './DisplayRouter.tsx'
import PairingScreen from './PairingScreen.tsx'
import {
  clearSavedDisplayVenue,
  displayVenueOnBoot,
  persistDisplayVenue,
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

  const onPairedFromTv = useCallback((vc: string) => {
    persistDisplayVenue(vc)
    setGate({ venue: vc, pairedViaHandshake: true })
  }, [])

  const onReleased = useCallback(() => {
    clearSavedDisplayVenue()
    stripDisplayVenueFromAddress()
    setGate({ venue: null, pairedViaHandshake: false })
  }, [])

  if (!venue) {
    return <PairingScreen onPaired={onPairedFromTv} />
  }

  return (
    <DisplayRouter
      key={venue}
      venueCode={venue}
      pairingBootstrap={pairedViaHandshake}
      onReleased={onReleased}
    />
  )
}
