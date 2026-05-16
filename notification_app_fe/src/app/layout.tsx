"use client";
import {
  AppBar, Toolbar, Typography, Box, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, CssBaseline,
  ThemeProvider, createTheme, IconButton, useMediaQuery, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import InboxIcon from '@mui/icons-material/Inbox';
import StarIcon from '@mui/icons-material/Star';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

function NavDrawer({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const links = [
    { href: '/', label: 'All Notifications', icon: <InboxIcon /> },
    { href: '/priority', label: 'Priority Inbox', icon: <StarIcon /> },
  ];

  const content = (
    <Box sx={{ overflow: 'auto', pt: 1 }}>
      <List>
        {links.map(({ href, label, icon }) => (
          <Link key={href} href={href} passHref style={{ textDecoration: 'none', color: 'inherit' }}>
            <ListItem disablePadding onClick={isMobile ? onClose : undefined}>
              <ListItemButton selected={pathname === href}>
                <ListItemIcon sx={{ color: pathname === href ? 'primary.main' : 'inherit' }}>
                  {icon}
                </ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            </ListItem>
          </Link>
        ))}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' } }}
      >
        <Toolbar />
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      {content}
    </Drawer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
              <Toolbar>
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={() => setMobileOpen(true)}
                  sx={{ mr: 2, display: { sm: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div">
                  Campus Notifications
                </Typography>
              </Toolbar>
            </AppBar>

            <NavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={pathname} />

            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: { xs: 2, sm: 3 },
                width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` }
              }}
            >
              <Toolbar />
              {children}
            </Box>
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}
