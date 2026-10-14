-- =========================================================================
-- BABYLIVE BOT HUB v5.0
-- Lista ampliada de brainrots, tiers, avisos, búsqueda y reintentos de join
-- =========================================================================

local CONFIG = {
    BASE_URL         = "https://joiner-t6p1.onrender.com",
    API_KEY          = "PON_AQUI_TU_API_KEY", -- la misma que la variable API_KEY de Render
    TARGET_PLACE_ID  = 109983668079237,
    POLL_SECONDS     = 3,
    STAY_SECONDS     = 20,         -- tiempo que se queda el bot en un servidor antes de buscar otro
    MAX_AGE_SECONDS  = 180,        -- ignora detecciones más viejas que esto
    JOIN_COOLDOWN    = 5,          -- segundos mínimos entre intentos de join
    HIGHLIGHT_INCOME = 100000000,  -- 100M/s o más = Highlight
    SCRIPT_FILE      = "autoexec/BabyliveGUI.lua",
    SOUND_ID         = "rbxassetid://4590662766",
}

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local UserInputService = game:GetService("UserInputService")
local SoundService = game:GetService("SoundService")
local LocalPlayer = Players.LocalPlayer

local httpRequest = request or (http and http.request) or (syn and syn.request) or http_request
local arrivedAt = tick()

-- Los bots solo viven en este place (distintos servidores, mismo place)
if game.PlaceId ~= CONFIG.TARGET_PLACE_ID then
    TeleportService:Teleport(CONFIG.TARGET_PLACE_ID, LocalPlayer)
    return
end

local MATERIAL_ICONS = {
    ["Gold"] = "rbxassetid://80608359098882",
    ["Blotrot"] = "rbxassetid://75521652007956",
    ["Candy"] = "rbxassetid://82543577281394",
    ["Lava"] = "rbxassetid://118469713580146",
    ["Galaxy"] = "rbxassetid://135373965912687",
    ["Yin Yang"] = "rbxassetid://84831790018891",
    ["Radioactive"] = "rbxassetid://75359157089223",
    ["Cursed"] = "rbxassetid://86352158268498",
    ["Divine"] = "rbxassetid://132477807330382",
    ["Cyber"] = "rbxassetid://96274901209302",
    ["Phantom"] = "rbxassetid://93864247331147",
    ["Crystal"] = "rbxassetid://115947263163311",
    ["Eclipse"] = "rbxassetid://121840599909424",
    ["Default"] = "rbxassetid://122056896667832",
}

local function SafeJSONDecode(str)
    if type(str) ~= "string" or #str == 0 then return nil end
    local ok, result = pcall(function() return HttpService:JSONDecode(str) end)
    if ok and type(result) == "table" then return result end
    return nil
end

local function copyList(t)
    local r = {}
    for i, v in ipairs(t) do r[i] = v end
    return r
end

-- ---------------------------------------------------------------------
-- MATERIALES (orden = prioridad, de menor a mayor; editable en la pestaña COLORS)
-- ---------------------------------------------------------------------
local DEFAULT_MATERIALS = {
    "Normal", "Aquatic", "Bunny Basket",
    "Christmas", "Easter", "Gingerbread",
    "Halloween", "Lucky", "Octo",
    "Pot of Gold", "Rose", "Summer",
    "Taco", "Valentines", "Tralalero",
    "Gold", "Diamond", "Blotrot",
    "Candy", "Lava", "Galaxy",
    "Yin Yang", "Radioactive", "Cursed",
    "Rainbow", "Phantom", "Cyber",
    "Divine", "Eclipse", "Crystal",
}

-- ---------------------------------------------------------------------
-- AJUSTES (se guardan solos cuando cambian)
-- ---------------------------------------------------------------------
local Settings = {
    AutoExecute = true,
    ToggleKey = "RightShift",
    MiniPosition = { X = 0.5, Y = 0.05, OffsetX = -25, OffsetY = 0 },
    MaterialOrder = copyList(DEFAULT_MATERIALS),
    Highlights = true,
    Midlights = true,
    PlaySound = true,
    AutoJoinRetries = 3,
    Selected = {},
}

local savedSelected = nil
pcall(function()
    if isfile and readfile and isfile("BabyliveSettings.json") then
        local data = SafeJSONDecode(readfile("BabyliveSettings.json"))
        if data then
            for _, key in ipairs({ "AutoExecute", "Highlights", "Midlights", "PlaySound" }) do
                if type(data[key]) == "boolean" then Settings[key] = data[key] end
            end
            if type(data.AutoJoinRetries) == "number" then Settings.AutoJoinRetries = data.AutoJoinRetries end
            if data.ToggleKey then Settings.ToggleKey = data.ToggleKey end
            if type(data.MiniPosition) == "table" then Settings.MiniPosition = data.MiniPosition end
            if type(data.MaterialOrder) == "table" then Settings.MaterialOrder = data.MaterialOrder end
            if type(data.Selected) == "table" then savedSelected = data.Selected end
        end
    end
end)

-- añade materiales nuevos que el archivo guardado no conociera
do
    local have = {}
    for _, m in ipairs(Settings.MaterialOrder) do have[m] = true end
    for _, m in ipairs(DEFAULT_MATERIALS) do
        if not have[m] then table.insert(Settings.MaterialOrder, m) end
    end
end

local lastSavedJson = ""
local function saveSettings()
    pcall(function()
        local json = HttpService:JSONEncode(Settings)
        if json ~= lastSavedJson and writefile then
            writefile("BabyliveSettings.json", json)
            lastSavedJson = json
        end
    end)
end

local function getMaterialWeight(matName)
    for index, name in ipairs(Settings.MaterialOrder) do
        if name == matName then return index end
    end
    return 1
end

-- ---------------------------------------------------------------------
-- BASE DE DATOS DE BRAINROTS (priority = activado por defecto)
-- ---------------------------------------------------------------------
local BRAINROT_DATABASE = {
    { name = "Garama and Madundung", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Dragon Cannelloni", isOG = true, priority = true, image = "rbxassetid://97516641503409" },
    { name = "Hydra Dragon Cannelloni", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Strawberry Elephant", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Headless Horseman", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Meowl", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "John Pork", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Skibidi Toilet", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Los Dragons", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Phoenix", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Griffin", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Dragon Aquanini", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Dragon Gingerini", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Dragon Skeletonini", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Plant Bros", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Signore Carapace", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Moby Bros", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Love Love Bear", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Hydra Serpent", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Arcadragon", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Hydra Bunny", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Antonio", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Elefanto Frigo", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Rico Dinero", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Rubrikiko", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Pancake and Syrup", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Kalika Bros", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Tirilikalika Tirilikalako", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Globa Steppa", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Dug Dug Dug", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "La Supreme Combinasion", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "La Casa Boo", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Fishino Clownino", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Cerberus", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Duggy Bros", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Kraken", isOG = true, priority = true, image = "rbxassetid://0" },
    { name = "Venuspino", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Gorillo Subwoofero", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Foxini Lanternini", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Hopilikalika Hopilikalako", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "La Craft Machine", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Gold and Diamond", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Capitano Moby", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Celestial Pegasus", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Burguro and Fryuro", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Fragrama and Chocrama", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Spooky and Pumpky", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "La Fuse Machine", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Polaroidini", isOG = false, priority = true, image = "rbxassetid://0" },
    { name = "Los Nooo My Hotspotsitos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Serafinna Medusella", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Grande Combinassion", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Easter Grande", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Rang Ring Bus", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Guest 666", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Mi Gatitos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Chicleteiras", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Noo My Eggs", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Donkeyturbo Express", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Mariachi Corazoni", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Burritos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los 25", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Tacorillo Crocodillo", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Swag Soda", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Noo my Heart", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chimnino", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Combinasionas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chicleteira Noelteira", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Baskito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Tacorita Bicicleta", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Sweethearts", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Spinny Hammy", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Nuclearo Dinosauro", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Las Sis", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "DJ Panda", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chicleteira Cupideira", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Karkerkar Combinasion", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chillin Chili", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chipso and Queso", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Money Money Reindeer", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Money Money Puggy", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Churrito Bunnito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Celularcini Viciosini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Planitos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Mobilis", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los 67", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Mieteteira Bicicleteira", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Tuff Toucan", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Spooky Grande", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Spooky Combinasionas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Cigno Fulgoro", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Candies", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Hotspositos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Jolly Combinasionas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Cupids", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Puggies", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "W or L", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Tralalalaledon", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Extinct Grande Combinasion", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Tralaledon", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Jolly Grande", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Primos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Bacuru and Egguru", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Eviledon", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Tacoritas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Lovin Rose", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Tang Tang Kelentang", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Ketupat Kepat", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Bros", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Tictac Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Romantic Grande", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Gingerat Gerat", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Orcaledon", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Lucky Grande", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Ketchuru and Masturu", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Jolly Jolly Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Rosetti Tualetti", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Nacho Spyder", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Festive 67", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Sammyni Fattini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Ginger Sekolah", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Boppin Bunny", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Lavadorito Spinito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Food Combinasion", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Spaghettis", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Sekolahs", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Secret Combinasion", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Amigos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Reinito Sleighito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Ketupat Bros", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Cooki and Milki", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Rosey and Teddy", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Popcuru and Fizzuru", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Vacca Saturno Saturnita", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Pandanini Frostini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Bisonte Giuppitere", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Blackhole Goat", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Jackorilla", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Agarrini Ia Palini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chachechi", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Karkerkar Kurkur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Tortus", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Matteos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Sammyni Spyderini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Trenostruzzo Turbo 4000", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chimpanzini Spiderini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Boatito Auratito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Fragola La La La", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Dul Dul Dul", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Vacca Prese Presente", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Frankentteo", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Trios", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Karker Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Torrtuginni Dragonfrutini (Lucky Block)", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Tralaleritos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Zombie Tralala", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Cucaracha", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Vulturino Skeletono", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Guerriro Digitale", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Extinct Tralalero", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Yess My Examine", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Extinct Matteo", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Las Tralaleritas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Rocco Disco", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Reindeer Tralala", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Las Vaquitas Saturnitas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Pumpkin Spyderini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Job Job Job Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Karkeritos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Graipuss Medussi", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Santteo", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Fishboard", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Buntteo", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Vacca Jacko Linterino", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Triplito Tralaleritos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Trickolino", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Paradiso Axolottino", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "GOAT", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Giftini Spyderini", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Spyderinis", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Love Love Love Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Perrito Burrito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "1x1x1x1", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Cucarachas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Easter Easter Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Please My Present", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Cuadramat and Pakrahmatmamat", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Jobcitos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Nooo My Hotspot", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Pot Hotspot (Lucky Block)", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Noo My Examine", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Telemorte", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "La Sahur Combinasion", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "List List List Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Bunny Bunny Bunny Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "To To To Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Pirulitoita Bicicletaire", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Santa Hotspot", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Horegini Boom", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Quesadilla Crocodila", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Pot Pumpkin", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Naughty Naughty", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Cupid Cupid Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Ho Ho Ho Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Mi Gatito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chicleteira Bicicleteira", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Eid Eid Eid Sahur", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Cupid Hotspot", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Spaghetti Tualetti (Lucky Block)", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Esok Sekolah (Lucky Block)", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Quesadillo Vampiro", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Brunito Marsito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chill Puppy", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Burrito Bandito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Chicleteirina Bicicleteirina", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Granny", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Bunitos", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Los Quesadillas", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Bunito Bunito Spinito", isOG = false, priority = false, image = "rbxassetid://0" },
    { name = "Noo My Candy", isOG = false, priority = false, image = "rbxassetid://0" },
}

table.sort(BRAINROT_DATABASE, function(a, b)
    if a.priority ~= b.priority then return a.priority end
    if a.isOG ~= b.isOG then return a.isOG end
    return a.name < b.name
end)

local SelectedBrainrots = {}
for _, item in ipairs(BRAINROT_DATABASE) do
    SelectedBrainrots[item.name] = item.priority
end
if savedSelected then
    for name, value in pairs(savedSelected) do
        if SelectedBrainrots[name] ~= nil and type(value) == "boolean" then
            SelectedBrainrots[name] = value
        end
    end
end
Settings.Selected = SelectedBrainrots

if Settings.AutoExecute then
    local qFunc = queue_on_teleport or (syn and syn.queue_on_teleport) or (fluxus and fluxus.queue_on_teleport) or queueonteleport
    if qFunc then
        pcall(function()
            qFunc(string.format(
                "task.wait(2) pcall(function() if isfile and isfile(%q) and readfile then loadstring(readfile(%q))() end end)",
                CONFIG.SCRIPT_FILE, CONFIG.SCRIPT_FILE
            ))
        end)
    end
end

-- ---------------------------------------------------------------------
-- TIERS POR INGRESOS ("$1.5M/s" -> 1500000)
-- ---------------------------------------------------------------------
local SUFFIX = { K = 1e3, M = 1e6, B = 1e9, T = 1e12 }

local function parseIncome(text)
    if type(text) ~= "string" then return 0 end
    local num, suffix = text:match("([%d%.,]+)%s*([KMBTkmbt]?)")
    if not num then return 0 end
    num = tonumber((num:gsub(",", ""))) or 0
    return num * (SUFFIX[suffix:upper()] or 1)
end

local function tierFromIncome(income)
    if income <= 0 then return "Unknown" end
    return income >= CONFIG.HIGHLIGHT_INCOME and "Highlights" or "Midlights"
end

local function tierAllowed(tier)
    if tier == "Highlights" then return Settings.Highlights end
    if tier == "Midlights" then return Settings.Midlights end
    return true
end

local TIER_COLORS = {
    Highlights = Color3.fromRGB(255, 75, 75),
    Midlights = Color3.fromRGB(80, 175, 255),
    Unknown = Color3.fromRGB(90, 95, 110),
}

-- ---------------------------------------------------------------------
-- ESTADO
-- ---------------------------------------------------------------------
local autoJoinEnabled = true
local teleporting = false
local teleportFailed = false
local lastJoinAt = 0
local latestRaw = {}
local lastSignature = ""
local addedLabels = {}
local render -- se define más abajo

-- ---------------------------------------------------------------------
-- HELPERS DE UI
-- ---------------------------------------------------------------------
local function make(class, props, parent)
    local inst = Instance.new(class)
    for k, v in pairs(props) do inst[k] = v end
    if parent then inst.Parent = parent end
    return inst
end
local function corner(inst, r)
    local c = Instance.new("UICorner")
    c.CornerRadius = UDim.new(0, r)
    c.Parent = inst
end
local function stroke(inst, color, thickness)
    local s = Instance.new("UIStroke")
    s.Color = color
    s.Thickness = thickness
    s.Parent = inst
    return s
end
local function hexToColor3(hex)
    if type(hex) ~= "string" then return nil end
    local r, g, b = hex:match("^#(%x%x)(%x%x)(%x%x)$")
    if not r then return nil end
    return Color3.fromRGB(tonumber(r, 16), tonumber(g, 16), tonumber(b, 16))
end

local COL_BG = Color3.fromRGB(22, 25, 34)
local COL_GOLD = Color3.fromRGB(255, 215, 0)
local COL_WHITE = Color3.fromRGB(255, 255, 255)
local COL_MUTED = Color3.fromRGB(120, 125, 145)
local COL_ON = Color3.fromRGB(0, 170, 85)
local COL_OFF = Color3.fromRGB(50, 55, 70)

local StatusLabel
local function setStatus(text)
    if StatusLabel then StatusLabel.Text = text end
end

-- sonido de aviso
do
    local old = SoundService:FindFirstChild("BabyliveNotifSound")
    if old then old:Destroy() end
end
local NotifSound = make("Sound", { Name = "BabyliveNotifSound", SoundId = CONFIG.SOUND_ID, Volume = 1 }, SoundService)

-- ---------------------------------------------------------------------
-- API
-- ---------------------------------------------------------------------
local function apiGet(path)
    if not httpRequest then
        setStatus("Sin request en el executor")
        return nil
    end
    local ok, res = pcall(function()
        return httpRequest({
            Url = CONFIG.BASE_URL .. path,
            Method = "GET",
            Headers = { ["x-api-key"] = CONFIG.API_KEY },
        })
    end)
    if not ok or not res then return nil end
    if res.StatusCode == 401 then
        setStatus("API key incorrecta")
        return nil
    end
    if res.StatusCode ~= 200 then return nil end
    return SafeJSONDecode(res.Body)
end

TeleportService.TeleportInitFailed:Connect(function()
    teleportFailed = true
end)

-- join con cooldown y reintentos
local function joinServer(jobId)
    if not jobId or teleporting then return end
    if tick() - lastJoinAt < CONFIG.JOIN_COOLDOWN then return end
    lastJoinAt = tick()
    teleporting = true
    setStatus("Joining...")

    task.spawn(function()
        local attempts = math.max(1, math.floor(tonumber(Settings.AutoJoinRetries) or 3))
        for i = 1, attempts do
            teleportFailed = false
            local ok = pcall(function()
                TeleportService:TeleportToPlaceInstance(CONFIG.TARGET_PLACE_ID, jobId, LocalPlayer)
            end)
            if not ok then teleportFailed = true end

            local t0 = tick()
            while tick() - t0 < 4 and not teleportFailed do
                task.wait(0.25)
            end
            if not teleportFailed then break end

            setStatus("Reintento " .. i .. "/" .. attempts)
            task.wait(1)
        end
        if not teleportFailed then task.wait(20) end
        teleporting = false
    end)
end

-- ---------------------------------------------------------------------
-- VENTANA
-- ---------------------------------------------------------------------
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
local oldGui = PlayerGui:FindFirstChild("BabyliveProGUI")
if oldGui then oldGui:Destroy() end

local ScreenGui = make("ScreenGui", { Name = "BabyliveProGUI", ResetOnSpawn = false }, PlayerGui)

local MainFrame = make("Frame", {
    Name = "MainFrame",
    Size = UDim2.new(0, 820, 0, 480),
    Position = UDim2.new(0.5, -410, 0.5, -240),
    BackgroundColor3 = Color3.fromRGB(13, 14, 18),
    BorderSizePixel = 0,
    Active = true,
    Draggable = true,
    Visible = false,
}, ScreenGui)
corner(MainFrame, 14)
stroke(MainFrame, Color3.fromRGB(35, 38, 50), 1.5)

local MiniFrame = make("ImageButton", {
    Name = "MiniFrame",
    Size = UDim2.new(0, 48, 0, 48),
    Position = UDim2.new(Settings.MiniPosition.X, Settings.MiniPosition.OffsetX, Settings.MiniPosition.Y, Settings.MiniPosition.OffsetY),
    BackgroundColor3 = Color3.fromRGB(18, 20, 26),
    BorderSizePixel = 0,
    Image = "rbxassetid://135064225074606",
    Visible = true,
    Active = true,
    Draggable = true,
}, ScreenGui)
corner(MiniFrame, 12)
stroke(MiniFrame, COL_GOLD, 1.5)

local function showMain(show)
    MainFrame.Visible = show
    MiniFrame.Visible = not show
    if show and render then render() end
end

MiniFrame.MouseButton1Up:Connect(function()
    Settings.MiniPosition = {
        X = MiniFrame.Position.X.Scale,
        OffsetX = MiniFrame.Position.X.Offset,
        Y = MiniFrame.Position.Y.Scale,
        OffsetY = MiniFrame.Position.Y.Offset,
    }
    saveSettings()
end)
MiniFrame.MouseButton1Click:Connect(function() showMain(true) end)

-- Avisos (toasts) arriba a la derecha, visibles aunque el hub esté minimizado
local NotifContainer = make("Frame", {
    Name = "NotifContainer",
    Size = UDim2.new(0, 260, 1, -40),
    Position = UDim2.new(1, -280, 0, 20),
    BackgroundTransparency = 1,
}, ScreenGui)
make("UIListLayout", {
    SortOrder = Enum.SortOrder.LayoutOrder,
    VerticalAlignment = Enum.VerticalAlignment.Bottom,
    Padding = UDim.new(0, 8),
}, NotifContainer)

local function notify(server)
    if Settings.PlaySound then pcall(function() NotifSound:Play() end) end
    local accent = TIER_COLORS[server._tier or "Unknown"]
    local Toast = make("TextButton", {
        Size = UDim2.new(1, 0, 0, 52),
        BackgroundColor3 = Color3.fromRGB(12, 18, 32),
        BorderSizePixel = 0,
        Text = "",
        AutoButtonColor = false,
    }, NotifContainer)
    corner(Toast, 8)
    stroke(Toast, accent, 1)
    make("Frame", { Size = UDim2.new(0, 3, 0.65, 0), Position = UDim2.new(0, 6, 0.175, 0), BackgroundColor3 = accent, BorderSizePixel = 0 }, Toast)
    make("TextLabel", {
        Size = UDim2.new(1, -80, 0, 16), Position = UDim2.new(0, 16, 0, 8),
        BackgroundTransparency = 1, Text = tostring(server.brainrotName),
        TextColor3 = COL_WHITE, TextSize = 12, Font = Enum.Font.GothamBold,
        TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd,
    }, Toast)
    local colorText = (server.colorName and server.colorName ~= "") and (" · " .. server.colorName) or ""
    make("TextLabel", {
        Size = UDim2.new(1, -80, 0, 14), Position = UDim2.new(0, 16, 0, 28),
        BackgroundTransparency = 1,
        Text = tostring(server.material or "Normal") .. colorText .. "  ·  " .. tostring(server.incomeRate or "?"),
        TextColor3 = Color3.fromRGB(150, 155, 175), TextSize = 10, Font = Enum.Font.Gotham,
        TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd,
    }, Toast)
    local JoinLbl = make("TextLabel", {
        Size = UDim2.new(0, 44, 0, 22), Position = UDim2.new(1, -54, 0.5, -11),
        BackgroundColor3 = Color3.fromRGB(60, 130, 246), BorderSizePixel = 0,
        Text = "JOIN", TextColor3 = COL_WHITE, TextSize = 10, Font = Enum.Font.GothamBold,
    }, Toast)
    corner(JoinLbl, 5)
    Toast.MouseButton1Click:Connect(function() joinServer(server.jobId) end)
    task.delay(4.5, function()
        if Toast and Toast.Parent then Toast:Destroy() end
    end)
end

-- Header
local Header = make("Frame", {
    Size = UDim2.new(1, 0, 0, 52),
    BackgroundColor3 = Color3.fromRGB(20, 22, 28),
    BorderSizePixel = 0,
}, MainFrame)
corner(Header, 14)

make("TextLabel", {
    Size = UDim2.new(0, 230, 1, 0),
    Position = UDim2.new(0, 18, 0, 0),
    BackgroundTransparency = 1,
    Text = "⚡ BABYLIVE <font color='#FFD700'>BOT HUB v5.0</font>",
    RichText = true,
    TextColor3 = COL_WHITE,
    TextSize = 16,
    Font = Enum.Font.GothamBlack,
    TextXAlignment = Enum.TextXAlignment.Left,
}, Header)

StatusLabel = make("TextLabel", {
    Size = UDim2.new(0, 230, 1, 0),
    Position = UDim2.new(0, 260, 0, 0),
    BackgroundTransparency = 1,
    Text = "Conectando...",
    TextColor3 = Color3.fromRGB(150, 155, 175),
    TextSize = 11,
    Font = Enum.Font.Gotham,
    TextXAlignment = Enum.TextXAlignment.Left,
}, Header)

local MinimizeBtn = make("TextButton", {
    Size = UDim2.new(0, 32, 0, 32),
    Position = UDim2.new(1, -42, 0.5, -16),
    BackgroundColor3 = Color3.fromRGB(30, 33, 45),
    BorderSizePixel = 0,
    Text = "—",
    TextColor3 = Color3.fromRGB(200, 200, 220),
    TextSize = 16,
    Font = Enum.Font.GothamBold,
}, Header)
corner(MinimizeBtn, 8)
MinimizeBtn.MouseButton1Click:Connect(function() showMain(false) end)

local AutoJoinBtn = make("TextButton", {
    Size = UDim2.new(0, 130, 0, 32),
    Position = UDim2.new(1, -180, 0.5, -16),
    BackgroundColor3 = Color3.fromRGB(0, 180, 90),
    BorderSizePixel = 0,
    Text = "⚡ AUTO-JOIN: ON",
    TextColor3 = COL_WHITE,
    TextSize = 10,
    Font = Enum.Font.GothamBold,
}, Header)
corner(AutoJoinBtn, 8)
local AutoStroke = stroke(AutoJoinBtn, Color3.fromRGB(80, 255, 150), 1)

AutoJoinBtn.MouseButton1Click:Connect(function()
    autoJoinEnabled = not autoJoinEnabled
    if autoJoinEnabled then
        AutoJoinBtn.Text = "⚡ AUTO-JOIN: ON"
        AutoJoinBtn.BackgroundColor3 = Color3.fromRGB(0, 180, 90)
        AutoJoinBtn.TextColor3 = COL_WHITE
        AutoStroke.Color = Color3.fromRGB(80, 255, 150)
    else
        AutoJoinBtn.Text = "⚡ AUTO-JOIN: OFF"
        AutoJoinBtn.BackgroundColor3 = Color3.fromRGB(30, 33, 45)
        AutoJoinBtn.TextColor3 = Color3.fromRGB(150, 150, 170)
        AutoStroke.Color = Color3.fromRGB(50, 55, 70)
    end
end)

-- Sidebar y contenedor de páginas
local Sidebar = make("Frame", {
    Size = UDim2.new(0, 160, 1, -52),
    Position = UDim2.new(0, 0, 0, 52),
    BackgroundColor3 = Color3.fromRGB(17, 18, 24),
    BorderSizePixel = 0,
}, MainFrame)

local PageContainer = make("Frame", {
    Size = UDim2.new(1, -180, 1, -70),
    Position = UDim2.new(0, 172, 0, 62),
    BackgroundTransparency = 1,
}, MainFrame)

-- ---------------------------------------------------------------------
-- TAB 1: RADAR
-- ---------------------------------------------------------------------
local DetectionsPage = make("ScrollingFrame", {
    Size = UDim2.new(1, 0, 1, 0),
    BackgroundTransparency = 1,
    BorderSizePixel = 0,
    ScrollBarThickness = 0,
    AutomaticCanvasSize = Enum.AutomaticSize.Y,
    CanvasSize = UDim2.new(0, 0, 0, 0),
}, PageContainer)
make("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, DetectionsPage)

local TableHeader = make("Frame", {
    Size = UDim2.new(1, 0, 0, 26),
    BackgroundColor3 = Color3.fromRGB(18, 20, 26),
    BorderSizePixel = 0,
    LayoutOrder = 0,
}, DetectionsPage)
corner(TableHeader, 6)

local function cell(parent, text, x, w, color, font)
    return make("TextLabel", {
        Size = UDim2.new(0, w, 1, 0),
        Position = UDim2.new(0, x, 0, 0),
        BackgroundTransparency = 1,
        Text = text,
        TextColor3 = color,
        TextSize = 11,
        Font = font or Enum.Font.Gotham,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextTruncate = Enum.TextTruncate.AtEnd,
    }, parent)
end

local HEADER_COLOR = Color3.fromRGB(130, 135, 155)
cell(TableHeader, "Name / Color", 56, 140, HEADER_COLOR, Enum.Font.GothamBold)
cell(TableHeader, "Owner", 200, 95, HEADER_COLOR, Enum.Font.GothamBold)
cell(TableHeader, "Farm", 300, 85, HEADER_COLOR, Enum.Font.GothamBold)
cell(TableHeader, "Plrs", 390, 50, HEADER_COLOR, Enum.Font.GothamBold)
cell(TableHeader, "Added", 445, 70, HEADER_COLOR, Enum.Font.GothamBold)

-- ---------------------------------------------------------------------
-- TAB 2: BRAINROTS (con buscador y botones All / None / Priority)
-- ---------------------------------------------------------------------
local BrainrotsPage = make("Frame", {
    Size = UDim2.new(1, 0, 1, 0),
    BackgroundTransparency = 1,
    Visible = false,
}, PageContainer)

local Toolbar = make("Frame", { Size = UDim2.new(1, 0, 0, 28), BackgroundTransparency = 1 }, BrainrotsPage)

local SearchBox = make("TextBox", {
    Size = UDim2.new(0, 190, 0, 28),
    BackgroundColor3 = COL_BG,
    BorderSizePixel = 0,
    Text = "",
    PlaceholderText = "Buscar...",
    PlaceholderColor3 = COL_MUTED,
    TextColor3 = COL_WHITE,
    TextSize = 12,
    Font = Enum.Font.Gotham,
    ClearTextOnFocus = false,
}, Toolbar)
corner(SearchBox, 6)

local function toolButton(text, x, w, color)
    local b = make("TextButton", {
        Size = UDim2.new(0, w, 0, 28),
        Position = UDim2.new(0, x, 0, 0),
        BackgroundColor3 = color,
        BorderSizePixel = 0,
        Text = text,
        TextColor3 = COL_WHITE,
        TextSize = 10,
        Font = Enum.Font.GothamBold,
    }, Toolbar)
    corner(b, 6)
    return b
end
local BtnAll = toolButton("All", 198, 50, Color3.fromRGB(25, 90, 55))
local BtnNone = toolButton("None", 252, 50, Color3.fromRGB(110, 40, 40))
local BtnPrio = toolButton("Priority", 306, 80, Color3.fromRGB(40, 60, 110))

local BrainrotsScroll = make("ScrollingFrame", {
    Size = UDim2.new(1, 0, 1, -34),
    Position = UDim2.new(0, 0, 0, 34),
    BackgroundTransparency = 1,
    BorderSizePixel = 0,
    ScrollBarThickness = 0,
    AutomaticCanvasSize = Enum.AutomaticSize.Y,
    CanvasSize = UDim2.new(0, 0, 0, 0),
}, BrainrotsPage)
make("UIGridLayout", { CellSize = UDim2.new(0, 148, 0, 72), CellPadding = UDim2.new(0, 8, 0, 8) }, BrainrotsScroll)

local brainrotCards = {}
for _, item in ipairs(BRAINROT_DATABASE) do
    local Card = make("Frame", { BackgroundColor3 = COL_BG, BorderSizePixel = 0 }, BrainrotsScroll)
    corner(Card, 8)
    stroke(Card, item.isOG and COL_GOLD or Color3.fromRGB(35, 39, 50), item.isOG and 1.5 or 1)

    local hasImage = item.image ~= "rbxassetid://0"
    if hasImage then
        local Img = make("ImageLabel", {
            Size = UDim2.new(0, 22, 0, 22), Position = UDim2.new(0, 6, 0, 6),
            BackgroundTransparency = 1, BorderSizePixel = 0, Image = item.image,
        }, Card)
        corner(Img, 6)
    end

    make("TextLabel", {
        Size = UDim2.new(1, hasImage and -38 or -12, 0, 34),
        Position = UDim2.new(0, hasImage and 32 or 6, 0, 4),
        BackgroundTransparency = 1,
        Text = item.name,
        TextColor3 = item.isOG and Color3.fromRGB(255, 230, 130) or Color3.fromRGB(220, 220, 235),
        TextSize = 10,
        Font = Enum.Font.GothamBold,
        TextWrapped = true,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextYAlignment = Enum.TextYAlignment.Top,
    }, Card)

    local Toggle = make("TextButton", {
        Size = UDim2.new(1, -12, 0, 24),
        Position = UDim2.new(0, 6, 1, -30),
        BorderSizePixel = 0,
        TextColor3 = COL_WHITE,
        TextSize = 10,
        Font = Enum.Font.GothamBold,
    }, Card)
    corner(Toggle, 6)

    local function paint()
        local on = SelectedBrainrots[item.name]
        Toggle.Text = on and "✓ ON" or "✕ OFF"
        Toggle.BackgroundColor3 = on and COL_ON or COL_OFF
    end
    paint()

    Toggle.MouseButton1Click:Connect(function()
        SelectedBrainrots[item.name] = not SelectedBrainrots[item.name]
        paint()
        lastSignature = ""
    end)

    brainrotCards[item.name] = { frame = Card, paint = paint, nameLower = item.name:lower() }
end

SearchBox:GetPropertyChangedSignal("Text"):Connect(function()
    local q = SearchBox.Text:lower()
    for _, c in pairs(brainrotCards) do
        c.frame.Visible = (q == "") or (c.nameLower:find(q, 1, true) ~= nil)
    end
end)

local function setVisibleCards(value)
    for name, c in pairs(brainrotCards) do
        if c.frame.Visible then
            SelectedBrainrots[name] = value
            c.paint()
        end
    end
    lastSignature = ""
end
BtnAll.MouseButton1Click:Connect(function() setVisibleCards(true) end)
BtnNone.MouseButton1Click:Connect(function() setVisibleCards(false) end)
BtnPrio.MouseButton1Click:Connect(function()
    for _, item in ipairs(BRAINROT_DATABASE) do
        SelectedBrainrots[item.name] = item.priority
        brainrotCards[item.name].paint()
    end
    lastSignature = ""
end)

-- ---------------------------------------------------------------------
-- TAB 3: COLORS (orden de prioridad de materiales)
-- ---------------------------------------------------------------------
local ColorsPage = make("ScrollingFrame", {
    Size = UDim2.new(1, 0, 1, 0),
    BackgroundTransparency = 1,
    BorderSizePixel = 0,
    ScrollBarThickness = 0,
    Visible = false,
    AutomaticCanvasSize = Enum.AutomaticSize.Y,
    CanvasSize = UDim2.new(0, 0, 0, 0),
}, PageContainer)
make("UIListLayout", { Padding = UDim.new(0, 6) }, ColorsPage)

local function refreshColorsList()
    for _, child in ipairs(ColorsPage:GetChildren()) do
        if child:IsA("Frame") then child:Destroy() end
    end
    lastSignature = ""

    for i, matName in ipairs(Settings.MaterialOrder) do
        local Row = make("Frame", {
            Size = UDim2.new(1, 0, 0, 42),
            BackgroundColor3 = COL_BG,
            BorderSizePixel = 0,
        }, ColorsPage)
        corner(Row, 8)

        make("TextLabel", {
            Size = UDim2.new(0, 35, 1, 0),
            Position = UDim2.new(0, 10, 0, 0),
            BackgroundTransparency = 1,
            Text = "#" .. i,
            TextColor3 = COL_GOLD,
            TextSize = 12,
            Font = Enum.Font.GothamBlack,
            TextXAlignment = Enum.TextXAlignment.Left,
        }, Row)

        local Icon = make("ImageLabel", {
            Size = UDim2.new(0, 24, 0, 24),
            Position = UDim2.new(0, 50, 0.5, -12),
            BackgroundTransparency = 1,
            BorderSizePixel = 0,
            Image = MATERIAL_ICONS[matName] or MATERIAL_ICONS.Default,
        }, Row)
        corner(Icon, 6)

        make("TextLabel", {
            Size = UDim2.new(0.5, 0, 1, 0),
            Position = UDim2.new(0, 84, 0, 0),
            BackgroundTransparency = 1,
            Text = matName,
            TextColor3 = Color3.fromRGB(240, 240, 250),
            TextSize = 12,
            Font = Enum.Font.GothamBold,
            TextXAlignment = Enum.TextXAlignment.Left,
        }, Row)

        local Up = make("TextButton", {
            Size = UDim2.new(0, 36, 0, 26),
            Position = UDim2.new(1, -80, 0.5, -13),
            BackgroundColor3 = Color3.fromRGB(40, 45, 60),
            BorderSizePixel = 0,
            Text = "⬆️",
            TextColor3 = COL_WHITE,
            TextSize = 12,
        }, Row)
        corner(Up, 6)
        Up.MouseButton1Click:Connect(function()
            if i > 1 then
                Settings.MaterialOrder[i], Settings.MaterialOrder[i - 1] = Settings.MaterialOrder[i - 1], Settings.MaterialOrder[i]
                refreshColorsList()
            end
        end)

        local Down = make("TextButton", {
            Size = UDim2.new(0, 36, 0, 26),
            Position = UDim2.new(1, -38, 0.5, -13),
            BackgroundColor3 = Color3.fromRGB(40, 45, 60),
            BorderSizePixel = 0,
            Text = "⬇️",
            TextColor3 = COL_WHITE,
            TextSize = 12,
        }, Row)
        corner(Down, 6)
        Down.MouseButton1Click:Connect(function()
            if i < #Settings.MaterialOrder then
                Settings.MaterialOrder[i], Settings.MaterialOrder[i + 1] = Settings.MaterialOrder[i + 1], Settings.MaterialOrder[i]
                refreshColorsList()
            end
        end)
    end
end
refreshColorsList()

-- ---------------------------------------------------------------------
-- TAB 4: SETTINGS
-- ---------------------------------------------------------------------
local SettingsPage = make("ScrollingFrame", {
    Size = UDim2.new(1, 0, 1, 0),
    BackgroundTransparency = 1,
    BorderSizePixel = 0,
    ScrollBarThickness = 0,
    Visible = false,
    AutomaticCanvasSize = Enum.AutomaticSize.Y,
    CanvasSize = UDim2.new(0, 0, 0, 0),
}, PageContainer)
make("UIListLayout", { Padding = UDim.new(0, 8) }, SettingsPage)

local function settingRow(label)
    local Row = make("Frame", { Size = UDim2.new(1, 0, 0, 40), BackgroundColor3 = COL_BG, BorderSizePixel = 0 }, SettingsPage)
    corner(Row, 8)
    make("TextLabel", {
        Size = UDim2.new(1, -70, 1, 0), Position = UDim2.new(0, 14, 0, 0),
        BackgroundTransparency = 1, Text = label, TextColor3 = Color3.fromRGB(230, 230, 240),
        TextSize = 12, Font = Enum.Font.GothamSemibold, TextXAlignment = Enum.TextXAlignment.Left,
    }, Row)
    return Row
end

local function addToggle(label, key)
    local Row = settingRow(label)
    local Btn = make("TextButton", {
        Size = UDim2.new(0, 42, 0, 22), Position = UDim2.new(1, -56, 0.5, -11),
        BackgroundColor3 = Settings[key] and Color3.fromRGB(60, 130, 246) or Color3.fromRGB(30, 36, 52),
        BorderSizePixel = 0, Text = "",
    }, Row)
    corner(Btn, 11)
    local Knob = make("Frame", {
        Size = UDim2.new(0, 16, 0, 16),
        Position = Settings[key] and UDim2.new(1, -19, 0, 3) or UDim2.new(0, 3, 0, 3),
        BackgroundColor3 = COL_WHITE, BorderSizePixel = 0,
    }, Btn)
    corner(Knob, 8)
    Btn.MouseButton1Click:Connect(function()
        Settings[key] = not Settings[key]
        Btn.BackgroundColor3 = Settings[key] and Color3.fromRGB(60, 130, 246) or Color3.fromRGB(30, 36, 52)
        Knob.Position = Settings[key] and UDim2.new(1, -19, 0, 3) or UDim2.new(0, 3, 0, 3)
        lastSignature = ""
    end)
end

local function addNumber(label, key, maxValue)
    local Row = settingRow(label)
    local Box = make("TextBox", {
        Size = UDim2.new(0, 44, 0, 26), Position = UDim2.new(1, -58, 0.5, -13),
        BackgroundColor3 = Color3.fromRGB(30, 36, 52), BorderSizePixel = 0,
        Text = tostring(Settings[key]), TextColor3 = COL_WHITE, TextSize = 13,
        Font = Enum.Font.GothamBold, ClearTextOnFocus = false,
    }, Row)
    corner(Box, 5)
    Box.FocusLost:Connect(function()
        local n = tonumber(Box.Text)
        if n and n >= 1 and n <= maxValue then
            Settings[key] = math.floor(n)
        end
        Box.Text = tostring(Settings[key])
    end)
end

addToggle("Recibir Highlights (100M/s o más)", "Highlights")
addToggle("Recibir Midlights", "Midlights")
addToggle("Sonido al detectar", "PlaySound")
addToggle("Auto-ejecutar tras cada teleport", "AutoExecute")
addNumber("Reintentos de join", "AutoJoinRetries", 10)

local RelogRow = settingRow("Relog (volver al juego principal)")
local RelogBtn = make("TextButton", {
    Size = UDim2.new(0, 90, 0, 26), Position = UDim2.new(1, -104, 0.5, -13),
    BackgroundColor3 = Color3.fromRGB(180, 50, 50), BorderSizePixel = 0,
    Text = "🔄 RELOG", TextColor3 = COL_WHITE, Font = Enum.Font.GothamBold, TextSize = 10,
}, RelogRow)
corner(RelogBtn, 6)
RelogBtn.MouseButton1Click:Connect(function()
    TeleportService:Teleport(CONFIG.TARGET_PLACE_ID, LocalPlayer)
end)

-- ---------------------------------------------------------------------
-- PESTAÑAS
-- ---------------------------------------------------------------------
local pages = { DetectionsPage, BrainrotsPage, ColorsPage, SettingsPage }
local tabButtons = {}

local function switchTab(active)
    for i, page in ipairs(pages) do
        page.Visible = (i == active)
        tabButtons[i].BackgroundColor3 = (i == active) and Color3.fromRGB(28, 32, 44) or Color3.fromRGB(20, 22, 30)
        tabButtons[i].TextColor3 = (i == active) and COL_WHITE or COL_MUTED
    end
end

local TAB_NAMES = { "📡 LIVE RADAR", "🎯 BRAINROTS", "🎨 COLORS", "⚙️ SETTINGS" }
for i, name in ipairs(TAB_NAMES) do
    local btn = make("TextButton", {
        Size = UDim2.new(1, -20, 0, 38),
        Position = UDim2.new(0, 10, 0, 15 + (i - 1) * 45),
        BorderSizePixel = 0,
        Text = name,
        TextSize = 12,
        Font = Enum.Font.GothamBold,
    }, Sidebar)
    corner(btn, 8)
    tabButtons[i] = btn
    btn.MouseButton1Click:Connect(function() switchTab(i) end)
end
switchTab(1)

UserInputService.InputBegan:Connect(function(input, processed)
    if not processed and input.UserInputType == Enum.UserInputType.Keyboard and input.KeyCode.Name == Settings.ToggleKey then
        showMain(not MainFrame.Visible)
    end
end)

-- ---------------------------------------------------------------------
-- LISTA DE DETECCIONES
-- ---------------------------------------------------------------------
local function computeFiltered()
    local out = {}
    for _, s in ipairs(latestRaw) do
        if SelectedBrainrots[s.brainrotName] == true
            and (s.ageSeconds or 0) <= CONFIG.MAX_AGE_SECONDS
            and tierAllowed(s._tier) then
            table.insert(out, s)
        end
    end
    table.sort(out, function(a, b)
        local wA, wB = getMaterialWeight(a.material or "Normal"), getMaterialWeight(b.material or "Normal")
        if wA ~= wB then return wA > wB end
        if a._income ~= b._income then return a._income > b._income end
        return (a.id or 0) > (b.id or 0)
    end)
    return out
end

local function buildCard(server, order)
    local mat = server.material or "Normal"
    local isHighTier = getMaterialWeight(mat) >= (#Settings.MaterialOrder - 5)
    local accent = TIER_COLORS[server._tier or "Unknown"]

    local Card = make("Frame", {
        Size = UDim2.new(1, 0, 0, 44),
        BackgroundColor3 = COL_BG,
        BorderSizePixel = 0,
        LayoutOrder = order,
    }, DetectionsPage)
    corner(Card, 8)
    stroke(Card, isHighTier and COL_GOLD or Color3.fromRGB(40, 45, 60), isHighTier and 1.2 or 1)

    -- barra de tier (rojo = Highlight, azul = Midlight)
    make("Frame", { Size = UDim2.new(0, 3, 0.65, 0), Position = UDim2.new(0, 0, 0.175, 0), BackgroundColor3 = accent, BorderSizePixel = 0 }, Card)

    local Icon = make("ImageLabel", {
        Size = UDim2.new(0, 24, 0, 24),
        Position = UDim2.new(0, 8, 0.5, -12),
        BackgroundTransparency = 1,
        BorderSizePixel = 0,
        Image = MATERIAL_ICONS[mat] or MATERIAL_ICONS.Default,
    }, Card)
    corner(Icon, 6)

    -- muestra del color detectado por el bot
    local Swatch = make("Frame", {
        Size = UDim2.new(0, 12, 0, 12),
        Position = UDim2.new(0, 38, 0.5, -6),
        BackgroundColor3 = hexToColor3(server.colorHex) or Color3.fromRGB(90, 95, 110),
        BorderSizePixel = 0,
    }, Card)
    corner(Swatch, 6)
    stroke(Swatch, COL_WHITE, 1)
    if mat == "Rainbow" then
        local grad = Instance.new("UIGradient")
        grad.Color = ColorSequence.new({
            ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 0, 0)),
            ColorSequenceKeypoint.new(0.2, Color3.fromRGB(255, 200, 0)),
            ColorSequenceKeypoint.new(0.4, Color3.fromRGB(0, 220, 80)),
            ColorSequenceKeypoint.new(0.6, Color3.fromRGB(0, 190, 255)),
            ColorSequenceKeypoint.new(0.8, Color3.fromRGB(150, 60, 255)),
            ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 0, 150)),
        })
        grad.Rotation = 45
        grad.Parent = Swatch
    end

    make("TextLabel", {
        Size = UDim2.new(0, 140, 0, 20),
        Position = UDim2.new(0, 56, 0, 4),
        BackgroundTransparency = 1,
        Text = tostring(server.brainrotName),
        TextColor3 = Color3.fromRGB(240, 240, 250),
        TextSize = 11,
        Font = Enum.Font.GothamBold,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextTruncate = Enum.TextTruncate.AtEnd,
    }, Card)

    local colorText = (server.colorName and server.colorName ~= "") and (" · " .. server.colorName) or ""
    make("TextLabel", {
        Size = UDim2.new(0, 140, 0, 16),
        Position = UDim2.new(0, 56, 0, 22),
        BackgroundTransparency = 1,
        Text = mat .. colorText,
        TextColor3 = isHighTier and COL_GOLD or Color3.fromRGB(150, 155, 175),
        TextSize = 9,
        Font = Enum.Font.Gotham,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextTruncate = Enum.TextTruncate.AtEnd,
    }, Card)

    cell(Card, tostring(server.owner or "?"), 200, 95, Color3.fromRGB(170, 175, 195))
    cell(Card, tostring(server.incomeRate or "?"), 300, 85, Color3.fromRGB(0, 255, 136), Enum.Font.GothamBold)
    cell(Card, tostring(server.players or "?"), 390, 50, Color3.fromRGB(200, 200, 210))
    addedLabels[server.id] = cell(Card, tostring(server.timeAgo or ""), 445, 70, Color3.fromRGB(150, 155, 175))

    local JoinBtn = make("TextButton", {
        Size = UDim2.new(0, 80, 0, 28),
        Position = UDim2.new(1, -90, 0.5, -14),
        BackgroundColor3 = isHighTier and Color3.fromRGB(210, 150, 0) or Color3.fromRGB(180, 40, 70),
        BorderSizePixel = 0,
        Text = "⚡ Join",
        TextColor3 = COL_WHITE,
        Font = Enum.Font.GothamBold,
        TextSize = 11,
    }, Card)
    corner(JoinBtn, 6)
    JoinBtn.MouseButton1Click:Connect(function()
        joinServer(server.jobId)
    end)
end

render = function()
    local filtered = computeFiltered()

    local parts = {}
    for _, s in ipairs(filtered) do
        table.insert(parts, tostring(s.id) .. (s.material or "") .. (s.colorHex or "") .. tostring(s.players))
    end
    local sig = table.concat(parts, ",")

    if sig ~= lastSignature then
        lastSignature = sig
        addedLabels = {}
        for _, child in ipairs(DetectionsPage:GetChildren()) do
            if child:IsA("Frame") and child ~= TableHeader then child:Destroy() end
        end
        for i, s in ipairs(filtered) do buildCard(s, i) end
    else
        for _, s in ipairs(filtered) do
            local lbl = addedLabels[s.id]
            if lbl then lbl.Text = tostring(s.timeAgo or "") end
        end
    end
end

-- ---------------------------------------------------------------------
-- CONSULTA AL SERVIDOR + AVISOS
-- ---------------------------------------------------------------------
local seenKeys = {}
local primed = false
local fetching = false

local function refreshDetections()
    if fetching then return end
    fetching = true
    local ok, err = pcall(function()
        local data = apiGet("/api/servers")
        if not data or type(data.servers) ~= "table" then return end

        for _, s in ipairs(data.servers) do
            s._income = parseIncome(s.incomeRate)
            s._tier = tierFromIncome(s._income)
        end
        latestRaw = data.servers

        local filtered = computeFiltered()
        setStatus("📡 " .. #filtered .. " servidores")

        -- aviso solo de detecciones nuevas (la primera carga no avisa)
        for _, s in ipairs(filtered) do
            local key = tostring(s.jobId) .. "|" .. tostring(s.brainrotName) .. "|" .. tostring(s.material)
            if not seenKeys[key] then
                seenKeys[key] = true
                if primed then notify(s) end
            end
        end
        primed = true

        if MainFrame.Visible then render() end
    end)
    fetching = false
    if not ok then warn("[Babylive] " .. tostring(err)) end
end

-- ---------------------------------------------------------------------
-- AUTO-JOIN (el servidor reparte un jobId distinto a cada bot)
-- ---------------------------------------------------------------------
local function autoJoinStep()
    if not autoJoinEnabled or teleporting then return end
    if tick() - arrivedAt < CONFIG.STAY_SECONDS then return end

    local exclude = {}
    for name, on in pairs(SelectedBrainrots) do
        if on == false then table.insert(exclude, name) end
    end

    local path = "/api/next?bot=" .. HttpService:UrlEncode(LocalPlayer.Name)
        .. "&current=" .. HttpService:UrlEncode(game.JobId)
        .. "&exclude=" .. HttpService:UrlEncode(table.concat(exclude, "|"))

    local data = apiGet(path)
    local s = data and data.server
    if type(s) == "table" and s.jobId then
        local tier = tierFromIncome(parseIncome(s.incomeRate))
        if tierAllowed(tier) then
            setStatus("➡️ " .. tostring(s.brainrotName) .. " [" .. tostring(s.material) .. "]")
            joinServer(s.jobId)
        end
    end
end

task.spawn(function()
    while true do
        pcall(autoJoinStep)
        refreshDetections()
        saveSettings()
        task.wait(CONFIG.POLL_SECONDS)
    end
end)
