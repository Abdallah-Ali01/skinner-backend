# Booking Conflict Detection Queries

## Query Used in Both PUT and DELETE

### SQL Query
```sql
SELECT appointment_id, date 
FROM appointment 
WHERE medical_syndicate_id_card = $1 
  AND date::date = $2::date 
  AND status != 'cancelled'
```

### Parameters
- `$1` = `doctorId` (medical_syndicate_id_card from JWT token)
- `$2` = `dateStr` (YYYY-MM-DD format, e.g., "2026-06-03")

### What It Does
1. Finds all appointments for the specific doctor
2. On the specific date (using PostgreSQL date casting)
3. That are NOT cancelled (includes: pending_payment, confirmed, completed)

### Result Processing

#### Step 1: Extract Booked Times
```javascript
const bookedTimes = new Set(
  bookedAppointments.rows.map((row) => {
    const d = new Date(row.date);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;  // e.g., "10:00", "14:30"
  })
);
```

#### Step 2: Compare with New Slots (PUT only)
```javascript
const newSlotTimes = new Set(slots.map((s) => s.start_time));

const conflictingAppointments = [];
for (const row of bookedAppointments.rows) {
  const d = new Date(row.date);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const bookedTime = `${h}:${m}`;

  if (!newSlotTimes.has(bookedTime)) {
    conflictingAppointments.push({
      appointment_id: row.appointment_id,
      time: bookedTime,
      date: row.date
    });
  }
}
```

#### Step 3: For DELETE
All booked appointments are conflicts (since all slots are being removed).

```javascript
const conflictingAppointments = bookedAppointments.rows.map((row) => {
  const d = new Date(row.date);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return {
    appointment_id: row.appointment_id,
    time: `${h}:${m}`,
    date: row.date
  };
});
```

---

## Example Scenarios

### Scenario 1: PUT with Booking Conflict

**Existing Availability:**
- 09:00 - 09:30
- 10:00 - 10:30
- 14:00 - 14:30

**Existing Bookings:**
- Patient A booked 10:00 (appointment_id: "abc-123")

**New PUT Request:**
```json
{
  "date": "2026-06-03",
  "slots": [
    { "start_time": "09:00", "end_time": "09:30" },
    { "start_time": "14:00", "end_time": "14:30" }
  ]
}
```

**Query Result:**
```javascript
[
  {
    appointment_id: "abc-123",
    date: "2026-06-03T10:00:00.000Z"
  }
]
```

**Conflict Detection:**
- Booked time: `10:00`
- New slot times: `["09:00", "14:00"]`
- `10:00` is NOT in new slots → **CONFLICT**

**Response (409):**
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot remove slots with confirmed bookings",
  "conflicting_appointments": [
    {
      "appointment_id": "abc-123",
      "time": "10:00",
      "date": "2026-06-03T10:00:00.000Z"
    }
  ]
}
```

---

### Scenario 2: DELETE with Booking Conflict

**Existing Bookings:**
- Patient A booked 10:00 (appointment_id: "abc-123")
- Patient B booked 14:00 (appointment_id: "def-456")

**DELETE Request:**
```
DELETE /api/doctor/date-availability/2026-06-03
```

**Query Result:**
```javascript
[
  {
    appointment_id: "abc-123",
    date: "2026-06-03T10:00:00.000Z"
  },
  {
    appointment_id: "def-456",
    date: "2026-06-03T14:00:00.000Z"
  }
]
```

**Response (409):**
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot remove availability: confirmed appointments exist",
  "conflicting_appointments": [
    {
      "appointment_id": "abc-123",
      "time": "10:00",
      "date": "2026-06-03T10:00:00.000Z"
    },
    {
      "appointment_id": "def-456",
      "time": "14:00",
      "date": "2026-06-03T14:00:00.000Z"
    }
  ]
}
```

---

### Scenario 3: PUT with Empty Slots (Day-Off) with Bookings

**Existing Bookings:**
- Patient A booked 10:00 (appointment_id: "abc-123")

**PUT Request:**
```json
{
  "date": "2026-06-03",
  "slots": []
}
```

**Query Result:**
```javascript
[
  {
    appointment_id: "abc-123",
    date: "2026-06-03T10:00:00.000Z"
  }
]
```

**Response (409):**
```json
{
  "success": false,
  "error": "BOOKED_SLOTS_CONFLICT",
  "message": "Cannot mark day as unavailable: confirmed appointments exist",
  "conflicting_appointments": [
    {
      "appointment_id": "abc-123",
      "time": "10:00",
      "date": "2026-06-03T10:00:00.000Z"
    }
  ]
}
```

---

## Why This Query Works

1. **Date Casting:** `date::date = $2::date` ensures we match the entire day, regardless of time
2. **Status Filter:** `status != 'cancelled'` includes all active bookings (pending_payment, confirmed, completed)
3. **Doctor Specific:** `medical_syndicate_id_card = $1` ensures we only check this doctor's appointments
4. **Minimal Data:** Only fetches `appointment_id` and `date` (efficient)

---

## Performance Considerations

### Index Recommendation
```sql
CREATE INDEX idx_appointment_doctor_date_status 
ON appointment (medical_syndicate_id_card, date, status);
```

This index will make the conflict check query very fast, even with thousands of appointments.

### Query Complexity
- **Time Complexity:** O(n) where n = number of appointments on that date for that doctor
- **Typical n:** 10-20 appointments per day per doctor
- **Performance:** Sub-millisecond on indexed table
