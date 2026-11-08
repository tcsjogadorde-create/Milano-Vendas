const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const commands = [
    // Comando /painel - Exibe o painel principal da loja para os clientes
    new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Exibe o painel de produtos da loja'),

    // Comando /config - Painel administrativo (restrito a quem tem permissão de Administrador)
    new SlashCommandBuilder()
        .setName('config')
        .setDescription('Painel de configuração da loja (Apenas Administradores)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Comando /sorteio - Cria um sorteio no servidor
    new SlashCommandBuilder()
        .setName('sorteio')
        .setDescription('Cria um sorteio de produto ou saldo (Apenas Administradores)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 A registrar comandos Slash na API do Discord...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log('✅ Comandos Slash registrados com sucesso no servidor!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();
