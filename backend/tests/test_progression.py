import pytest

from app.services.progression import (
    PreviousSet,
    TemplateTarget,
    suggest_next,
)

TARGET = TemplateTarget(target_sets=3, target_reps_low=6, target_reps_high=8, target_rpe=8.0)


@pytest.mark.parametrize(
    "prev, expected_weight, contains",
    [
        # Hit top of range on all 3 sets → +2.5 kg
        (
            [
                PreviousSet(100.0, 8),
                PreviousSet(100.0, 8),
                PreviousSet(100.0, 8),
            ],
            102.5,
            "add",
        ),
        # Didn't hit top → stay
        (
            [
                PreviousSet(100.0, 8),
                PreviousSet(100.0, 7),
                PreviousSet(100.0, 6),
            ],
            100.0,
            "same weight",
        ),
        # Empty prior → zero + hint
        ([], 0.0, "No prior"),
    ],
)
def test_linear(prev, expected_weight, contains):
    s = suggest_next(prev, TARGET, {"type": "linear", "increment_kg": 2.5})
    assert s.weight_kg == pytest.approx(expected_weight)
    assert contains.lower() in s.reason.lower()


def test_double_progression_bump_and_reset():
    prev = [PreviousSet(80.0, 8), PreviousSet(80.0, 8), PreviousSet(80.0, 8)]
    s = suggest_next(prev, TARGET, {"type": "double_progression", "increment_kg": 2.5})
    assert s.weight_kg == pytest.approx(82.5)
    assert s.reps_high == TARGET.target_reps_low  # reset to bottom of range


def test_double_progression_stay_and_grind():
    prev = [PreviousSet(80.0, 7), PreviousSet(80.0, 6), PreviousSet(80.0, 6)]
    s = suggest_next(prev, TARGET, {"type": "double_progression"})
    assert s.weight_kg == pytest.approx(80.0)
    assert s.reps_high == TARGET.target_reps_high


def test_rpe_based_easy_last_time():
    prev = [PreviousSet(100.0, 8, rpe=7.0)]
    s = suggest_next(prev, TARGET, {"type": "rpe_based", "increment_kg": 2.5})
    assert s.weight_kg == pytest.approx(102.5)


def test_rpe_based_too_hard():
    prev = [PreviousSet(100.0, 8, rpe=9.0)]
    s = suggest_next(prev, TARGET, {"type": "rpe_based", "increment_kg": 2.5})
    assert s.weight_kg == pytest.approx(97.5)


def test_rpe_based_on_target():
    prev = [PreviousSet(100.0, 8, rpe=8.0)]
    s = suggest_next(prev, TARGET, {"type": "rpe_based"})
    assert s.weight_kg == pytest.approx(100.0)


def test_unknown_rule_falls_back_to_linear():
    prev = [PreviousSet(100.0, 8), PreviousSet(100.0, 8), PreviousSet(100.0, 8)]
    s = suggest_next(prev, TARGET, {"type": "nonsense"})
    assert s.weight_kg == pytest.approx(102.5)


def test_default_rule_is_linear():
    prev = [PreviousSet(100.0, 8), PreviousSet(100.0, 8), PreviousSet(100.0, 8)]
    s = suggest_next(prev, TARGET, None)
    assert s.weight_kg == pytest.approx(102.5)
