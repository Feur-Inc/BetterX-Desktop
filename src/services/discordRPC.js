import DiscordRPC from 'discord-rpc';

const clientId = '1339350764929290270';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
let isConnected = false;
let startTimestamp = null;

// Track last activity to avoid duplicate updates
let lastActivity = null;

export async function initializeDiscordRPC() {
    if (isConnected) return;

    try {
        rpc.on('ready', () => {
            console.log('Discord RPC connected');
            isConnected = true;
            startTimestamp = new Date();
            setDefaultActivity();
        });

        rpc.on('disconnected', () => {
            console.log('Discord RPC disconnected');
            isConnected = false;
        });

        // Login to Discord
        await rpc.login({ clientId });
    } catch {
        console.log("Could not connect to Discord RPC. Make sure Discord is running.");
        isConnected = false;
    }
}

export function destroyDiscordRPC() {
    if (!isConnected) return;
    
    try {
        rpc.destroy();
        isConnected = false;
        startTimestamp = null;
        console.log('Discord RPC destroyed');
    } catch (error) {
        console.error('Error destroying Discord RPC:', error);
    }
}

export function setDefaultActivity() {
    if (!isConnected) return;

    updateActivity('Browsing X', 'Using BetterX Desktop');
}

export function updateActivity(details, state) {
    if (!isConnected) return;
    
    // Don't reinitialize the timestamp on updates to keep accurate session time
    if (!startTimestamp) {
        startTimestamp = new Date();
    }

    // Ensure details and state are strings and not too long
    details = String(details || 'Browsing X').substring(0, 128);
    state = String(state || 'Using BetterX Desktop').substring(0, 128);
    
    // Skip if activity hasn't changed
    const activityString = `${details}|${state}`;
    if (activityString === lastActivity) {
        return;
    }
    
    lastActivity = activityString;

    try {
        rpc.setActivity({
            details,
            state,
            startTimestamp,
            largeImageKey: 'betterx_logo',
            largeImageText: 'BetterX Desktop',
            buttons: [
                { label: 'Get BetterX', url: 'https://github.com/Feur-Inc/BetterX-Desktop' }
            ]
        });
    } catch (error) {
        console.error('Error updating Discord activity:', error);
    }
}

// Helper function to check if RPC is connected
export function isRPCConnected() {
    return isConnected;
}
