"""Progressive-overload suggestions.

Pure functions. Given the last session's sets for an exercise and a rule
(stored as JSONB on the template row), suggest what to do next session.

Add a new rule = one function + one dispatch entry.
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PreviousSet:
    weight_kg: float
    reps: int
    rpe: float | None = None


@dataclass(frozen=True)
class TemplateTarget:
    target_sets: int
    target_reps_low: int
    target_reps_high: int
    target_rpe: float | None = None


@dataclass(frozen=True)
class Suggestion:
    weight_kg: float
    reps_low: int
    reps_high: int
    reason: str


RuleFn = Callable[[list[PreviousSet], TemplateTarget, dict[str, Any]], Suggestion]


def _linear(
    prev: list[PreviousSet], target: TemplateTarget, rule: dict[str, Any]
) -> Suggestion:
    """Hit the top of the rep range on all working sets → +increment_kg next time.
    Otherwise stay at same weight.
    """
    increment = float(rule.get("increment_kg", 2.5))
    working = [s for s in prev if s.reps >= target.target_reps_low]

    if not working:
        return Suggestion(
            weight_kg=0.0,
            reps_low=target.target_reps_low,
            reps_high=target.target_reps_high,
            reason="No prior data — start with a comfortable working weight.",
        )

    top_weight = max(s.weight_kg for s in working)
    all_hit_top = len(working) >= target.target_sets and all(
        s.reps >= target.target_reps_high for s in working[: target.target_sets]
    )
    if all_hit_top:
        return Suggestion(
            weight_kg=top_weight + increment,
            reps_low=target.target_reps_low,
            reps_high=target.target_reps_high,
            reason=f"Hit top of rep range on all sets — add {increment} kg.",
        )
    return Suggestion(
        weight_kg=top_weight,
        reps_low=target.target_reps_low,
        reps_high=target.target_reps_high,
        reason="Stay at same weight and aim for more reps in range.",
    )


def _double_progression(
    prev: list[PreviousSet], target: TemplateTarget, rule: dict[str, Any]
) -> Suggestion:
    """Add reps until you hit top of range on all sets, then +increment_kg and reset to bottom."""
    increment = float(rule.get("increment_kg", 2.5))
    if not prev:
        return Suggestion(
            weight_kg=0.0,
            reps_low=target.target_reps_low,
            reps_high=target.target_reps_high,
            reason="No prior data — start with a comfortable working weight.",
        )
    top_weight = max(s.weight_kg for s in prev)
    at_top = [s for s in prev if s.weight_kg >= top_weight - 0.01]
    all_hit_top = len(at_top) >= target.target_sets and all(
        s.reps >= target.target_reps_high for s in at_top[: target.target_sets]
    )
    if all_hit_top:
        return Suggestion(
            weight_kg=top_weight + increment,
            reps_low=target.target_reps_low,
            reps_high=target.target_reps_low,
            reason=f"All sets at top of range — bump to {top_weight + increment} kg, reset reps.",
        )
    return Suggestion(
        weight_kg=top_weight,
        reps_low=target.target_reps_low,
        reps_high=target.target_reps_high,
        reason="Push for one more rep on each set at the same weight.",
    )


def _rpe_based(
    prev: list[PreviousSet], target: TemplateTarget, rule: dict[str, Any]
) -> Suggestion:
    """If last-session RPE < target_rpe - 0.5, add increment. If > target_rpe + 0.5, reduce."""
    increment = float(rule.get("increment_kg", 2.5))
    target_rpe = target.target_rpe or 8.0
    rated = [s for s in prev if s.rpe is not None]
    if not rated:
        return _linear(prev, target, rule)
    top = max(rated, key=lambda s: s.weight_kg)
    delta = (top.rpe or target_rpe) - target_rpe
    if delta <= -0.5:
        return Suggestion(
            weight_kg=top.weight_kg + increment,
            reps_low=target.target_reps_low,
            reps_high=target.target_reps_high,
            reason=f"Last top set was easy (RPE {top.rpe}) — add {increment} kg.",
        )
    if delta >= 0.5:
        return Suggestion(
            weight_kg=max(0.0, top.weight_kg - increment),
            reps_low=target.target_reps_low,
            reps_high=target.target_reps_high,
            reason=f"Last top set was too hard (RPE {top.rpe}) — drop {increment} kg.",
        )
    return Suggestion(
        weight_kg=top.weight_kg,
        reps_low=target.target_reps_low,
        reps_high=target.target_reps_high,
        reason="RPE on target — hold weight, try for the same reps.",
    )


RULES: dict[str, RuleFn] = {
    "linear": _linear,
    "double_progression": _double_progression,
    "rpe_based": _rpe_based,
}


def suggest_next(
    prev: list[PreviousSet],
    target: TemplateTarget,
    rule: dict[str, Any] | None,
) -> Suggestion:
    rule = rule or {"type": "linear", "increment_kg": 2.5}
    fn = RULES.get(rule.get("type", "linear"), _linear)
    return fn(prev, target, rule)
