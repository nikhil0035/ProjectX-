from datetime import date

from app.services.scoring import SubScores, period_bounds


def test_composite_only_available_subscores():
    s = SubScores(training=80.0, nutrition=60.0)
    # weights: training=0.25, nutrition=0.25 → equal → mean of 80 & 60 = 70
    assert s.composite() == 70.0


def test_composite_all_none_is_none():
    assert SubScores().composite() is None


def test_composite_full_weighted_average():
    s = SubScores(training=100, volume=100, strength=100, nutrition=0, recovery=0)
    # 0.25*100 + 0.15*100 + 0.15*100 + 0.25*0 + 0.20*0 = 55
    assert s.composite() == 55.0


def test_period_bounds_day():
    d = date(2026, 3, 15)
    start, end = period_bounds("day", today=d)
    assert start == end == d


def test_period_bounds_week_monday_to_sunday():
    # 2026-03-15 is a Sunday. weekday()=6 → Monday is 2026-03-09.
    d = date(2026, 3, 15)
    start, end = period_bounds("week", today=d)
    assert start == date(2026, 3, 9)
    assert end == date(2026, 3, 15)


def test_period_bounds_month_rolling_30():
    d = date(2026, 3, 15)
    start, end = period_bounds("month", today=d)
    assert (end - start).days == 29
    assert end == d
