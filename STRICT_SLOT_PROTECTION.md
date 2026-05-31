# Strict Booked Slot Protection - Implementation

## Overview

Any availability slot that has a confirmed (non-cancelled) appointment is **completely locked** and cannot be modified in any way. The doctor must keep the slot exactly as it was when the patient booked it.

---

## What is Protected

A booked slot is locked in its **full definition**:
- `start_time` (e.g., "10:00")
- `end_time` (e.g., "10:30")
- `duration` (implicitly: end - start)

**Any change to a booked slot is rejected:**
- ❌ Changing start_time: `10:00 → 10:30`
- ❌ Changing end_time: `10:30 → 11:00`
- ❌ Changing duration: `10:00-10:30` → `10:00-11:00`
- ❌ Removing the slot entirely

---

## Implementation Logic

### Step 1: Fetch Existing Slots
```sql
SELECT start_time, end_time, slot_duration_minutes
FROM doctor_date_availability
WHERE medical_syndicate_id_card = $1 AND available_date = $2
ORDER BY start_time ASC
```

**Purpose:** Know the full slot definition (start + end + duration) for each existing slot.

---

### Step 2: Fetch Booked Appointments
```sql
SELECT appointment_id, date
FROM appointment
WHERE medical_syndicate_id_card = $1 
  AND date::date = $2::date 
  AND status != 'cancelled'
```

**Purpose:** Find all active bookings on this date.

---

### Step 3: Map Appointments to Slots

For each booked appointment:
1. Extract the appointment time (HH:mm format)
2. Find the existing slot where `slot.start_time === appointment_time`
3. Store the **full slot definition** as "locked"

**Code:**
```javascript
const lockedSlots = [];

for (const apptRow of bookedAppointments.rows) {
  const d = new Date(apptRow.date);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const bookedTime = `${h}:${m}`;

  // Find the existing slot that contains this appointment
  const matchingSlot = existingSlots.rows.find((slot) => {
    const slotStart = slot.start_time.substring(0, 5);
    return slotStart === bookedTime;
  });

  if (matchingSlot) {
    lockedSlots.push({
      start_time: matchingSlot.start_time.substring(0, 5),
      end_time: matchingSlot.end_time.substring(0, 5),
      duration: matchingSlot.slot_duration_minutes,
      appointment_id: apptRow.appointment_id,
      appointment_date: apptRow.date
    });
  }
}
```

---

### Step 4: Validate New Slots Against Locked Slots

For each locked slot, check if it exists **exactly** in the new slots array:

```javascript
const conflictingSlots = [];

for (const locked of lockedSlots) {
  const exactMatch = slots.find(
    (s) => s.start_time === locked.start_time && s.end_time === locked.end_time
  );

  if (!exactMatch) {
    conflictingSlots.push({
      appointment_id: locked.appointment_id,
      appointment_date: locked.appointment_date,
      locked_slot: {
        start_time: locked.start_time,
        end_time: locked.end_time,
        duration_minutes: locked.duration
      },
      reason: exactMatch === undefined 
        ? "Slot removed or start_time changed" 
        : "Slot duration or end_time changed"
    });
  }
}
```

**Validation:**
- Both `start_time` AND `end_time` must match exactly
- If either is different or the slot is missing → conflict

---

### Step 5: Return 409 if Any Conflict

```javascript
if (conflictingSlots.length > 0) {
  const err = new Error("Cannot modify or remove slots with confirmed bookings. Booked slots must remain exactly as defined.");
  err.status = 409;
  err.error = "BOOKED_SLOTS_CONFLICT";
  err.conflicting_slots = conflictingSlots;
  throw err;
}
```

---

## Example Scenarios

### Scenario 1: Attempt to Change Duration

**Existing Availability:**
```json
[
  { "start_time": "10:00", "end_time": "10:30" },
  { "start_time": "14:00", "end_time": "14:30" }
]
```

**Booked Appointments:**
- Patient A booked 10:00 (appointment_id: "abc-123")

**Doctor's PUT Request:**
```json
{
  "date": "2026-06-03",
  "slots": [
    { "start_time": "10:00", "end_time": "11:00" },  // Changed duration!
    { "start_time": "14:00", "end_time": "14:30" }
  ]
}
```

**Locked Slots Identified:**
```javascript
[
  {
    start_time: "10:00",
    end_time: "10:30",
    duration: 30,
    appointment_id: "abc-123",
    appointment_date: "2026-06-03T10:00:00.000Z"
  }
]
```

**Conflict Detection:**
- Looking for exact match: `start_time: "10:00"` AND `end_time: "10:30"`
- New slots has: `start_time: "10:00"` AND `end_time: "11:00"`
- **No exact match → CONFLICT**

**Response (409):**
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot modify or remove slots with confirmed bookings. Booked slots must remain exactly as defined.",
  "conflicting_slots": [
    {
      "appointment_id": "abc-123",
      "appointment_date": "2026-06-03T10:00:00.000Z",
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

### Scenario 2: Attempt to Remove Booked Slot

**Existing Availability:**
```json
[
  { "start_time": "09:00", "end_time": "09:30" },
  { "start_time": "10:00", "end_time": "10:30" },
  { "start_time": "14:00", "end_time": "14:30" }
]
```

**Booked Appointments:**
- Patient A booked 10:00 (appointment_id: "abc-123")

**Doctor's PUT Request:**
```json
{
  "date": "2026-06-03",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "14:00", "end_time": "14:30" }
  ]
}
```

**Locked Slots:**
```javascript
[
  {
    start_time: "10:00",
    end_time: "10:30",
    duration: 30,
    appointment_id: "abc-123"
  }
]
```

**Conflict Detection:**
- Looking for: `start_time: "10:00"` AND `end_time: "10:30"`
- Not found in new slots
- **CONFLICT**

**Response (409):**
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot modify or remove slots with confirmed bookings. Booked slots must remain exactly as defined.",
  "conflicting_slots": [
    {
      "appointment_id": "abc-123",
      "appointment_date": "2026-06-03T10:00:00.000Z",
      "locked_slot": {
        "start_time": "10:00",
        "end_time": "10:30",
        "duration_minutes": 30
      },
      "reason": "Slot removed or start_time changed"
    }
  ]
}
```

---

### Scenario 3: Attempt to Change Start Time

**Existing Availability:**
```json
[
  { "start_time": "10:00", "end_time": "10:30" }
]
```

**Booked Appointments:**
- Patient A booked 10:00

**Doctor's PUT Request:**
```json
{
  "date": "2026-06-03",
  "slots": [
    { "start_time": "10:30", "end_time": "11:00" }
  ]
}
```

**Result:** 409 Conflict - locked slot `10:00-10:30` not found in new slots.

---

### Scenario 4: Valid Update (Adding Slots Around Booked Slot)

**Existing Availability:**
```json
[
  { "start_time": "10:00", "end_time": "10:30" }
]
```

**Booked Appointments:**
- Patient A booked 10:00

**Doctor's PUT Request:**
```json
{
  "date": "2026-06-03",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "10:00", "end_time": "10:30" },  // Preserved exactly
    { "start_time": "14:00", "end_time": "14:30" }
  ]
}
```

**Locked Slots:**
```javascript
[
  {
    start_time: "10:00",
    end_time: "10:30",
    appointment_id: "abc-123"
  }
]
```

**Conflict Detection:**
- Looking for: `start_time: "10:00"` AND `end_time: "10:30"`
- Found exact match in new slots
- **No conflict**

**Response (200):**
```json
{
  "success": true,
  "message": "Availability for 2026-06-03 saved successfully"
}
```

---

## What Doctors CAN Do

✅ **Add new slots** around booked slots
```json
// Before: [{ "start_time": "10:00", "end_time": "10:30" }] (booked)
// After:  [
//   { "start_time": "09:00", "end_time": "09:30" },  // NEW
//   { "start_time": "10:00", "end_time": "10:30" },  // PRESERVED
//   { "start_time": "14:00", "end_time": "14:30" }   // NEW
// ]
```

✅ **Remove unbooked slots**
```json
// Before: [
//   { "start_time": "09:00", "end_time": "09:30" },  // unbooked
//   { "start_time": "10:00", "end_time": "10:30" }   // booked
// ]
// After: [
//   { "start_time": "10:00", "end_time": "10:30" }   // PRESERVED
// ]
```

✅ **Modify unbooked slots**
```json
// Before: [
//   { "start_time": "09:00", "end_time": "09:30" },  // unbooked
//   { "start_time": "10:00", "end_time": "10:30" }   // booked
// ]
// After: [
//   { "start_time": "09:00", "end_time": "10:00" },  // MODIFIED (was 09:30)
//   { "start_time": "10:00", "end_time": "10:30" }   // PRESERVED
// ]
```

---

## What Doctors CANNOT Do

❌ **Change booked slot duration**
```json
// Before: { "start_time": "10:00", "end_time": "10:30" } (booked)
// After:  { "start_time": "10:00", "end_time": "11:00" }  // REJECTED
```

❌ **Change booked slot start time**
```json
// Before: { "start_time": "10:00", "end_time": "10:30" } (booked)
// After:  { "start_time": "10:30", "end_time": "11:00" }  // REJECTED
```

❌ **Change booked slot end time**
```json
// Before: { "start_time": "10:00", "end_time": "10:30" } (booked)
// After:  { "start_time": "10:00", "end_time": "10:45" }  // REJECTED
```

❌ **Remove booked slot**
```json
// Before: [
//   { "start_time": "10:00", "end_time": "10:30" }  // booked
// ]
// After: []  // REJECTED
```

---

## Frontend Integration

### Recommended UI Flow

1. **Fetch availability for date:**
   ```
   GET /api/doctor/date-availability?start_date=2026-06-03&end_date=2026-06-03
   ```

2. **Fetch booked appointments for date:**
   ```
   GET /api/appointment/my
   ```
   Filter by date and status != 'cancelled'

3. **Mark booked slots as locked in UI:**
   - Disable editing for locked slots
   - Show visual indicator (lock icon, different color)
   - Show appointment details on hover

4. **On save, if 409 received:**
   - Parse `conflicting_slots` array
   - Highlight the locked slots that were modified
   - Show error message with appointment IDs
   - Suggest: "These slots have confirmed appointments and cannot be changed"

---

## Error Response Structure

```typescript
interface BookedSlotConflictError {
  success: false;
  error: "BOOKED_SLOTS_CONFLICT";
  message: string;
  conflicting_slots: Array<{
    appointment_id: string;
    appointment_date: string;  // ISO timestamp
    locked_slot: {
      start_time: string;      // "HH:mm"
      end_time: string;        // "HH:mm"
      duration_minutes: number;
    };
    reason: "Slot removed or start_time changed" | "Slot duration or end_time changed";
  }>;
}
```

---

## Benefits of Strict Protection

1. **Patient Trust:** Booked appointments stay exactly as confirmed
2. **No Confusion:** Duration can't change after booking
3. **Simple Logic:** Easy to understand and implement
4. **No Schema Changes:** Works with existing database
5. **Clear Errors:** Frontend knows exactly which slots are locked and why

---

## Future Enhancements (Post-MVP)

- Allow doctor to request appointment rescheduling (requires patient approval)
- Store booked slot duration in appointment table for explicit tracking
- Add "force override" with automatic patient notification
- Audit log for all availability changes
