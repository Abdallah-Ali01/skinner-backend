# Availability API - Test Scenarios

## Test Setup

**Test Doctor:** `DOC-2001`
**Test Date:** `2026-06-10` (future date)
**Test Patient:** Any valid patient ID

---

## Category 1: Basic Validation Tests

### Test 1.1: Valid 30-Minute Slots
```bash
PUT /api/doctor/date-availability
Authorization: Bearer <doctor-token>

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "09:30", "end_time": "10:00" },
    { "start_time": "10:00", "end_time": "10:30" }
  ]
}
```
**Expected:** ✅ 200 OK

---

### Test 1.2: Valid 60-Minute Slots
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "10:00" },
    { "start_time": "14:00", "end_time": "15:00" }
  ]
}
```
**Expected:** ✅ 200 OK

---

### Test 1.3: Mixed 30 and 60 Minute Slots
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "10:00", "end_time": "11:00" },
    { "start_time": "14:00", "end_time": "14:30" }
  ]
}
```
**Expected:** ✅ 200 OK

---

### Test 1.4: Adjacent Slots (Touching)
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "09:30", "end_time": "10:00" }
  ]
}
```
**Expected:** ✅ 200 OK (adjacent is allowed)

---

### Test 1.5: Boundary Slot (Ends at 21:00)
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "20:00", "end_time": "21:00" }
  ]
}
```
**Expected:** ✅ 200 OK

---

## Category 2: Duration Validation Tests

### Test 2.1: Invalid 45-Minute Slot
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:45" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "Slot duration must be exactly 30 or 60 minutes. Got 45 minutes for 09:00-09:45"
}
```

---

### Test 2.2: Invalid 15-Minute Slot
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:15" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "Slot duration must be exactly 30 or 60 minutes. Got 15 minutes for 09:00-09:15"
}
```

---

### Test 2.3: Invalid 90-Minute Slot
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "10:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "Slot duration must be exactly 30 or 60 minutes. Got 90 minutes for 09:00-10:30"
}
```

---

## Category 3: Working Hours Validation Tests

### Test 3.1: Slot Before Working Hours
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "08:00", "end_time": "08:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_time (08:00) is before working hours (09:00)"
}
```

---

### Test 3.2: Slot After Working Hours
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "20:30", "end_time": "21:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "end_time (21:30) is after working hours (21:00)"
}
```

---

### Test 3.3: Slot Crossing Working Hours Boundary
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "08:30", "end_time": "09:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_time (08:30) is before working hours (09:00)"
}
```

---

## Category 4: Time Format Validation Tests

### Test 4.1: Missing Leading Zero
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "9:00", "end_time": "9:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_time must be in HH:mm format (00:00 to 21:59). Got: 9:00"
}
```

---

### Test 4.2: Invalid Hour
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "25:00", "end_time": "26:00" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_time must be in HH:mm format (00:00 to 21:59). Got: 25:00"
}
```

---

### Test 4.3: Invalid Minute
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:60", "end_time": "10:00" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_time must be in HH:mm format (00:00 to 21:59). Got: 09:60"
}
```

---

### Test 4.4: Wrong Format (AM/PM)
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "9am", "end_time": "10am" }
  ]
}
```
**Expected:** ❌ 400 Bad Request

---

## Category 5: Overlap Validation Tests

### Test 5.1: Overlapping Slots
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "10:00" },
    { "start_time": "09:30", "end_time": "10:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "Overlapping slots: 09:00-10:00 and 09:30-10:30"
}
```

---

### Test 5.2: One Slot Inside Another
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "11:00" },
    { "start_time": "09:30", "end_time": "10:00" }
  ]
}
```
**Expected:** ❌ 400 Bad Request

---

## Category 6: Past Date Tests

### Test 6.1: Set Availability for Past Date
```bash
PUT /api/doctor/date-availability

{
  "date": "2024-01-01",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "Cannot set availability for a past date"
}
```

---

### Test 6.2: Delete Availability for Past Date
```bash
DELETE /api/doctor/date-availability/2024-01-01
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "Cannot remove availability for a past date"
}
```

---

## Category 7: Day-Off Tests

### Test 7.1: Mark Day as Unavailable (No Bookings)
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-15",
  "slots": []
}
```
**Expected:** ✅ 200 OK
```json
{
  "success": true,
  "message": "2026-06-15 marked as day-off (unavailable)"
}
```

---

### Test 7.2: Mark Day as Unavailable (With Bookings)

**Setup:** First create a booking for 2026-06-10 at 10:00

```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": []
}
```
**Expected:** ❌ 409 Conflict
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot mark day as unavailable: confirmed appointments exist",
  "conflicting_appointments": [
    {
      "appointment_id": "abc-123",
      "time": "10:00",
      "date": "2026-06-10T10:00:00.000Z"
    }
  ]
}
```

---

## Category 8: Booked Slot Protection Tests

### Test 8.1: Change Duration of Booked Slot

**Setup:**
1. Create slot: `10:00 → 10:30`
2. Patient books appointment at 10:00
3. Doctor tries to change to: `10:00 → 11:00`

```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "10:00", "end_time": "11:00" }
  ]
}
```
**Expected:** ❌ 409 Conflict
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot modify or remove slots with confirmed bookings. Booked slots must remain exactly as defined.",
  "conflicting_slots": [
    {
      "appointment_id": "abc-123",
      "appointment_date": "2026-06-10T10:00:00.000Z",
      "locked_slot": {
        "start_time": "10:00",
        "end_time": "10:30",
        "duration_minutes": 30
      },
      "reason": "Slot duration or end_time changed"
    }
  ]
}
```

---

### Test 8.2: Remove Booked Slot

**Setup:**
1. Create slots: `09:00-09:30`, `10:00-10:30`, `14:00-14:30`
2. Patient books 10:00
3. Doctor tries to remove 10:00 slot

```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "14:00", "end_time": "14:30" }
  ]
}
```
**Expected:** ❌ 409 Conflict

---

### Test 8.3: Change Start Time of Booked Slot

**Setup:**
1. Create slot: `10:00 → 10:30`
2. Patient books 10:00
3. Doctor tries: `10:30 → 11:00`

```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "10:30", "end_time": "11:00" }
  ]
}
```
**Expected:** ❌ 409 Conflict

---

### Test 8.4: Add Slots Around Booked Slot (Valid)

**Setup:**
1. Create slot: `10:00 → 10:30`
2. Patient books 10:00
3. Doctor adds more slots but keeps 10:00-10:30

```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "10:00", "end_time": "10:30" },
    { "start_time": "14:00", "end_time": "14:30" }
  ]
}
```
**Expected:** ✅ 200 OK

---

### Test 8.5: Modify Unbooked Slot (Valid)

**Setup:**
1. Create slots: `09:00-09:30`, `10:00-10:30`
2. Patient books 10:00 only
3. Doctor changes 09:00 slot

```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "09:00", "end_time": "10:00" },
    { "start_time": "10:00", "end_time": "10:30" }
  ]
}
```
**Expected:** ✅ 200 OK

---

### Test 8.6: DELETE Date with Bookings

**Setup:**
1. Create slots with bookings

```bash
DELETE /api/doctor/date-availability/2026-06-10
```
**Expected:** ❌ 409 Conflict
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot remove availability: confirmed appointments exist",
  "conflicting_appointments": [...]
}
```

---

## Category 9: Edge Cases

### Test 9.1: Zero Duration Slot
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "10:00", "end_time": "10:00" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_time (10:00) must be before end_time (10:00)"
}
```

---

### Test 9.2: Reversed Times
```bash
PUT /api/doctor/date-availability

{
  "date": "2026-06-10",
  "slots": [
    { "start_time": "11:00", "end_time": "10:00" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_time (11:00) must be before end_time (10:00)"
}
```

---

### Test 9.3: Invalid Date Format
```bash
PUT /api/doctor/date-availability

{
  "date": "2026/06/10",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" }
  ]
}
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

---

## Category 10: GET Tests

### Test 10.1: Get Availability for Date Range
```bash
GET /api/doctor/date-availability?start_date=2026-06-01&end_date=2026-06-30
Authorization: Bearer <doctor-token>
```
**Expected:** ✅ 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "available_date": "2026-06-10",
      "start_time": "09:00",
      "end_time": "09:30",
      "slot_duration_minutes": 30
    },
    ...
  ]
}
```

---

### Test 10.2: Get Availability Without Parameters
```bash
GET /api/doctor/date-availability
```
**Expected:** ❌ 400 Bad Request
```json
{
  "success": false,
  "message": "start_date and end_date query parameters are required"
}
```

---

## Test Execution Checklist

- [ ] All validation tests pass
- [ ] Duration validation works for 30 and 60 min only
- [ ] Working hours enforced (09:00-21:00)
- [ ] Time format strictly validated (HH:mm)
- [ ] Overlapping slots rejected
- [ ] Adjacent slots allowed
- [ ] Past dates rejected
- [ ] Empty slots array marks day-off
- [ ] Day-off blocked if bookings exist
- [ ] Booked slots completely locked (start + end + duration)
- [ ] Can add slots around booked slots
- [ ] Can modify unbooked slots
- [ ] DELETE blocked if bookings exist
- [ ] 409 responses include detailed conflict info
- [ ] GET with date range works
