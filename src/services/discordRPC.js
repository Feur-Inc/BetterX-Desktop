import DiscordRPC from 'discord-rpc';

const clientId = '1339350764929290270'; // Replace with your Discord application ID
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
let isConnected = false;

export async function initializeDiscordRPC() {
    if (isConnected) return;

    try {
        await rpc.connect(clientId);
        isConnected = true;
        setDefaultActivity();
    } catch (error) {
        console.error('Failed to connect to Discord:', error);
    }
}

export function destroyDiscordRPC() {
    if (!isConnected) return;
    
    try {
        rpc.destroy();
        isConnected = false;
    } catch (error) {
        console.error('Error destroying Discord RPC:', error);
    }
}

export function setDefaultActivity() {
    if (!isConnected) return;

    rpc.setActivity({
        details: 'Browsing X',
        state: 'Using BetterX Desktop',
        startTimestamp: new Date(),
        largeImageKey: 'betterx_logo',
        largeImageText: 'BetterX Desktop',
        buttons: [
            { label: 'Get BetterX', url: 'https://github.com/Feur-Inc/BetterX-Desktop' }
        ]
    });
}

export function updateActivity(details, state) {
    if (!isConnected) return;

    rpc.setActivity({
        details,
        state,
        startTimestamp: new Date(),
        largeImageKey: 'betterx_logo',
        largeImageText: 'BetterX Desktop',
        buttons: [
            { label: 'Get BetterX', url: 'https://github.com/Feur-Inc/BetterX-Desktop' }
        ]
    });
}
