"use client";
import { useEffect, useState } from 'react';
import { Typography, Container, Select, MenuItem, FormControl, InputLabel, Box, CircularProgress, Button } from '@mui/material';
import axios from 'axios';
import { NotificationCard, Notification } from '@/components/NotificationCard';
import { Log } from 'logging_middleware';

export default function AllNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Local state to track read notifications
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load read state from localStorage
    const stored = localStorage.getItem('affordmed_read_notifications');
    if (stored) {
      setReadIds(new Set(JSON.parse(stored)));
    }
  }, []);

  const fetchNotifications = async (pageNum: number, typeFilter: string, isAppend: boolean = false) => {
    setLoading(true);
    try {
      // We will route this through our backend to avoid CORS from directly hitting the Affordmed API from browser
      let url = `http://localhost:8000/api/v1/notifications?limit=10&page=${pageNum}`;
      if (typeFilter) {
        url += `&notification_type=${typeFilter}`;
      }

      const res = await axios.get(url, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AFFORDMED_TOKEN || 'dummy'}`
        }
      });
      
      const newNotifs = res.data.notifications || [];
      if (isAppend) {
        setNotifications(prev => [...prev, ...newNotifs]);
      } else {
        setNotifications(newNotifs);
      }
      
      // If we got fewer than limit, or no pagination info, assume end
      if (newNotifs.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (error: any) {
      Log('frontend', 'error', 'page', `Failed to fetch notifications: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, filter, false);
    setPage(1);
  }, [filter]);

  const handleMarkAsRead = (id: string) => {
    const updated = new Set(readIds).add(id);
    setReadIds(updated);
    localStorage.setItem('affordmed_read_notifications', JSON.stringify(Array.from(updated)));
    Log('frontend', 'info', 'component', `User marked notification ${id} as read`);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, filter, true);
  };

  return (
    <Container maxWidth="md">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">All Notifications</Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter Type</InputLabel>
          <Select
            value={filter}
            label="Filter Type"
            onChange={(e) => setFilter(e.target.value)}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value="Placement">Placement</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {notifications.map(notif => (
        <NotificationCard 
          key={notif.ID} 
          notification={notif} 
          isNew={!readIds.has(notif.ID)}
          onClick={() => handleMarkAsRead(notif.ID)}
        />
      ))}

      {loading && <Box display="flex" justifyContent="center" m={2}><CircularProgress /></Box>}
      
      {!loading && notifications.length === 0 && (
        <Typography variant="body1" color="text.secondary" align="center">No notifications found.</Typography>
      )}

      {!loading && hasMore && notifications.length > 0 && (
        <Box display="flex" justifyContent="center" m={3}>
          <Button variant="outlined" onClick={loadMore}>Load More</Button>
        </Box>
      )}
    </Container>
  );
}
