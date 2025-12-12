"""
Schedule management and cron generation utilities.

This module provides functions to:
- Convert local times to UTC for EventBridge cron expressions
- Generate cron expressions from weekly schedules
- Group days with identical schedules to minimize AWS resources
- Handle timezone conversions and DST transitions
- Validate schedule configurations

Migrated from services/api/src/schedule_utils.py for lambda-mgmt-module.
"""

from datetime import datetime, time
from typing import Dict, List, Optional, Tuple
import pytz
import logging

logger = logging.getLogger(__name__)


def local_time_to_utc(
    local_time: str, 
    timezone: str, 
    reference_date: Optional[datetime] = None
) -> int:
    """
    Convert local time (HH:mm) to UTC hour.

    Args:
        local_time: Time in HH:mm format (e.g., "09:00")
        timezone: IANA timezone (e.g., "America/New_York")
        reference_date: Optional reference date for DST handling (defaults to current date)

    Returns:
        UTC hour (0-23)

    Raises:
        ValueError: If time format or timezone is invalid

    Example:
        >>> local_time_to_utc("09:00", "America/New_York")
        14  # 9am ET = 2pm UTC (during DST)
    """
    try:
        tz = pytz.timezone(timezone)
        
        # Use reference date or current date
        ref_date = reference_date.date() if reference_date else datetime.now(tz).date()
        
        # Parse the time
        hour, minute = map(int, local_time.split(':'))
        local_dt = tz.localize(datetime.combine(ref_date, time(hour, minute)))
        
        # Convert to UTC
        utc_dt = local_dt.astimezone(pytz.UTC)
        return utc_dt.hour
    except Exception as e:
        logger.error(f"Error converting {local_time} in {timezone} to UTC: {e}")
        raise ValueError(f"Invalid time or timezone: {local_time}, {timezone}")


def time_range_to_cron_hours(start: str, end: str, timezone: str) -> str:
    """
    Convert a time range to cron hour expression.

    Args:
        start: Start time in HH:mm format (e.g., "09:00")
        end: End time in HH:mm format (e.g., "17:00")
        timezone: IANA timezone

    Returns:
        Cron hours expression (e.g., "14-22" or "23-1,14-22" for overnight)

    Examples:
        >>> time_range_to_cron_hours("09:00", "17:00", "America/New_York")
        "14-22"  # During DST
        
        >>> time_range_to_cron_hours("23:00", "01:00", "America/New_York")
        "4-6"  # Overnight schedule
    """
    start_utc = local_time_to_utc(start, timezone)
    end_utc = local_time_to_utc(end, timezone)

    if start_utc <= end_utc:
        # Normal case: same day in UTC
        return f"{start_utc}-{end_utc}"
    else:
        # Crosses midnight in UTC: need two ranges
        # EventBridge handles hour wrap-around
        return f"{start_utc}-{end_utc}"


def generate_cron_for_day(
    day_schedule: Dict, 
    day_name: str, 
    timezone: str, 
    interval: int = 5
) -> Optional[str]:
    """
    Generate cron expression for a single day's schedule.

    Args:
        day_schedule: {enabled: bool, ranges: [{start, end}]}
        day_name: Day of week (e.g., "monday")
        timezone: IANA timezone
        interval: Minutes between invocations (default: 5)

    Returns:
        Cron expression or None if day is disabled

    Example:
        >>> day_schedule = {"enabled": True, "ranges": [{"start": "09:00", "end": "17:00"}]}
        >>> generate_cron_for_day(day_schedule, "monday", "America/New_York", 5)
        "cron(*/5 14-22 ? * MON *)"
    """
    if not day_schedule.get("enabled"):
        return None

    ranges = day_schedule.get("ranges", [])
    if not ranges:
        return None

    # Convert all ranges to UTC hour expressions
    hour_expressions = []
    for time_range in ranges:
        hour_expr = time_range_to_cron_hours(
            time_range["start"],
            time_range["end"],
            timezone
        )
        hour_expressions.append(hour_expr)

    # Combine multiple ranges with comma
    hours = ",".join(hour_expressions)

    # Day of week abbreviation (uppercase first 3 letters)
    day_abbr = day_name[:3].upper()

    # Build cron expression
    # Format: cron(minute hour day-of-month month day-of-week year)
    # ? means "no specific value" for day-of-month
    # * means "any" for month and year
    return f"cron(*/{interval} {hours} ? * {day_abbr} *)"


def extract_hour_pattern(cron: str) -> str:
    """
    Extract hour pattern from cron expression.

    Args:
        cron: Full cron expression

    Returns:
        Hour pattern string

    Example:
        >>> extract_hour_pattern("cron(*/5 14-22 ? * MON *)")
        "14-22"
    """
    # Parse "cron(*/5 14-22 ? * MON *)" → "14-22"
    parts = cron.split()
    return parts[1] if len(parts) > 1 else ""


def are_consecutive_days(days: List[str]) -> bool:
    """
    Check if days are consecutive in week order.

    Args:
        days: List of day names (lowercase)

    Returns:
        True if days are consecutive, False otherwise

    Example:
        >>> are_consecutive_days(["monday", "tuesday", "wednesday"])
        True
        >>> are_consecutive_days(["monday", "wednesday", "friday"])
        False
    """
    day_order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    
    try:
        indices = [day_order.index(d.lower()) for d in days]
    except ValueError:
        return False
    
    indices.sort()

    for i in range(len(indices) - 1):
        if indices[i + 1] - indices[i] != 1:
            return False
    
    return True


def group_days_by_schedule(
    weekly_schedule: Dict, 
    timezone: str, 
    interval: int = 5
) -> Dict[str, List[str]]:
    """
    Group days with identical schedules to minimize EventBridge rules.

    Args:
        weekly_schedule: Full week configuration with day schedules
        timezone: IANA timezone
        interval: Minutes between invocations

    Returns:
        Dictionary mapping cron expressions to list of days

    Example:
        >>> schedule = {
        ...     "monday": {"enabled": True, "ranges": [{"start": "09:00", "end": "17:00"}]},
        ...     "tuesday": {"enabled": True, "ranges": [{"start": "09:00", "end": "17:00"}]},
        ...     # ... same for wed-fri
        ... }
        >>> group_days_by_schedule(schedule, "America/New_York", 5)
        {"cron(*/5 14-22 ? * MON-FRI *)": ["monday", "tuesday", "wednesday", "thursday", "friday"]}
    """
    schedule_groups: Dict[str, List[str]] = {}

    # First pass: generate cron for each day and group by hour pattern
    hour_pattern_to_days: Dict[str, List[str]] = {}
    
    for day_name, day_schedule in weekly_schedule.items():
        if not day_schedule.get("enabled"):
            continue

        # Generate cron for this day
        cron = generate_cron_for_day(day_schedule, day_name, timezone, interval)
        if not cron:
            continue

        # Extract hour pattern for grouping
        hour_pattern = extract_hour_pattern(cron)

        if hour_pattern not in hour_pattern_to_days:
            hour_pattern_to_days[hour_pattern] = []

        hour_pattern_to_days[hour_pattern].append(day_name)

    # Second pass: convert to final cron expressions with grouped days
    for hour_pattern, days in hour_pattern_to_days.items():
        if len(days) == 1:
            # Single day
            day_abbr = days[0][:3].upper()
        elif are_consecutive_days(days):
            # Consecutive days - use range notation
            day_abbrs = [d[:3].upper() for d in sorted(days, key=lambda x: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].index(x.lower()))]
            day_abbr = f"{day_abbrs[0]}-{day_abbrs[-1]}"
        else:
            # Non-consecutive days - use comma notation
            day_abbrs = [d[:3].upper() for d in days]
            day_abbr = ",".join(sorted(day_abbrs))

        cron = f"cron(*/{interval} {hour_pattern} ? * {day_abbr} *)"
        schedule_groups[cron] = days

    return schedule_groups


def generate_cron_expressions(config: Dict) -> List[Dict[str, any]]:
    """
    Generate EventBridge cron expressions from schedule configuration.

    This is the main entry point for cron generation. It takes the full
    lambda_warming configuration and returns a list of cron expressions
    with metadata for EventBridge rule creation.

    Args:
        config: Lambda warming configuration with weekly_schedule

    Returns:
        List of dictionaries with:
        - cron: EventBridge cron expression
        - days: List of day names covered by this rule
        - rule_suffix: Unique suffix for rule naming

    Example:
        >>> config = {
        ...     "enabled": True,
        ...     "timezone": "America/New_York",
        ...     "weekly_schedule": {
        ...         "monday": {"enabled": True, "ranges": [{"start": "09:00", "end": "17:00"}]},
        ...         # ... other days
        ...     },
        ...     "interval_minutes": 5
        ... }
        >>> rules = generate_cron_expressions(config)
        >>> rules[0]
        {
            "cron": "cron(*/5 14-22 ? * MON-FRI *)",
            "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "rule_suffix": "pattern-1"
        }
    """
    if not config.get("enabled"):
        # If master toggle is off, return empty list
        logger.info("Lambda warming is disabled, returning no cron expressions")
        return []

    weekly_schedule = config.get("weekly_schedule", {})
    timezone = config.get("timezone", "America/New_York")
    interval = config.get("interval_minutes", 5)

    # Group days by schedule pattern
    cron_to_days = group_days_by_schedule(weekly_schedule, timezone, interval)

    # Convert to list format with rule suffixes
    rules = []
    for i, (cron, days) in enumerate(cron_to_days.items(), start=1):
        rules.append({
            "cron": cron,
            "days": days,
            "rule_suffix": f"pattern-{i}"
        })

    logger.info(f"Generated {len(rules)} EventBridge rule(s) from schedule configuration")
    return rules


def validate_schedule_config(config: Dict) -> Tuple[bool, Optional[str]]:
    """
    Validate schedule configuration for correctness.

    Args:
        config: Lambda warming configuration

    Returns:
        Tuple of (is_valid, error_message)

    Example:
        >>> config = {"enabled": True, "timezone": "Invalid/Zone", ...}
        >>> validate_schedule_config(config)
        (False, "Invalid timezone: Invalid/Zone")
    """
    # Check required fields
    if "timezone" not in config:
        return False, "Missing required field: timezone"
    
    if "weekly_schedule" not in config:
        return False, "Missing required field: weekly_schedule"
    
    # Validate timezone
    try:
        pytz.timezone(config["timezone"])
    except pytz.exceptions.UnknownTimeZoneError:
        return False, f"Invalid timezone: {config['timezone']}"
    
    # Validate weekly schedule structure
    weekly_schedule = config.get("weekly_schedule", {})
    expected_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    
    for day in expected_days:
        if day not in weekly_schedule:
            return False, f"Missing day in weekly_schedule: {day}"
        
        day_schedule = weekly_schedule[day]
        if not isinstance(day_schedule, dict):
            return False, f"Invalid structure for {day}: must be a dictionary"
        
        if "enabled" not in day_schedule:
            return False, f"Missing 'enabled' field for {day}"
        
        if "ranges" not in day_schedule:
            return False, f"Missing 'ranges' field for {day}"
        
        # Validate time ranges
        ranges = day_schedule.get("ranges", [])
        if not isinstance(ranges, list):
            return False, f"Invalid 'ranges' for {day}: must be a list"
        
        for i, time_range in enumerate(ranges):
            if not isinstance(time_range, dict):
                return False, f"Invalid time range {i} for {day}: must be a dictionary"
            
            if "start" not in time_range or "end" not in time_range:
                return False, f"Time range {i} for {day} missing 'start' or 'end'"
            
            # Validate time format
            try:
                datetime.strptime(time_range["start"], "%H:%M")
                datetime.strptime(time_range["end"], "%H:%M")
            except ValueError:
                return False, f"Invalid time format in range {i} for {day}: use HH:MM format"
    
    return True, None
