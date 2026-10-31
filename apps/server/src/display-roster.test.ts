import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearConnectedDisplays,
  forgetConnectedDisplay,
  listConnectedDisplays,
  rememberConnectedDisplay,
  takeConnectedDisplay,
} from './display-roster'

describe('connected displays', () => {
  beforeEach(() => {
    clearConnectedDisplays()
  })

  it('lists a TV after it joins a venue', () => {
    rememberConnectedDisplay('host01', 'sock-a', "Quizz'em TV AAAA")
    expect(listConnectedDisplays('HOST01')).toEqual([
      { socketId: 'sock-a', name: "Quizz'em TV AAAA" },
    ])
  })

  it('drops a TV the host releases and leaves the others attached', () => {
    rememberConnectedDisplay('HOST01', 'sock-a', 'TV A')
    rememberConnectedDisplay('HOST01', 'sock-b', 'TV B')
    expect(takeConnectedDisplay('HOST01', 'sock-a')?.name).toBe('TV A')
    expect(listConnectedDisplays('HOST01').map((d) => d.socketId)).toEqual(['sock-b'])
    expect(takeConnectedDisplay('HOST01', 'sock-a')).toBeNull()
  })

  it('removes a TV when its socket disconnects', () => {
    rememberConnectedDisplay('HOST01', 'sock-a', 'TV A')
    expect(forgetConnectedDisplay('sock-a')?.displays).toEqual([])
    expect(forgetConnectedDisplay('sock-a')).toBeNull()
  })
})
