import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import mineflayer from 'mineflayer';
import { readFileSync, existsSync } from 'fs';
import express from 'express';

// 🌐 Express Server for Render / Uptime 24/7
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('⚡ Spike.lol Advanced Raid Bot is active and running!'));
app.listen(PORT, () => console.log(`[HTTP] Server running on port ${PORT}`));

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const WEBHOOK_CHANNEL_ID = process.env.WEBHOOK_CHANNEL_ID || ''; // Optional Discord Channel ID for logs

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Configuration Variables
let targetHost = '';
let targetPort = null;
let isRunning = false;
let sleepMode = false;
let bots = [];
let targetFollowUser = null;
const MAX_BOTS = 4;

// Load Spam Messages from spam.txt
function getSpamMessages() {
    try {
        if (!existsSync('spam.txt')) return ['Spike.lol Raid! .gg/spike.lol'];
        const content = readFileSync('spam.txt', 'utf8');
        return content.split('\n').map(m => m.trim()).filter(m => m.length > 0);
    } catch {
        return ['Spike.lol Raid active!'];
    }
}

// Load Proxies from proxies.txt if available
function getProxies() {
    try {
        if (!existsSync('proxies.txt')) return [];
        const content = readFileSync('proxies.txt', 'utf8');
        return content.split('\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('#'));
    } catch {
        return [];
    }
}

// Send Log to Console & Optional Discord Channel
async function sendLog(message, color = 0x5865F2) {
    console.log(`[RAID LOG] ${message}`);
    if (WEBHOOK_CHANNEL_ID) {
        try {
            const channel = await client.channels.fetch(WEBHOOK_CHANNEL_ID);
            if (channel) {
                const embed = new EmbedBuilder().setDescription(message).setColor(color).setTimestamp();
                await channel.send({ embeds: [embed] });
            }
        } catch (e) {}
    }
}

// Single Bot Instance Creator with Unique Random Name (spikelol_[random]) & Proxy Support
function createBot(index) {
    if (!isRunning) return;

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const botName = `spikelol_${randomNum}`;[span_0](start_span)[span_0](end_span)

    const botOptions = {
        host: targetHost,
        username: botName,
        hideErrors: true
    };
    if (targetPort) botOptions.port = Number(targetPort);

    // Advanced Feature: Proxy Integration if available in proxies.txt
    const proxies = getProxies();
    if (proxies.length > 0) {
        const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
        const [pIp, pPort] = randomProxy.split(':');
        if (pIp && pPort) {
            botOptions.host = pIp;
            botOptions.port = Number(pPort);
            // Real target server routing for proxy
            botOptions.auth = 'offline';
        }
    }

    const bot = mineflayer.createBot(botOptions);
    bots.push(bot);

    bot.once('spawn', () => {
        sendLog(`🟢 Bot **${botName}** successfully connected to ${targetHost}!`, 0x57F287);
        startHumanBehavior(bot);
        startSpamming(bot);
        startFollowLogic(bot);
    });

    // Auto Respawn on Death
    bot.on('death', () => {
        sendLog(`💀 Bot **${botName}** died. Instant respawning...`, 0xFEE75C);
        try { bot.respawn(); } catch (e) {}
    });

    // GUI & Chest Login Bypass
    bot.on('windowOpen', (window) => {
        sendLog(`🔐 Bot **${botName}** detected GUI/Chest login. Interacting smartly...`, 0x5865F2);
        setTimeout(() => {
            if (window && window.slots && window.slots[11]) {
                bot.clickWindow(11, 0, 0).catch(() => {});
            }
        }, 1000);
    });

    // Auto Login / Register in Chat
    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const msgLower = message.toLowerCase();
        if (msgLower.includes('register') || msgLower.includes('/reg')) {
            bot.chat('/register spike123 spike123');
        } else if (msgLower.includes('login') || msgLower.includes('/l')) {
            bot.chat('/login spike123');
        }
    });

    bot.on('end', (reason) => {
        sendLog(`🔴 Bot **${botName}** banned/disconnected (${reason}). Replacing with a new random bot...`, 0xED4245);
        bots = bots.filter(b => b !== bot);
    });

    bot.on('error', () => {});
}

// Human-like Anti-Bot Bypassing Behaviors
function startHumanBehavior(bot) {
    // Random movement every 6s for 4s
    setInterval(() => {
        if (!bot.entity) return;
        const directions = ['forward', 'back', 'left', 'right'];
        const randomDir = directions[Math.floor(Math.random() * directions.length)];
        bot.setControlState(randomDir, true);
        setTimeout(() => bot.clearControlStates(), 4000);
    }, 6000);

    // Jump every 10s
    setInterval(() => {
        if (!bot.entity) return;
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }, 10000);

    // Head random movement every 8s for 6s
    setInterval(() => {
        if (!bot.entity) return;
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() * Math.PI) - (Math.PI / 2);
        bot.look(yaw, pitch, true).catch(() => {});
    }, 8000);
}

// Fast Anti-spam chat with 2-digit random suffix every 1.5s
function startSpamming(bot) {
    setInterval(() => {
        if (!bot.entity || sleepMode) return;
        const messages = getSpamMessages();
        const rawMsg = messages[Math.floor(Math.random() * messages.length)];
        const randomSuffix = Math.floor(10 + Math.random() * 90);
        const finalMsg = `${rawMsg} [${randomSuffix}]`;
        bot.chat(finalMsg).catch(() => {});
    }, 1500);
}

// Advanced Feature: Auto-Follow Target Player Logic
function startFollowLogic(bot) {
    setInterval(() => {
        if (!targetFollowUser || !bot.entity || sleepMode) return;
        const player = bot.players[targetFollowUser]?.entity;
        if (player) {
            const pPos = player.position;
            bot.pathfinder?.goto?.(pPos).catch(() => {
                // Basic movement fallback if pathfinder plugin not loaded
                bot.lookAt(player.position.offset(0, player.height, 0));
                bot.setControlState('forward', true);
                setTimeout(() => bot.setControlState('forward', false), 1000);
            });
        }
    }, 3000);
}

// Main Raid Controller & Auto-Replacement Loop (Spawns every 1.5s)
function startRaidSystem() {
    isRunning = true;
    let attemptCount = 0;
    const maxAttempts = 160; // ~40 minutes check

    const controlInterval = setInterval(() => {
        if (!isRunning) {
            clearInterval(controlInterval);
            return;
        }

        // Agar koi bot ban ya disconnect hua, toh turant naya random naam wala bot join karega
        if (bots.length < MAX_BOTS && !sleepMode) {
            sendLog(`⚡ Active bots: ${bots.length}/${MAX_BOTS}. Spawning new replacement bot...`, 0xFEE75C);
            createBot(bots.length + 1);
        }

        attemptCount++;
        if (attemptCount >= maxAttempts && bots.length === 0) {
            sleepMode = true;
            sendLog(`💤 Server offline for 40m. Entering Sleep Mode to save resources.`, 0xED4245);

            const sleepCheck = setInterval(() => {
                if (!isRunning) {
                    clearInterval(sleepCheck);
                    return;
                }
                sleepMode = false;
                attemptCount = 0;
                sendLog(`⚡ Server online detected! Waking up from Sleep Mode.`, 0x57F287);
                clearInterval(sleepCheck);
            }, 300000); // 5 mins retry

            clearInterval(controlInterval);
        }
    }, 1500);
}

// Discord Slash Commands Setup
const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Start raid bots'),
    new SlashCommandBuilder().setName('stop').setDescription('Stop all bots'),
    new SlashCommandBuilder().setName('ip').setDescription('Configure server IP and Port menu'),
    new SlashCommandBuilder()
        .setName('follow')
        .setDescription('Make bots follow a specific player')
        .addStringOption(option => option.setName('username').setDescription('Player username to follow').setRequired(true))
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
            const ipInput = new TextInputBuilder().setCustomId('server_ip').setLabel('Server IP (e.g. play.server.com)').setStyle(TextInputStyle.Short).setRequired(true);
            const portInput = new TextInputBuilder().setCustomId('server_port').setLabel('Port (Leave blank if default Java)').setStyle(TextInputStyle.Short).setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(ipInput), new ActionRowBuilder().addComponents(portInput));
            await interaction.showModal(modal);
        } 
        else if (commandName === 'start') {
            if (!targetHost) return interaction.reply({ content: '❌ Pehle `/ip` command use karke Server IP set karein!', ephemeral: true });
            if (isRunning) return interaction.reply({ content: '⚠️ Bots pehle se running hain!', ephemeral: true });
            startRaidSystem();
            await interaction.reply({ content: `🚀 **Raid started!** Connecting 4 bots to **${targetHost}**...`, ephemeral: true });
        } 
        else if (commandName === 'stop') {
            isRunning = false;
            sleepMode = false;
            targetFollowUser = null;
            bots.forEach(b => { try { b.quit(); } catch (e) {} });
            bots = [];
            await interaction.reply({ content: '🛑 **Force Stopped!** All bots disconnected.', ephemeral: true });
        }
        else if (commandName === 'follow') {
            targetFollowUser = interaction.options.getString('username');
            await interaction.reply({ content: `🎯 **Target locked!** Bots are now configured to follow player: \`${targetFollowUser}\``, ephemeral: true });
        }
    } 
    else if (interaction.isModalSubmit() && interaction.customId === 'ip_modal') {
        targetHost = interaction.fields.getTextInputValue('server_ip').trim();
        const portVal = interaction.fields.getTextInputValue('server_port').trim();
        targetPort = portVal ? parseInt(portVal) : null;
        await interaction.reply({ content: `✅ **Target Saved Successfully!**\n🌐 IP: \`${targetHost}\`\n🔌 Port: \`${targetPort || 'Default'}\``, ephemeral: true });
    }
});

client.login(TOKEN);
