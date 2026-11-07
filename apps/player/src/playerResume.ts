export type ResumeAttempt = 'saved-phone' | 'join-form'
export type ResumeHelloScreen = 'seat' | 'still-seated' | 'form'

/** A saved phone whose name is still seated must not open the editable join form. */
export function resumeHelloScreen(attempt: ResumeAttempt, ackOk: boolean, message: string): ResumeHelloScreen {
  if (ackOk) return 'seat'
  if (attempt === 'saved-phone' && message.toLowerCase().includes('already in the')) return 'still-seated'
  return 'form'
}
