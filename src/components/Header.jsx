import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, IconButton, InputAdornment, Checkbox, FormControlLabel, Menu, MenuItem, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { auth } from '../lib/firebase';
import { signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from 'firebase/auth';
import { ensureUserProfile, createProfileWithUsername, checkUsernameAvailable, getUserProfile } from '../lib/userProfile';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const Header = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [authOpen, setAuthOpen] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [signupUsername, setSignupUsername] = useState('');
    const [usernameCheck, setUsernameCheck] = useState({ checking: false, available: null });
    const [rememberMe, setRememberMe] = useState(true);
    const [signOutOpen, setSignOutOpen] = useState(false);

    const [menuAnchor, setMenuAnchor] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                try {
                    if (u.isAnonymous) {
                        setProfile({ username: `user_${u.uid.slice(0, 6)}` });
                    } else {
                        // First try to read the existing profile to avoid creating default during sign-up race
                        let p = await getUserProfile(u.uid);
                        if (!p) {
                            // Briefly wait to allow sign-up flow to write chosen username
                            await new Promise((r) => setTimeout(r, 300));
                            p = await getUserProfile(u.uid);
                        }
                        if (!p) {
                            p = await ensureUserProfile(u);
                        }
                        setProfile(p);
                    }
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to load/create profile', err);
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }
        });
        return () => unsub();
    }, []);

    const openMenu = (e) => setMenuAnchor(e.currentTarget);
    const closeMenu = () => setMenuAnchor(null);

    const handleSignOut = async () => {
        setSignOutOpen(true);
        closeMenu();
    };
    const confirmSignOut = async () => {
        await signOut(auth);
        setSignOutOpen(false);
    };
    const cancelSignOut = () => setSignOutOpen(false);

    const handleOpenAuth = () => {
        setAuthOpen(true);
        setAuthError('');
        setAuthSuccess('');
    };
    const handleCloseAuth = () => {
        if (!authLoading) {
            setAuthOpen(false);
            setEmail('');
            setPassword('');
            setIsSignUp(false);
            setAuthError('');
            setAuthSuccess('');
        }
    };

    const handleSubmitAuth = async () => {
        try {
            setAuthLoading(true);
            setAuthError('');
            setAuthSuccess('');
            // Set persistence based on Remember Me
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            if (isSignUp) {
                const username = signupUsername.trim();
                if (username.length < 3) {
                    throw { code: 'app/username-too-short', message: 'Username must be at least 3 characters.' };
                }
                const available = await checkUsernameAvailable(username);
                if (!available) {
                    throw { code: 'app/username-taken', message: 'That username is taken.' };
                }
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                const created = await createProfileWithUsername(cred.user, username);
                setProfile(created);
            } else {
                const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
                const p = await getUserProfile(cred.user.uid) || await ensureUserProfile(cred.user);
                setProfile(p);
            }
            handleCloseAuth();
        } catch (e) {
            const code = e?.code || '';
            let message = e?.message || 'Authentication failed';
            if (isSignUp && code === 'auth/email-already-in-use') {
                message = 'This email is already registered. Try signing in instead.';
            } else if (isSignUp && (code === 'app/username-taken' || code === 'app/username-too-short')) {
                message = e.message;
            } else if (!isSignUp && code === 'auth/invalid-credential') {
                message = 'Incorrect email or password.';
            } else if (!isSignUp && code === 'auth/user-not-found') {
                message = 'No account found for this email.';
            } else if (!isSignUp && code === 'auth/wrong-password') {
                message = 'Incorrect password.';
            }
            setAuthError(message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            setAuthError('');
            setAuthSuccess('');
            const target = email.trim();
            if (!target) {
                setAuthError('Enter your email to receive a reset link.');
                return;
            }
            await sendPasswordResetEmail(auth, target);
            setAuthSuccess('Password reset email sent. Check your inbox.');
        } catch (e) {
            const code = e?.code || '';
            let message = 'Failed to send reset email.';
            if (code === 'auth/user-not-found') message = 'No account found for this email.';
            if (code === 'auth/invalid-email') message = 'Please enter a valid email address.';
            setAuthError(message);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 3,
                gap: 2,
            }}
        >
            {/* Left: Brand */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyboardIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
                <Typography variant="h1" sx={{ fontSize: '1.6rem', fontWeight: 700, color: 'primary.main', letterSpacing: '-0.02em' }}>
                    NeonType
                </Typography>
            </Box>

            {/* Middle: Nav */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, justifyContent: 'center' }}>
                <Button component={RouterLink} to="/" size="small" variant="text">Home</Button>
                <Button component={RouterLink} to="/leaderboard" size="small" variant="text">Leaderboard</Button>
                <Button component={RouterLink} to="/stats" size="small" variant="text">Stats</Button>
                <Button component={RouterLink} to="/multiplayer" size="small" variant="text">Multiplayer</Button>
            </Box>

            {/* Right: Auth/Profile */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                {user ? (
                    <>
                        <Box
                            onMouseEnter={openMenu}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                        >
                            <Avatar sx={{ width: 32, height: 32 }}>{(profile?.username?.[0] || 'U').toUpperCase()}</Avatar>
                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                @{profile?.username || 'user'}
                            </Typography>
                            <ArrowDropDownIcon sx={{ color: 'text.secondary' }} />
                        </Box>
                        <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={closeMenu}
                            MenuListProps={{ onMouseLeave: closeMenu }}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <MenuItem component={RouterLink} to="/stats" onClick={closeMenu}>View stats</MenuItem>
                            <Divider />
                            <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>Sign out</MenuItem>
                        </Menu>
                    </>
                ) : (
                    <Button variant="contained" size="small" onClick={handleOpenAuth}>
                        Sign in
                    </Button>
                )}
            </Box>

            {/* Auth Dialog */}
            <Dialog open={authOpen} onClose={handleCloseAuth} fullWidth maxWidth="xs">
                <DialogTitle>{isSignUp ? 'Create account' : 'Sign in'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    {authError && <Alert severity="error">{authError}</Alert>}
                    {authSuccess && <Alert severity="success">{authSuccess}</Alert>}
                    {isSignUp && (
                        <TextField
                            label="Username"
                            value={signupUsername}
                            onChange={(e) => setSignupUsername(e.target.value)}
                            fullWidth
                            helperText={signupUsername && usernameCheck.available === false ? 'Username not available' : '3-20 chars, letters/numbers/underscore'}
                            onBlur={async () => {
                                if (!signupUsername) return;
                                setUsernameCheck({ checking: true, available: null });
                                try {
                                    const ok = await checkUsernameAvailable(signupUsername);
                                    setUsernameCheck({ checking: false, available: ok });
                                } catch {
                                    setUsernameCheck({ checking: false, available: null });
                                }
                            }}
                        />
                    )}
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        autoFocus
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword((v) => !v)} edge="end">
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    {!isSignUp && (
                        <Button variant="text" size="small" onClick={handleResetPassword} sx={{ alignSelf: 'flex-start', mt: -1 }}>
                            Forgot password?
                        </Button>
                    )}
                    <FormControlLabel
                        control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
                        label="Remember me on this device"
                        sx={{ alignSelf: 'flex-start' }}
                    />
                    <Button variant="text" onClick={() => { setIsSignUp((v) => !v); setAuthError(''); setAuthSuccess(''); }} sx={{ alignSelf: 'flex-start' }}>
                        {isSignUp ? 'Have an account? Sign in' : "Don't have an account? Sign up"}
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAuth} disabled={authLoading}>Cancel</Button>
                    <Button onClick={handleSubmitAuth} variant="contained" disabled={authLoading || !email || !password || (isSignUp && (!signupUsername || usernameCheck.available === false))}>
                        {isSignUp ? 'Sign up' : 'Sign in'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Sign-out confirmation */}
            <Dialog open={signOutOpen} onClose={cancelSignOut} fullWidth maxWidth="xs">
                <DialogTitle>Sign out</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Are you sure you want to sign out?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelSignOut}>Cancel</Button>
                    <Button onClick={confirmSignOut} variant="contained" color="error">Sign out</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Header; 