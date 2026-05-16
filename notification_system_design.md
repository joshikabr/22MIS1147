# Notification System Design

## Stage 1

A colleague asked me to put together the API design for the campus notification platform. Here's what I came up with.

### What the platform needs to support

Basically three main things: students need to be able to get their notifications (unread first), mark individual ones as read, and get new ones in real time without having to refresh the page.

### API Endpoints

**GET /api/v1/notifications**

Fetches a paginated list of notifications for the logged in student.

Headers:
```
Authorization: Bearer <token>
```

Query params: `page`, `limit`, `status` (unread/all), `notification_type`

Response:
```json
{
  "data": [
    {
      "id": "1cfce5ee-ad37-4894-8946-d707627176a5",
      "type": "Event",
      "message": "tech-fest",
      "timestamp": "2026-04-22 17:50:06",
      "is_read": false
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5
  }
}
```

**PATCH /api/v1/notifications/:id/read**

Marks a single notification as read. Returns 204 with no body.

**PATCH /api/v1/notifications/read-all**

Marks everything as read for the student.

### Real-Time

For real-time delivery I'd go with **Server-Sent Events (SSE)**. The reason is that notifications only flow one way (server to client), so WebSockets would be overkill. SSE works over a normal HTTP connection and browsers reconnect automatically if the connection drops. The endpoint would be something like `GET /api/v1/notifications/stream` and the server pushes events whenever a new notification comes in.

---

## Stage 2

### DB Choice

I'd go with **PostgreSQL**. Notifications have a clear structure (type, message, timestamp, read status) and we need to reliably track the `is_read` state per student — that needs ACID guarantees. A NoSQL option like MongoDB would work too but the relational model fits better here since we're already joining students and notifications.

### Schema

```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### What happens as data grows

With 50k students getting notifications constantly, the table is going to grow really fast. The main issue will be read-heavy queries slowing down — especially fetching unread counts on every page load. 

A few things I'd do:
- Add proper composite indexes on columns used in WHERE clauses (more on this in Stage 3)
- Use read replicas to offload the read traffic from the primary DB
- Partition the notifications table by month using PostgreSQL's table partitioning, so old data doesn't slow down queries on recent ones

### Queries based on Stage 1 API

Fetch unread notifications for a student:
```sql
SELECT * FROM notifications
WHERE student_id = $1 AND is_read = false
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

Mark one as read:
```sql
UPDATE notifications SET is_read = true WHERE id = $1 AND student_id = $2;
```

---

## Stage 3

### Is the query accurate?

```sql
SELECT * FROM notifications WHERE studentId = 1042 AND isRead = false ORDER BY createdAt ASC;
```

Yes, the query is logically correct. It gets all unread notifications for student 1042 in order. The issue is performance, not correctness.

### Why is it slow?

At 5 million rows, without an index on `studentId`, Postgres does a full sequential scan of the entire table every time. Then it has to filter down to the rows for student 1042, keep only unread ones, and sort them. Each step is expensive at that scale.

### Indexing every column — is that a good idea?

No. Indexing every column sounds safe but it actually hurts more than it helps. Every write (INSERT or UPDATE) has to update all those indexes too, which slows things down significantly. And indexes on something like `isRead` (which only has two values) won't really help the query planner since the selectivity is too low. You'd end up with a lot of wasted storage and slower writes for minimal gain on reads.

The right move is a targeted composite index:

```sql
CREATE INDEX idx_notifications_student_unread ON notifications (student_id, is_read, created_at);
```

This index covers the WHERE clause and the ORDER BY in one shot. Query time goes from O(N) table scan to O(log N) index lookup.

### Students who got a placement notification in the last 7 days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### The problem

Fetching from the DB on every page load is too expensive. With 50k students all hitting the app at once (especially after placements get announced), the DB will get hammered.

### What I'd suggest

**Option 1 — Redis cache**: Cache each student's unread notifications and unread count in Redis with a short TTL. On page load, check cache first. Only hit the DB on a cache miss or after the TTL expires. Cache key would be something like `notifications:unread:{studentId}`.

Tradeoff: Much faster reads, but cache invalidation is tricky. If a new notification comes in, we need to invalidate or update that student's cache entry immediately. If we get this wrong, students see stale data.

**Option 2 — Switch to push-based delivery**: Instead of fetching on page load, establish an SSE/WebSocket connection when the student opens the app. The server pushes new notifications directly. The initial load fetches from DB once and after that everything is event-driven.

Tradeoff: This nearly eliminates polling completely, but keeping persistent connections open for 50k concurrent students requires careful infrastructure (connection limits, load balancer config, etc.).

Realistically I'd combine both — use Redis for the initial load and SSE for real-time delivery so the DB is barely touched during normal usage.

---

## Stage 5

### Problems with the current pseudocode

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

A few issues:

1. It's synchronous and sequential. Looping through 50k students one by one, calling an email API each time, is going to take way too long and the HTTP request will time out.

2. If `send_email` fails at student 200, the whole thing stops. The remaining 49,800 students never get notified and there's no way to easily retry just the failed ones.

3. Email sending and DB inserts are coupled together. External email APIs are slow and can fail. Tying the DB write to that means a slow email provider blocks the entire notification for that student.

### Should DB save and email happen together?

No. The DB insert is fast and internal. The email send is a call to an external service that can be slow or fail. If we couple them and the email fails, we'd have to roll back the DB entry too — which creates more complexity. Better to treat them as separate concerns.

### Redesigned approach

Use a message queue (Redis BullMQ, RabbitMQ, SQS etc). The API handler just batches the DB inserts and enqueues tasks for email. Workers consume those tasks independently and handle retries on their own.

```python
function notify_all(student_ids: array, message: string):
    batch_save_to_db(student_ids, message)

    for student_id in student_ids:
        enqueue("email_notification", { student_id, message })

    return "queued"


# worker
function process_job(job):
    try:
        send_email(job.student_id, job.message)
        push_to_app(job.student_id, job.message)
        mark_job_done(job)
    except Exception as e:
        log_error(e)
        retry_with_backoff(job)
```

If `send_email` fails for 200 students, the queue retries just those jobs. The other 49,800 are already done. The DB state is consistent regardless since we saved everything upfront.

---

## Stage 6

### Priority Inbox Approach

The requirement is to always show the top N most important unread notifications. Priority is based on type weight (Placement > Result > Event) and then by recency if the types are the same.

I implemented this using a **min-heap of size k** (where k = 10). The idea is:

As each notification comes in from the API, I push it into the heap. The heap only ever holds the top k items. The root of the min-heap is always the least important item currently in the top 10. If a new notification has higher priority than the root, I replace the root and re-heapify. Otherwise I ignore it.

This runs in O(log k) per notification which is much better than sorting everything each time a new notification arrives. Since k is small (10, 15, etc.), it's essentially constant time.

The weights I used:
- Placement → 3
- Result → 2  
- Event → 1

If two notifications have the same weight, the newer one wins.

The actual implementation is in `notification_app_be/src/index.ts`.
