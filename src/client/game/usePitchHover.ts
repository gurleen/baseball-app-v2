import { useEffect, useState } from "react"

import type { Pitch } from "../../shared/models.ts"
import { toSequencePitches, toStrikeZonePitches } from "./adapters.ts"

/** Shared hover focus for a strike-zone plot and its pitch-sequence table. */
export function usePitchHover(pitches: Pitch[], atBatIndex?: number | null) {
	const [focusedNumber, setFocusedNumber] = useState<number | null>(null)
	const zonePitches = toStrikeZonePitches(pitches)
	const sequencePitches = toSequencePitches(pitches)

	useEffect(() => {
		setFocusedNumber(null)
	}, [atBatIndex])

	const zoneIndex = focusedNumber == null ? -1 : zonePitches.findIndex(pitch => pitch.number === focusedNumber)
	const sequenceIndex = focusedNumber == null ? -1 : pitches.findIndex(pitch => pitch.pitchNumber === focusedNumber)

	return {
		zonePitches,
		sequencePitches,
		zoneFocused: zoneIndex >= 0 ? zoneIndex : null,
		sequenceFocused: sequenceIndex >= 0 ? sequenceIndex : null,
		onZoneFocus: (index: number | null, pitch: { number?: string | number } | null) => {
			setFocusedNumber(index == null || pitch?.number == null ? null : Number(pitch.number))
		},
		onSequenceFocus: (index: number | null) => {
			setFocusedNumber(index == null ? null : (pitches[index]?.pitchNumber ?? null))
		},
	}
}
