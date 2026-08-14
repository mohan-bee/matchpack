import type { ChipId, InputProblem, NetId } from "../../types/InputProblem"

export type CapacitorNetPairCandidate = {
  chipId: ChipId
  netPair: [NetId, NetId]
}

export type RepeatedGroundedCapacitorBank = {
  capacitorChipIds: ChipId[]
  netPair: [NetId, NetId]
}

const MIN_CAPACITORS_IN_BANK = 2

const netPairsMatch = (pairA: [NetId, NetId], pairB: [NetId, NetId]): boolean =>
  pairA[0] === pairB[0] && pairA[1] === pairB[1]

export const findRepeatedGroundedCapacitorBanks = ({
  inputProblem,
  candidates,
}: {
  inputProblem: InputProblem
  candidates: CapacitorNetPairCandidate[]
}): RepeatedGroundedCapacitorBank[] => {
  const banks: RepeatedGroundedCapacitorBank[] = []

  for (const candidate of candidates) {
    const groundNetCount = candidate.netPair.filter(
      (netId) => inputProblem.netMap[netId]?.isGround,
    ).length
    if (groundNetCount !== 1) continue

    const existingBank = banks.find((bank) =>
      netPairsMatch(bank.netPair, candidate.netPair),
    )
    if (existingBank) {
      existingBank.capacitorChipIds.push(candidate.chipId)
      continue
    }

    banks.push({
      capacitorChipIds: [candidate.chipId],
      netPair: candidate.netPair,
    })
  }

  return banks.filter(
    (bank) => bank.capacitorChipIds.length >= MIN_CAPACITORS_IN_BANK,
  )
}
