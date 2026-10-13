const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1559655083887689758/Xy0L_dABJlt_2EAFHJsPUhpDbsO4z9vqo4SOHSDgyLC18FA37WrjgAby5xEZgHIHRVzv";

let detectedServers = [];

const ALLOWED_BRAINROTS = [
    "Garama and Madundung",
    "Dragon Cannelloni",
    "Hydra Dragon Cannelloni",
    "Strawberry Elephant",
    "Headless Horseman",
    "Meowl",
    "John Pork",
    "Skibidi Toilet",
    "Los Dragons",
    "Phoenix",
    "Griffin",
    "Dragon Aquanini",
    "Dragon Gingerini",
    "Dragon Skeletonini",
    "Plant Bros",
    "Signore Carapace",
    "Moby Bros",
    "Love Love Bear",
    "Hydra Serpent",
    "Arcadragon",
    "Hydra Bunny",
    "Antonio",
    "Elefanto Frigo",
    "Rico Dinero",
    "Rubrikiko",
    "Pancake and Syrup",
    "Kalika Bros",
    "Tirilikalika Tirilikalako",
    "Globa Steppa",
    "Dug Dug Dug",
    "La Supreme Combinasion",
    "La Casa Boo",
    "Fishino Clownino",
    "Cerberus",
    "Duggy Bros",
    "Kraken",
    "Venuspino",
    "Gorillo Subwoofero",
    "Foxini Lanternini"
];

app.post('/api/report', async (req, res) => {
    const { placeId, jobId, brainrotName, category, incomeRate, botName, imageUrl } = req.body;

    if (!placeId || !jobId || !brainrotName) {
        return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const isAllowed = ALLOWED_BRAINROTS.includes(brainrotName) || 
                      (category && (category.toLowerCase().includes("secreta") || category.toLowerCase().includes("og")));
    
    if (!isAllowed) {
        return res.json({ success: true, message: "Ignorado" });
    }

    const newDetection = {
        id: Date.now(),
        placeId,
        jobId,
        brainrotName,
        category: category || "Secreta/OG",
        incomeRate: incomeRate || "$1B/s",
        botName: botName || "Bot",
        timestamp: new Date().toISOString()
    };

    const exists = detectedServers.some(s => s.jobId === jobId && s.brainrotName === brainrotName);
    if (!exists) {
        detectedServers.unshift(newDetection);
        if (detectedServers.length > 20) detectedServers.pop();
    }

    if (DISCORD_WEBHOOK_URL) {
        try {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "🌾 BABYLIVE FINDER",
                        color: 16766720,
                        description: `**${brainrotName}**\n🧬 💰 - 🪙 **${newDetection.incomeRate}**`,
                        thumbnail: imageUrl ? { url: imageUrl } : undefined,
                        fields: [
                            { 
                                name: "Comando de Unión Rápida", 
                                value: `\`TeleportService:TeleportToPlaceInstance(${placeId}, "${jobId}", game.Players.LocalPlayer)\``, 
                                inline: false 
                            }
                        ],
                        footer: {
                            text: `💰 · Babylive System`
                        },
                        timestamp: new Date()
                    }]
                })
            });
        } catch (err) {
            console.error("Error al enviar a Discord:", err);
        }
    }

    console.log(`[+] ¡Babylive Detectó!: ${brainrotName} (${newDetection.incomeRate}) por ${newDetection.botName}`);
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
