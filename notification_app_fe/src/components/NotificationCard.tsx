import { Card, CardContent, Typography, Chip, Box, Badge } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

export interface Notification {
    ID: string;
    Type: 'Placement' | 'Result' | 'Event';
    Message: string;
    Timestamp: string;
}

interface Props {
    notification: Notification;
    isNew: boolean;
    onClick: () => void;
}

export const NotificationCard = ({ notification, isNew, onClick }: Props) => {
    const getIcon = () => {
        switch (notification.Type) {
            case 'Placement': return <BusinessCenterIcon fontSize="small" />;
            case 'Result': return <AssignmentTurnedInIcon fontSize="small" />;
            case 'Event': return <EventIcon fontSize="small" />;
            default: return null;
        }
    };

    const getColor = () => {
        switch (notification.Type) {
            case 'Placement': return 'error';
            case 'Result': return 'warning';
            case 'Event': return 'info';
            default: return 'default';
        }
    };

    return (
        <Card 
            sx={{ 
                mb: 2, 
                cursor: 'pointer',
                bgcolor: isNew ? 'rgba(46, 125, 50, 0.04)' : 'background.paper',
                transition: '0.2s',
                '&:hover': {
                    boxShadow: 3
                }
            }}
            onClick={onClick}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Badge color="primary" variant="dot" invisible={!isNew}>
                            <Chip 
                                icon={getIcon()} 
                                label={notification.Type} 
                                size="small" 
                                color={getColor()} 
                            />
                        </Badge>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        {new Date(notification.Timestamp).toLocaleString()}
                    </Typography>
                </Box>
                <Typography variant="body1" sx={{ fontWeight: isNew ? 'bold' : 'normal' }}>
                    {notification.Message}
                </Typography>
            </CardContent>
        </Card>
    );
};
