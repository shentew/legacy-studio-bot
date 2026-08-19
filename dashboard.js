module.exports = (client) => {
    const express = require('express');
    const multer = require('multer');
    const fs = require('fs');
    const path = require('path');
    const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

    const app = express();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🌐 Dashboard corriendo en puerto ${PORT}`));

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    const upload = multer({ dest: 'uploads/' });
    const configPath = path.join(__dirname, 'ticketConfig.json');

    function getConfig() {
        if (fs.existsSync(configPath)) {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) {
                console.error("Error leyendo config, usando valores por defecto");
            }
        }
        return {
            guildId: '', logChannelId: '', ticketPrefix: 'ticket', maxTicketsPerUser: 1,
            ticketPanel: { targetChannelId: '', staffRoleId: '', options: 'Soporte,Reclamos', embedTitle: '🎫 Centro de Soporte', embedDescription: '¡Hola! 👋 Selecciona el motivo de tu consulta.', embedColor: '#a855f7' },
            suggestionChannelId: '',
            bannedWords: 'insulto, estafa, spam, discord.gg'
        };
    }

    function saveConfig(data) { fs.writeFileSync(configPath, JSON.stringify(data, null, 2)); }

    // ==========================================
    // APIs
    // ==========================================
    app.get('/api/guild-data', async (req, res) => {
        try {
            const guildId = req.query.guildId || client.guilds.cache.first()?.id;
            if (!guildId) return res.status(404).json({ error: "No hay servidores" });
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ error: "Servidor no encontrado" });

            const roles = await guild.roles.fetch();
            const channels = await guild.channels.fetch();
            const guilds = client.guilds.cache.map(g => ({ id: g.id, name: g.name }));

            const rolesArray = roles.filter(r => r.id !== guild.id).sort((a,b) => b.position - a.position).map(r => ({ id: r.id, name: r.name }));
            const channelsArray = channels.filter(c => c.isTextBased() && !c.isThread()).map(c => ({ id: c.id, name: `#${c.name}` }));

            res.json({ guilds, currentGuildId: guild.id, roles: rolesArray, channels: channelsArray });
        } catch (error) {
            res.status(500).json({ error: "Error cargando datos" });
        }
    });

    app.post('/api/send-panel', upload.single('thumbnailFile'), async (req, res) => {
        try {
            const { targetChannelId, embedTitle, embedDescription, embedColor, options } = req.body;
            
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            
            const guildId = config.guildId || client.guilds.cache.first()?.id;
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(400).json({ error: "Servidor no encontrado." });
            }

            const channel = await guild.channels.fetch(targetChannelId).catch(() => null);
            
            if (!channel) {
                return res.status(400).json({ error: "Canal no encontrado. Vuelve a seleccionarlo en el menú." });
            }

            const embed = new EmbedBuilder()
                .setColor(embedColor || '#a855f7')
                .setTitle(embedTitle || 'Tickets')
                .setDescription(embedDescription || 'Selecciona una opción.')
                .setFooter({ text: 'Sistema de Tickets Premium' });

            let filesToSend = [];
            if (req.file) {
                const attachment = new AttachmentBuilder(req.file.path, { name: 'thumbnail.png' });
                filesToSend.push(attachment);
                embed.setThumbnail('attachment://thumbnail.png');
            }

            const opcionesArray = options ? options.split(',').map(opt => opt.trim()) : ['Soporte'];
            
            // ✨ CORRECCIÓN: Usar el texto de la opción (limpio) como valor
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('crear_ticket_menu')
                .setPlaceholder('Selecciona una opción...')
                .addOptions(opcionesArray.map(opt => {
                    const cleanValue = opt
                        .toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-')
                        .substring(0, 50);

                    return {
                        label: opt,
                        value: cleanValue
                    };
                }));

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await channel.send({ embeds: [embed], components: [row], files: filesToSend });

            if (req.file) fs.unlinkSync(req.file.path);
            res.json({ success: true, message: "Panel enviado con éxito" });
        } catch (error) {
            console.error("Error en send-panel:", error);
            res.status(500).json({ error: "Error al enviar: " + error.message });
        }
    });

    app.post('/save', (req, res) => {
        const newConfig = {
            guildId: req.body.guildId || '',
            logChannelId: req.body.logChannelId || '',
            ticketPrefix: req.body.ticketPrefix || 'ticket',
            maxTicketsPerUser: parseInt(req.body.maxTicketsPerUser) || 1,
            ticketPanel: {
                targetChannelId: req.body.targetChannelId || '',
                staffRoleId: req.body.staffRoleId || '',
                options: req.body.options || 'Soporte,Reclamos',
                embedTitle: req.body.embedTitle || '🎫 Centro de Soporte',
                embedDescription: req.body.embedDescription || '¡Hola! 👋 Selecciona el motivo.',
                embedColor: req.body.embedColor || '#a855f7'
            },
            suggestionChannelId: req.body.suggestionChannelId || '',
            bannedWords: req.body.bannedWords || ''
        };
        saveConfig(newConfig);
        res.json({ success: true });
    });

    // ==========================================
    // PÁGINA PRINCIPAL
    // ==========================================
    app.get('/', (req, res) => {
        const config = getConfig();
        const panel = config.ticketPanel || {};

        res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Premium | Legacy Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: {
                        primary: { 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
                        dark: { 900: '#0a0a0f', 800: '#13131f', 700: '#1c1c2e' }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #0a0a0f; }
        .glass { background: rgba(28, 28, 46, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(168, 85, 247, 0.15); }
        .glass-input { background: rgba(10, 10, 15, 0.6); border: 1px solid rgba(168, 85, 247, 0.2); transition: all 0.3s ease; }
        .glass-input:focus { border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15); outline: none; }
        .glow-btn { background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%); transition: all 0.3s ease; }
        .glow-btn:hover { box-shadow: 0 0 25px rgba(168, 85, 247, 0.5); transform: translateY(-1px); }
        .tab-active { color: #a855f7; border-bottom: 2px solid #a855f7; text-shadow: 0 0 10px rgba(168, 85, 247, 0.3); }
        .tab-inactive { color: #6b7280; }
        .tab-inactive:hover { color: #d1d5db; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #3f3f56; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #a855f7; }
    </style>
</head>
<body class="text-gray-300 min-h-screen relative overflow-x-hidden">
    <div class="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-dark-900 to-dark-900 pointer-events-none"></div>
    <div class="fixed top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="fixed bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="relative z-10 max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
        <div class="text-center mb-10">
            <h1 class="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                Panel de <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-indigo-400">Control</span>
            </h1>
            <p class="text-gray-400 text-lg">Configurar Bot Legacy Studio, Hecho Por @shentew__</p>
        </div>

        <div class="glass rounded-2xl shadow-2xl overflow-hidden">
            <div class="flex border-b border-white/5 bg-dark-800/50 overflow-x-auto">
                <button onclick="showTab('general')" id="tab-general" class="tab-active flex-1 py-5 font-semibold text-center transition-all duration-300 hover:bg-white/5 whitespace-nowrap px-4">⚙️ General</button>
                <button onclick="showTab('panel')" id="tab-panel" class="tab-inactive flex-1 py-5 font-semibold text-center transition-all duration-300 hover:bg-white/5 whitespace-nowrap px-4">🎫 Tickets</button>
                <button onclick="showTab('mod')" id="tab-mod" class="tab-inactive flex-1 py-5 font-semibold text-center transition-all duration-300 hover:bg-white/5 whitespace-nowrap px-4">🛡️ Moderación</button>
            </div>

            <form id="mainForm" class="p-6 md:p-10 space-y-8">
                <!-- TAB 1: GENERAL -->
                <div id="content-general" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Servidor de Discord</label>
                            <select name="guildId" id="guildSelect" class="glass-input w-full p-3.5 rounded-xl text-white" onchange="loadGuildData(this.value)"></select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Canal de Logs (Transcripciones)</label>
                            <select name="logChannelId" id="logChannelSelect" class="glass-input w-full p-3.5 rounded-xl text-white"></select>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Prefijo del Canal</label>
                            <input type="text" name="ticketPrefix" value="${config.ticketPrefix}" class="glass-input w-full p-3.5 rounded-xl text-white" placeholder="ticket">
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Máx. Tickets por Usuario</label>
                            <input type="number" name="maxTicketsPerUser" value="${config.maxTicketsPerUser}" min="1" max="10" class="glass-input w-full p-3.5 rounded-xl text-white">
                        </div>
                    </div>
                    <button type="button" onclick="saveGeneral()" class="w-full md:w-auto px-8 py-3.5 rounded-xl font-semibold text-white glow-btn mt-4">💾 Guardar Ajustes Generales</button>
                </div>

                <!-- TAB 2: PANEL -->
                <div id="content-panel" class="space-y-6 hidden">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Canal de Destino</label>
                            <select name="targetChannelId" id="targetChannelSelect" class="glass-input w-full p-3.5 rounded-xl text-white"></select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Rol del Staff</label>
                            <select name="staffRoleId" id="staffRoleSelect" class="glass-input w-full p-3.5 rounded-xl text-white"></select>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-gray-400">Opciones del Menú (separadas por coma)</label>
                        <input type="text" name="options" value="${panel.options}" class="glass-input w-full p-3.5 rounded-xl text-white" placeholder="Soporte Técnico, Reclamos, Sugerencias">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="md:col-span-2 space-y-2">
                            <label class="text-sm font-medium text-gray-400">Título del Embed</label>
                            <input type="text" name="embedTitle" value="${panel.embedTitle}" class="glass-input w-full p-3.5 rounded-xl text-white">
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Color del Borde</label>
                            <div class="flex items-center gap-3">
                                <input type="color" name="embedColor" value="${panel.embedColor}" class="h-12 w-16 rounded-lg cursor-pointer bg-transparent border-0 p-0" oninput="this.nextElementSibling.value = this.value">
                                <input type="text" value="${panel.embedColor}" class="glass-input flex-1 p-3.5 rounded-xl text-white font-mono text-sm" readonly>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-gray-400">Descripción del Mensaje</label>
                        <textarea name="embedDescription" rows="4" class="glass-input w-full p-3.5 rounded-xl text-white resize-none" placeholder="Escribe el mensaje de bienvenida...">${panel.embedDescription}</textarea>
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-gray-400">📷 Imagen Miniatura (Opcional)</label>
                        <div class="relative group">
                            <input type="file" name="thumbnailFile" id="thumbnailFile" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                            <div class="glass-input border-dashed border-2 border-primary-500/30 group-hover:border-primary-500/60 rounded-xl p-8 text-center transition-all duration-300">
                                <svg class="w-10 h-10 mx-auto text-primary-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <p class="text-sm text-gray-300 font-medium">Haz clic o arrastra una imagen aquí</p>
                                <p class="text-xs text-gray-500 mt-1">PNG, JPG o GIF (Se adjuntará automáticamente)</p>
                            </div>
                        </div>
                    </div>
                    <div class="pt-6 border-t border-white/5">
                        <button type="button" onclick="sendPanel()" class="w-full py-4 rounded-xl font-bold text-lg text-white glow-btn flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            🚀 ENVIAR PANEL A DISCORD
                        </button>
                    </div>
                </div>

                <!-- TAB 3: MODERACIÓN -->
                <div id="content-mod" class="space-y-6 hidden">
                    <div class="bg-primary-600/10 border border-primary-500/30 rounded-xl p-5">
                        <h3 class="text-primary-500 font-bold mb-2 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            Sistema de Sugerencias
                        </h3>
                        <p class="text-sm text-gray-400 mb-4">Los usuarios usarán <code class="bg-dark-900 px-2 py-1 rounded text-primary-400 font-mono text-xs">/sugerencia</code> y el bot lo enviará aquí con botones de aprobar/rechazar.</p>
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Canal de Sugerencias</label>
                            <select name="suggestionChannelId" id="suggestionChannelSelect" class="glass-input w-full p-3.5 rounded-xl text-white"></select>
                        </div>
                    </div>

                    <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                        <h3 class="text-red-400 font-bold mb-2 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Auto-Moderación
                        </h3>
                        <p class="text-sm text-gray-400 mb-4">El bot borrará automáticamente los mensajes que contengan estas palabras. Sepáralas por comas.</p>
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-400">Palabras Prohibidas</label>
                            <textarea name="bannedWords" rows="3" class="glass-input w-full p-3.5 rounded-xl text-white font-mono text-sm" placeholder="palabra1, palabra2, palabra3">${config.bannedWords || ''}</textarea>
                        </div>
                    </div>

                    <button type="button" onclick="saveGeneral()" class="w-full md:w-auto px-8 py-3.5 rounded-xl font-semibold text-white glow-btn mt-4">💾 Guardar Configuración de Moderación</button>
                </div>
            </form>
        </div>
        <p class="text-center text-gray-600 text-sm mt-8">Desarrollado Por @shentew__ para 💜 Legacy Studio 💜</p>
    </div>

    <script>
        function showTab(tabName) {
            document.getElementById('content-general').classList.add('hidden');
            document.getElementById('content-panel').classList.add('hidden');
            document.getElementById('content-mod').classList.add('hidden');
            
            document.getElementById('tab-general').className = 'tab-inactive flex-1 py-5 font-semibold text-center transition-all duration-300 hover:bg-white/5 whitespace-nowrap px-4';
            document.getElementById('tab-panel').className = 'tab-inactive flex-1 py-5 font-semibold text-center transition-all duration-300 hover:bg-white/5 whitespace-nowrap px-4';
            document.getElementById('tab-mod').className = 'tab-inactive flex-1 py-5 font-semibold text-center transition-all duration-300 hover:bg-white/5 whitespace-nowrap px-4';
            
            document.getElementById('content-' + tabName).classList.remove('hidden');
            document.getElementById('tab-' + tabName).className = 'tab-active flex-1 py-5 font-semibold text-center transition-all duration-300 hover:bg-white/5 whitespace-nowrap px-4';
        }

        async function loadGuildData(guildId) {
            if (!guildId) return;
            const response = await fetch('/api/guild-data?guildId=' + guildId);
            const data = await response.json();

            const fillSelect = (id, items, selectedVal) => {
                const el = document.getElementById(id);
                el.innerHTML = items.map(i => '<option value="'+i.id+'">'+i.name+'</option>').join('');
                if (selectedVal) el.value = selectedVal;
            };

            fillSelect('logChannelSelect', data.channels, "${config.logChannelId}");
            fillSelect('targetChannelSelect', data.channels, "${panel.targetChannelId}");
            fillSelect('staffRoleSelect', data.roles, "${panel.staffRoleId}");
            fillSelect('suggestionChannelSelect', data.channels, "${config.suggestionChannelId}");
        }

        async function saveGeneral() {
            const form = document.getElementById('mainForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            await fetch('/save', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data) 
            });
            
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = '✅ ¡Guardado!';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        }

        async function sendPanel() {
            const btn = event.target;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Enviando...';
            btn.disabled = true;

            const form = document.getElementById('mainForm');
            const formData = new FormData(form);

            try {
                const response = await fetch('/api/send-panel', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success) {
                    alert('✅ ¡Panel enviado a Discord con éxito!');
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (err) {
                alert('❌ Error de conexión');
            }
            
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }

        fetch('/api/guild-data').then(r => r.json()).then(data => {
            const guildSelect = document.getElementById('guildSelect');
            guildSelect.innerHTML = data.guilds.map(g => '<option value="'+g.id+'">'+g.name+'</option>').join('');
            guildSelect.value = data.currentGuildId || "${config.guildId}";
            loadGuildData(guildSelect.value);
        });
    </script>
</body>
</html>
        `);
    });

    app.listen(PORT, () => console.log(`🌐 Dashboard corriendo en http://localhost:${PORT}`));
};