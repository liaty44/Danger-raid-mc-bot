import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import mineflayer from 'mineflayer';
import { readFileSync, existsSync } from 'fs';
import express from 'express';

// ==================== ⚙️ CONFIGURATION ====================
const CONFIG = {
    DEFAULT_IP: "",
    DEFAULT_PORT: null,
    MC_PASSWORD: "Spike123",
    MAX_BOTS: 4,
    SPAM_INTERVAL: 1500
};

// ==================== 🌐 Express Uptime Server (Render Fix) ====================
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.status(200).send('⚡ Spike.lol Advanced Raid Bot is active and running!');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`[HTTP] Server running and listening on port ${PORT}`);
});

setInterval(() => {
    console.log(`[UPTIME HEARTBEAT] Bot service is alive. Uptime: ${Math.floor(process.uptime())}s`);
}, 60000);
// ===================================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let targetHost = CONFIG.DEFAULT_IP;
let targetPort = CONFIG.DEFAULT_PORT;
let isRunning = false;
let sleepMode = false;
let bots = [];

function getSpamMessages() {
    try {
        if (!existsSync('spam.txt')) return ['Spike.lol Raid! .gg/spike.lol'];
        const content = readFileSync('spam.txt', 'utf8');
        return content.split('\n').map(m => m.trim()).filter(m => m.length > 0);
    } catch {
        return ['Spike.lol Raid active!'];
    }
}

function sendLog(message) {
    console.log(`[RAID LOG] ${message}`);
}

function createBot(index) {
    if (!isRunning) return;

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const botName = `spikelol_${randomNum}`;

    const botOptions = {
        host: targetHost,
        username: botName,
        hideErrors: true
    };
    if (targetPort) botOptions.port = Number(targetPort);

    const bot = mineflayer.createBot(botOptions);
    bots.push(bot);

    bot.once('spawn', () => {
        sendLog(`🟢 Bot **${botName}** connected to ${targetHost}`);
        startHumanBehavior(bot);
        startSpamming(bot);
    });

    bot.on('death', () => {
        sendLog(`💀 Bot **${botName}** died. Respawning...`);
        try { bot.respawn(); } catch (e) {}
    });

    bot.on('windowOpen', (window) => {
        sendLog(`🔐 Bot **${botName}** detected GUI/Chest login.`);
        setTimeout(() => {
            if (window && window.slots && window.slots[11]) {
                bot.clickWindow(11, 0, 0).catch(() => {});
            }
        }, 1000);
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const msgLower = message.toLowerCase();
        if (msgLower.includes('register') || msgLower.includes('/reg')) {
            bot.chat(`/register ${CONFIG.MC_PASSWORD} ${CONFIG.MC_PASSWORD}`);
        } else if (msgLower.includes('login') || msgLower.includes('/l')) {
            bot.chat(`/login ${CONFIG.MC_PASSWORD}`);
        }
    });

    bot.on('end', (reason) => {
        sendLog(`🔴 Bot **${botName}** disconnected (${reason}). Replacing...`);
        bots = bots.filter(b => b !== bot);
    });

    bot.on('error', () => {});
}

function startHumanBehavior(bot) {
    const moveInterval = setInterval(() => {
        if (!bot || !bot.entity || !bot._client || bot._client.ended) {
            clearInterval(moveInterval);
            return;
        }
        const directions = ['forward', 'back', 'left', 'right'];
        const randomDir = directions[Math.floor(Math.random() * directions.length)];
        bot.setControlState(randomDir, true);
        setTimeout(() => { if (bot && bot.clearControlStates) bot.clearControlStates(); }, 4000);
    }, 6000);

    const jumpInterval = setInterval(() => {
        if (!bot || !bot.entity || !bot._client || bot._client.ended) {
            clearInterval(jumpInterval);
            return;
        }
        bot.setControlState('jump', true);
        setTimeout(() => { if (bot && bot.setControlState) bot.setControlState('jump', false); }, 500);
    }, 10000);

    const lookInterval = setInterval(() => {
        if (!bot || !bot.entity || !bot._client || bot._client.ended) {
            clearInterval(lookInterval);
            return;
        }
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() * Math.PI) - (Math.PI / 2);
        bot.look(yaw, pitch, true).catch(() => {});
    }, 8000);
}

function startSpamming(bot) {
    const spamInterval = setInterval(() => {
        if (!bot || !bot.entity || !bot._client || bot._client.ended || sleepMode) {
            clearInterval(spamInterval);
            return;
        }
        const messages = getSpamMessages();
        const rawMsg = messages[Math.floor(Math.random() * messages.length)];
        const randomSuffix = Math.floor(10 + Math.random() * 90);
        const finalMsg = `${rawMsg} [${randomSuffix}]`;
        
        try {
            if (bot && typeof bot.chat === 'function') {
                bot.chat(finalMsg);
            }
        } catch (e) {}
    }, CONFIG.SPAM_INTERVAL);
}

function startRaidSystem() {
    isRunning = true;
    const controlInterval = setInterval(() => {
        if (!isRunning) {
            clearInterval(controlInterval);
            return;
        }
        if (bots.length < CONFIG.MAX_BOTS && !sleepMode) {
            createBot(bots.length + 1);
        }
    }, CONFIG.SPAM_INTERVAL);
}

const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Start raid bots'),
    new SlashCommandBuilder().setName('stop').setDescription('Stop all bots'),
    new SlashCommandBuilder().setName('ip').setDescription('Configure server IP and Port')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[DISCORD] Logged in as ${client.user.tag}`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        if (commandName === 'ip') {
            const modal = new ModalBuilder().setCustomId('ip_modal').setTitle('Server IP & Port Configuration');
            const ipInput = new TextInputBuilder().setCustomId('server_ip').setLabel('Server IP').setStyle(TextInputStyle.Short).setRequired(true);
            const portInput = new TextInputBuilder().setCustomId('server_port').setLabel('Port (Optional)').setStyle(TextInputStyle.Short).setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(ipInput), new ActionRowBuilder().addComponents(portInput));
            await interaction.showModal(modal);
        } else if (commandName === 'start') {
            if (!targetHost) return interaction.reply({ content: '❌ Pehle `/ip` se IP set karein!', ephemeral: true });
            if (isRunning) return interaction.reply({ content: '⚠️ Bots pehle se chal rahe hain!', ephemeral: true });
            startRaidSystem();
            await interaction.reply({ content: `🚀 **Raid started!** Connecting ${CONFIG.MAX_BOTS} bots to **${targetHost}**...`, ephemeral: true });
        } else if (commandName === 'stop') {
            isRunning = false;
            bots.forEach(b => { try { b.quit(); } catch (e) {} });
            bots = [];
            await interaction.reply({ content: '🛑 **Stopped!** All bots disconnected.', ephemeral: true });
        }
    } else if (interaction.isModalSubmit() && interaction.customId === 'ip_modal') {
        targetHost = interaction.fields.getTextInputValue('server_ip').trim();
        const portVal = interaction.fields.getTextInputValue('server_port').trim();
        targetPort = portVal ? parseInt(portVal) : null;
        await interaction.reply({ content: `✅ Target saved: \`${targetHost}:${portVal || 'Default'}\``, ephemeral: true });
    }
});

client.login(TOKEN);
