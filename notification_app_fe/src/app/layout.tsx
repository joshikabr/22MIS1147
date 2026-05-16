"use client";
import { AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import StarIcon from '@mui/icons-material/Star';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { initLogger, Log } from 'logging_middleware';

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
    },
    background: {
      default: '#f5f5f5',
    }
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  }
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_AFFORDMED_TOKEN || '';
    initLogger(token);
    
    Log('frontend', 'info', 'page', `Navigated to ${pathname}`);
  }, [pathname]);

  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
              <Toolbar>
                <Typography variant="h6" noWrap component="div">
                  Campus Notifications
                </Typography>
              </Toolbar>
            </AppBar>
            <Drawer
              variant="permanent"
              sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
              }}
            >
              <Toolbar />
              <Box sx={{ overflow: 'auto' }}>
                <List>
                  <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
                    <ListItem disablePadding>
                      <ListItemButton selected={pathname === '/'}>
                        <ListItemIcon>
                          <InboxIcon color={pathname === '/' ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="All Notifications" />
                      </ListItemButton>
                    </ListItem>
                  </Link>
                  <Link href="/priority" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
                    <ListItem disablePadding>
                      <ListItemButton selected={pathname === '/priority'}>
                        <ListItemIcon>
                          <StarIcon color={pathname === '/priority' ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary="Priority Inbox" />
                      </ListItemButton>
                    </ListItem>
                  </Link>
                </List>
              </Box>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Toolbar />
              {children}
            </Box>
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}
