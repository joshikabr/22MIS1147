"use client";
import { useEffect, useState } from 'react';
import { Typography, Container, Box, CircularProgress } from '@mui/material';
import axios from 'axios';
import { NotificationCard, Notification } from '@/components/NotificationCard';
import { Log } from 'logging_middleware';

export default function PriorityNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load read state from localStorage
    const stored = localStorage.getItem('affordmed_read_notifications');
    if (stored) {
      setReadIds(new Set(JSON.parse(stored)));
    }
  }, []);

  useEffect(() => {
    const fetchPriority = async () => {
      setLoading(true);
      try {
        // Fetch computed top 10 from our backend
        const res = await axios.get('http://localhost:8000/api/v1/priority-inbox', {
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AFFORDMED_TOKEN || 'dummy'}`
            }
        });
        
        setNotifications(res.data.priority_notifications || []);
        Log('frontend', 'info', 'page', `Successfully loaded priority inbox with ${res.data.priority_notifications?.length} items`);
      } catch (error: any) {
        Log('frontend', 'error', 'page', `Failed to fetch priority notifications: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPriority();
  }, []);

  const handleMarkAsRead = (id: string) => {
    const updated = new Set(readIds).add(id);
    setReadIds(updated);
    localStorage.setItem('affordmed_read_notifications', JSON.stringify(Array.from(updated)));
    Log('frontend', 'info', 'component', `User marked priority notification ${id} as read`);
  };

  return (
    <Container maxWidth="md">
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" color="primary">Priority Inbox</Typography>
        <Typography variant="subtitle1" color="text.secondary">Top 10 most critical updates requiring your attention.</Typography>
      </Box>

      {loading && <Box display="flex" justifyContent="center" m={2}><CircularProgress /></Box>}
      
      {!loading && notifications.length === 0 && (
        <Typography variant="body1" color="text.secondary" align="center">No priority notifications.</Typography>
      )}

      {notifications.map((notif, index) => (
        <Box key={notif.ID} position="relative">
          {/* Visual indicator of rank */}
          <Box position="absolute" left={-40} top={20} display={{ xs: 'none', sm: 'block' }}>
            <Typography variant="h6" color="text.disabled" fontWeight="bold">#{index + 1}</Typography>
          </Box>
          <NotificationCard 
            notification={notif} 
            isNew={!readIds.has(notif.ID)}
            onClick={() => handleMarkAsRead(notif.ID)}
          />
        </Box>
      ))}
    </Container>
  );
}
