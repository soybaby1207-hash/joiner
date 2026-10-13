const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1559655083887689758/Xy0L_dABJlt_2EAFHJsPUhpDbsO4z9vqo4SOHSDgyLC18FA37WrjgAby5xEZgHIHRVzv";

let detectedServers = [];

const ALLOWED_BRAINROTS = [
    "Garama and Madundung", "Dragon Cannelloni", "Hydra Dragon Cannelloni",
    "Strawberry Elephant", "Headless Horseman", "Meowl", "John Pork",
    "Skibidi Toilet", "Los Dragons", "Phoenix", "Griffin", "Dragon Aquanini",
    "Dragon Gingerini", "Dragon Skeletonini", "Plant Bros", "Signore Carapace",
    "Moby Bros", "Love Love Bear", "Hydra Serpent", "Arcadragon", "Hydra Bunny",
    "Antonio", "Elefanto Frigo", "Rico Dinero", "Rubrikiko", "Pancake and Syrup",
    "Kalika Bros", "Tirilikalika Tirilikalako", "Globa Steppa", "Dug Dug Dug",
    "La Supreme Combinasion", "La Casa Boo", "Fishino Clownino", "Cerberus",
    "Duggy Bros", "Kraken", "Venuspino", "Gorillo Subwoofero", "Foxini Lanternini"
];

const VALID_MATERIALS = [
    "Normal", "Gold", "Diamond", "Blotrot", "Candy", "Lava", 
    "Galaxy", "Yin Yang", "Radioactive", "Cursed", "Rainbow", 
    "Phantom", "Cyber", "Divine", "Eclipse", "Crystal"
];

app.post('/api/report', async (req, res) => {
    const { placeId, jobId, brainrotName, material, incomeRate, botName, imageUrl } = req.body;

    if (!placeId || !jobId || !brainrotName) {
        return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const matText = material && VALID_MATERIALS.includes(material) ? material : "Normal";

    const newDetection = {
        id: Date.now(),
        placeId,
        jobId,
        brainrotName,
        material: matText,
        incomeRate: incomeRate || "$1B/s",
        botName: botName || "Bot",
        timestamp: new Date().toISOString()
    };

    const exists = detectedServers.some(s => s.jobId === jobId && s.brainrotName === brainrotName && s.material === matText);
    if (!exists) {
        detectedServers.unshift(newDetection);
        if (detectedServers.length > 30) detectedServers.pop();
    }

    if (DISCORD_WEBHOOK_URL) {
        try {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "💎 BABYLIVE RADAR [NUEVO MATERIAL DETECTADO]",
                        color: 3066993,
                        description: `**${brainrotName}**\n🎨 Material/Rareza: **${matText}**\n💰 Ingresos: **${newDetection.incomeRate}**`,
                        thumbnail: imageUrl ? { url: imageUrl } : undefined,
                        fields: [
                            { 
                                name: "Comando de Unión Rápida", 
                                value: `\`TeleportService:TeleportToPlaceInstance(${placeId}, "${jobId}", game.Players.LocalPlayer)\``, 
                                inline: false 
                            }
                        ],
                        footer: { text: `🤖 Reportado por ${newDetection.botName} · Babylive Cloud` },
                        timestamp: new Date()
                    }]
                })
            });
        } catch (err) {
            console.error("Error al enviar a Discord:", err);
        }
    }

    console.log(`[+] Detectado: ${brainrotName} [Material: ${matText}]`);
    return res.json({ success: true });
});

app.get('/api/servers', (req, res) => {
    res.json({
        success: true,
        count: detectedServers.length,
        servers: detectedServers
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Babylive Finder activo en el puerto ${PORT}`);
});
