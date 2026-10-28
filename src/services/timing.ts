/**
 * Shared timing assumptions. The route planner's time estimate and the avatar's
 * simulated walk both come from these values, so the number shown to a visitor
 * matches what they see in 3D at 1× speed.
 */

/** Walking speed in metres per second. */
export const WALK_SPEED_MPS = 1.3;
/** Time the lift doors take to open before boarding, seconds. */
export const LIFT_DOOR_SECONDS = 1.5;
/** Time the lift doors take to open on arrival, seconds. */
export const LIFT_ARRIVE_SECONDS = 1.2;
/** Fixed lift travel time before per-level travel, seconds. */
export const LIFT_SECONDS_BASE = 1.5;
/** Lift travel time per level crossed, seconds. */
export const LIFT_SECONDS_PER_LEVEL = 2.2;
/** Time for one staircase flight, seconds. */
export const STAIR_SECONDS_PER_FLIGHT = 7;
