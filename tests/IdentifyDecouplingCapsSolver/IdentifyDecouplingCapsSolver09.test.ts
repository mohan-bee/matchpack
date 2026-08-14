import { expect, test } from "bun:test"
import { IdentifyDecouplingCapsSolver } from "../../lib/solvers/IdentifyDecouplingCapsSolver/IdentifyDecouplingCapsSolver"
import { LayoutPipelineSolver } from "../../lib/solvers/LayoutPipelineSolver/LayoutPipelineSolver"
import type { InputProblem } from "../../lib/types/InputProblem"
import input from "../assets/board-196038.input.json"

const modemCapacitorIds = [
  "C_MODEM_BULK",
  "C_MODEM_1U",
  "C_MODEM_100N",
  "C_MODEM_33N",
  "C_MODEM_10P",
]

test("groups a repeated grounded capacitor bank without power metadata", () => {
  const solver = new IdentifyDecouplingCapsSolver(input as InputProblem)
  solver.solve()

  expect(solver.outputDecouplingCapGroups).toContainEqual(
    expect.objectContaining({
      mainChipId: "U_MODEM",
      mainChipSide: "x-",
      decouplingCapChipIds: modemCapacitorIds,
    }),
  )
  expect(
    solver.outputDecouplingCapGroups.some((group) =>
      group.decouplingCapChipIds.includes("C_GNSS_VDD"),
    ),
  ).toBe(false)
})

test("does not infer a repeated capacitor bank with an ambiguous main chip", () => {
  const ambiguousInput = structuredClone(input) as InputProblem
  ambiguousInput.chipMap.J1 = {
    chipId: "J1",
    pins: ["J1.1", "J1.2"],
    size: { x: 1, y: 1 },
    availableRotations: [0],
  }
  ambiguousInput.chipPinMap["J1.1"] = {
    pinId: "J1.1",
    offset: { x: 0, y: 0.3 },
    side: "y+",
  }
  ambiguousInput.chipPinMap["J1.2"] = {
    pinId: "J1.2",
    offset: { x: 0, y: -0.3 },
    side: "y-",
  }
  const supplyNetId = Object.keys(ambiguousInput.netMap).find(
    (netId) => ambiguousInput.netConnMap[`C_MODEM_BULK.1-${netId}`] === true,
  )!
  const groundNetId = Object.keys(ambiguousInput.netMap).find(
    (netId) => ambiguousInput.netConnMap[`C_MODEM_BULK.2-${netId}`] === true,
  )!
  ambiguousInput.netConnMap[`J1.1-${supplyNetId}`] = true
  ambiguousInput.netConnMap[`J1.2-${groundNetId}`] = true

  const solver = new IdentifyDecouplingCapsSolver(ambiguousInput)
  solver.solve()

  const groupedCapacitorIds = solver.outputDecouplingCapGroups.flatMap(
    (group) => group.decouplingCapChipIds,
  )
  for (const capacitorId of modemCapacitorIds) {
    expect(groupedCapacitorIds).not.toContain(capacitorId)
  }
})

test("places the repeated grounded capacitor bank in a horizontal row", () => {
  const solver = new LayoutPipelineSolver(input as InputProblem)
  solver.solve()

  const placements = solver.getOutputLayout().chipPlacements
  const yCoordinates = modemCapacitorIds.map((chipId) => placements[chipId]!.y)
  const rowHeight = Math.max(...yCoordinates) - Math.min(...yCoordinates)

  expect(rowHeight).toBeLessThan(1e-9)
  expect(solver.checkForOverlaps(solver.getOutputLayout())).toEqual([])
})
