import { dispatch, startShift } from "../src/sim";
import type { Phase, ShiftId, State } from "../src/types";

export function play(seed: string, shift: ShiftId, until: (state: State) => boolean, limit = 12000): { state: State; phases: Phase[] } {
  let state = startShift(shift, seed);
  const phases: Phase[] = [state.phase];
  for (let i = 0; i < limit && !until(state); i++) {
    if (state.modal) {
      const choice = state.modal.choices.find((item) => item.safe) ?? state.modal.choices[0];
      if (!choice) break;
      state = dispatch(state, { type: "choose", id: choice.id });
    } else if (state.phase === "summary" || state.phase === "title") {
      break;
    } else {
      state = dispatch(state, { type: "tick", minutes: 1 });
    }
    const last = phases[phases.length - 1];
    if (last !== state.phase) phases.push(state.phase);
  }
  return { state, phases };
}

export function hasOrder(phases: Phase[], need: Phase[]): boolean {
  let index = 0;
  for (const phase of phases) {
    if (phase === need[index]) index += 1;
    if (index === need.length) return true;
  }
  return false;
}
