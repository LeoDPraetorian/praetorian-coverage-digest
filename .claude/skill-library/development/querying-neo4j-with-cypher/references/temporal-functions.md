# Temporal Functions

## Date/Time Types

| Type            | Description               | Example               |
| --------------- | ------------------------- | --------------------- |
| `date`          | Calendar date             | `date('2024-01-15')`  |
| `datetime`      | Date + time + timezone    | `datetime()`          |
| `localdatetime` | Date + time (no timezone) | `localdatetime()`     |
| `time`          | Time + timezone           | `time('12:30:00')`    |
| `localtime`     | Time (no timezone)        | `localtime()`         |
| `duration`      | Time span                 | `duration('P1Y2M3D')` |

## Current Date/Time

```cypher
RETURN date() AS today
RETURN datetime() AS now
RETURN timestamp() AS epochMillis
```

## Create Specific Values

```cypher
RETURN date({year: 2024, month: 6, day: 15}) AS specificDate
RETURN datetime({year: 2024, month: 6, day: 15, hour: 14, minute: 30}) AS specificDateTime
```

## Duration Functions

### duration.between()

```cypher
-- Days between two dates
MATCH (e:Event)
RETURN e.name,
       duration.between(e.startDate, e.endDate).days AS daysBetween

-- Age in days from today
MATCH (u:User)
RETURN u.name,
       duration.between(u.createdDate, date()).days AS accountAgeDays

-- Full breakdown
WITH date('2024-01-01') AS start, date('2024-12-31') AS end
WITH duration.between(start, end) AS d
RETURN d.months AS months, d.days AS days
```

### Duration Arithmetic

```cypher
-- Add duration to date
WITH date('2024-01-01') AS start
RETURN start + duration({months: 3}) AS threeMonthsLater

-- Subtract duration
WITH datetime() AS now
RETURN now - duration({days: 7}) AS oneWeekAgo
```

### Parse Duration Strings

```cypher
-- ISO 8601 format
RETURN duration('P1Y2M3D') AS yearMonthDay    -- 1 year, 2 months, 3 days
RETURN duration('PT4H30M') AS hourMinute      -- 4 hours, 30 minutes
RETURN duration('P14DT16H') AS twoWeeks       -- 14 days, 16 hours
```

## Truncation

```cypher
-- Truncate to day (remove time component)
WITH datetime() AS now
RETURN datetime.truncate('day', now) AS startOfDay

-- Truncate to month
RETURN datetime.truncate('month', datetime()) AS startOfMonth
```

## Filter by Time

```cypher
-- Events in last 30 days
MATCH (e:Event)
WHERE e.eventDate > date() - duration({days: 30})
RETURN e.name, e.eventDate

-- Events older than 1 year
MATCH (e:Event)
WHERE duration.between(e.eventDate, date()).days > 365
RETURN e.name
```

## Practical Patterns

```cypher
-- Calculate age
MATCH (p:Person)
RETURN p.name,
       duration.between(p.birthDate, date()).years AS age

-- Time since last activity
MATCH (u:User)
RETURN u.name,
       duration.between(u.lastLogin, datetime()).hours AS hoursSinceLogin
```
