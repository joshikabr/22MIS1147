import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { Log, initLogger } from 'logging_middleware';

const app = express();
app.use(cors());
app.use(express.json());

initLogger(process.env.AFFORDMED_TOKEN || '');

interface Notification {
    ID: string;
    Type: 'Placement' | 'Result' | 'Event';
    Message: string;
    Timestamp: string;
}

const WEIGHTS: Record<string, number> = {
    'Placement': 3,
    'Result': 2,
    'Event': 1
};

const hasHigherPriority = (a: Notification, b: Notification): boolean => {
    if (WEIGHTS[a.Type] !== WEIGHTS[b.Type]) {
        return WEIGHTS[a.Type] > WEIGHTS[b.Type];
    }
    return new Date(a.Timestamp).getTime() > new Date(b.Timestamp).getTime();
};

class MinHeap {
    private heap: Notification[] = [];
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    push(item: Notification) {
        if (this.heap.length < this.maxSize) {
            this.heap.push(item);
            this.bubbleUp(this.heap.length - 1);
        } else if (hasHigherPriority(item, this.heap[0])) {
            this.heap[0] = item;
            this.bubbleDown(0);
        }
    }

    getSorted(): Notification[] {
        return [...this.heap].sort((a, b) => hasHigherPriority(a, b) ? -1 : 1);
    }

    private bubbleUp(index: number) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (hasHigherPriority(this.heap[index], this.heap[parentIndex])) break;
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    private bubbleDown(index: number) {
        const length = this.heap.length;
        while (true) {
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            let smallest = index;

            if (left < length && hasHigherPriority(this.heap[smallest], this.heap[left])) smallest = left;
            if (right < length && hasHigherPriority(this.heap[smallest], this.heap[right])) smallest = right;

            if (smallest === index) break;
            this.swap(index, smallest);
            index = smallest;
        }
    }

    private swap(i: number, j: number) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
}

const AFFORDMED_API = 'http://4.224.186.213/evaluation-service/notifications';

async function fetchFromAPI(type?: string): Promise<Notification[]> {
    const token = process.env.AFFORDMED_TOKEN || '';
    const url = type ? `${AFFORDMED_API}?notification_type=${type}` : AFFORDMED_API;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data.notifications || [];
}

app.get('/api/v1/priority-inbox', async (req: Request, res: Response) => {
    try {
        Log('backend', 'info', 'route', 'GET /api/v1/priority-inbox');

        const notifications = await fetchFromAPI();
        Log('backend', 'info', 'service', `Fetched ${notifications.length} items`);

        const heap = new MinHeap(10);
        for (const n of notifications) heap.push(n);

        res.status(200).json({ priority_notifications: heap.getSorted() });
    } catch (error: any) {
        Log('backend', 'error', 'handler', 'priority-inbox failed');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/v1/notifications', async (req: Request, res: Response) => {
    try {
        Log('backend', 'info', 'route', 'GET /api/v1/notifications');

        const limit = parseInt(req.query.limit as string) || 10;
        const page = parseInt(req.query.page as string) || 1;
        const notification_type = req.query.notification_type as string | undefined;

        // Affordmed API doesn't support limit/page — fetch and paginate ourselves
        const all = await fetchFromAPI(notification_type);

        const start = (page - 1) * limit;
        const paginated = all.slice(start, start + limit);
        const total_pages = Math.ceil(all.length / limit);

        Log('backend', 'info', 'service', `Returning page ${page}/${total_pages}`);

        res.status(200).json({
            notifications: paginated,
            pagination: { current_page: page, total_pages, total: all.length }
        });
    } catch (error: any) {
        Log('backend', 'error', 'handler', 'notifications fetch failed');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
