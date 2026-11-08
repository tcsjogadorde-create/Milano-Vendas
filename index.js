const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const QRCode = require('qrcode');
require('dotenv').config();

const Database = require('./src/database/db');

// 1. BLINDAGEM ANTI-CRASH GLOBAL
process.on('uncaughtException', (error) => {
    console.error('❌ ERRO CRÍTICO NÃO TRATADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ REJEIÇÃO NÃO TRATADA:', reason);
});

// 2. INICIALIZAÇÃO DO CLIENTE DISCORD
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.commands = new Collection();

// 3. SERVIDOR EXPRESS (24/7 RENDER / UPTIMEROBOT)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('🤖 Bot de Vendas Automatizado para Discord operando 100% online!');
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor web de suporte ativo na porta ${PORT}`);
});

// 4. EVENTO READY
client.once('ready', () => {
    console.log(`✅ Conectado com sucesso como ${client.user.tag}! Sistema pronto para operar.`);
    client.user.setActivity('Gerindo a Loja 🚀', { type: 3 });
});

// 5. SISTEMA DE COMANDOS SLASH E INTERAÇÕES (BOTÕES, MENUS E PIX)
client.on('interactionCreate', async (interaction) => {
    try {
        // --- COMANDOS SLASH ---
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            // /painel - Exibe a vitrine da loja
            if (commandName === 'painel') {
                const db = Database.get();
                const products = db.products || {};
                const productKeys = Object.keys(products);

                if (productKeys.length === 0) {
                    return interaction.reply({
                        content: '⚠️ Nenhum produto cadastrado na loja no momento. Um administrador precisa configurar os produtos primeiro usando `/config`.',
                        ephemeral: true
                    });
                }

                const options = productKeys.map(key => ({
                    label: products[key].name,
                    description: `Preço: R$ ${products[key].price.toFixed(2)} | Estoque: ${products[key].stock.length}`,
                    value: key
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_product')
                    .setPlaceholder('🛒 Selecione um produto para comprar...')
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const embed = new EmbedBuilder()
                    .setTitle('🛒 Vitrine de Produtos & Serviços')
                    .setDescription('Selecione abaixo o item que deseja adquirir. O processo de pagamento via Pix é 100% automático e seguro!')
                    .setColor('#9900FF')
                    .setFooter({ text: 'Sistema de Vendas Automatizado • Blox Fruits & Métodos' });

                return interaction.reply({ embeds: [embed], components: [row] });
            }

            // /config - Gerenciamento de produtos (Apenas Admins)
            if (commandName === 'config') {
                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Painel de Administração da Loja')
                    .setDescription('Escolha uma ação abaixo para gerenciar o estoque, cadastrar novos produtos ou visualizar vendas.')
                    .setColor('#FF0055');

                const btnAddProduct = new ButtonBuilder()
                    .setCustomId('btn_add_product')
                    .setLabel('➕ Adicionar Produto')
                    .setStyle(ButtonStyle.Success);

                const row = new ActionRowBuilder().addComponents(btnAddProduct);

                return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }
        }

        // --- MANIPULAÇÃO DE SELECT MENUS (Escolha de produto) ---
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_product') {
                const productId = interaction.values[0];
                const db = Database.get();
                const product = db.products[productId];

                if (!product || product.stock.length === 0) {
                    return interaction.reply({ content: '❌ Este produto está esgotado no momento!', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🛍️ Produto: ${product.name}`)
                    .addFields(
                        { name: '💰 Preço', value: `R$ ${product.price.toFixed(2)}`, inline: true },
                        { name: '📦 Estoque Disponível', value: `${product.stock.length} unidade(s)`, inline: true },
                        { name: '🏷️ Categoria', value: product.type.toUpperCase(), inline: true }
                    )
                    .setColor('#00FFCC');

                const btnBuy = new ButtonBuilder()
                    .setCustomId(`buy_${productId}`)
                    .setLabel('💳 Pagar via PIX')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(btnBuy);

                return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }
        }

        // --- BOTÕES DE COMPRA & GERAR PIX ---
        if (interaction.isButton()) {
            // Abrir Modal para adicionar produto
            if (interaction.customId === 'btn_add_product') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_add_product')
                    .setTitle('Adicionar Novo Produto');

                const inputId = new TextInputBuilder()
                    .setCustomId('prod_id')
                    .setLabel('ID do Produto (ex: fruta_leopardo)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const inputName = new TextInputBuilder()
                    .setCustomId('prod_name')
                    .setLabel('Nome de Exibição')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const inputPrice = new TextInputBuilder()
                    .setCustomId('prod_price')
                    .setLabel('Preço (ex: 15.50)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const inputType = new TextInputBuilder()
                    .setCustomId('prod_type')
                    .setLabel('Tipo (solo ou catalog)')
                    .setStyle(TextInputStyle.Short)
                    .setValue('catalog')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(inputId),
                    new ActionRowBuilder().addComponents(inputName),
                    new ActionRowBuilder().addComponents(inputPrice),
                    new ActionRowBuilder().addComponents(inputType)
                );

                return interaction.showModal(modal);
            }

            // Gerar Cobrança Pix ao Clicar em Pagar
            if (interaction.customId.startsWith('buy_')) {
                const productId = interaction.customId.replace('buy_', '');
                const db = Database.get();
                const product = db.products[productId];

                if (!product || product.stock.length === 0) {
                    return interaction.reply({ content: '❌ Desculpe, o estoque deste item acabou de esgotar!', ephemeral: true });
                }

                const pixPayload = process.env.PIX_KEY || 'Chave Pix Não Configurada';
                
                // Gerar QR Code em buffer para enviar como anexo no Discord
                const qrCodeBuffer = await QRCode.toBuffer(pixPayload);

                const embedPix = new EmbedBuilder()
                    .setTitle(`🔑 Pagamento PIX - ${product.name}`)
                    .setDescription(`Para concluir a compra, efetue o pagamento de **R$ ${product.price.toFixed(2)}** usando a chave PIX abaixo ou escaneie o QR Code.`)
                    .addFields(
                        { name: '📋 Chave PIX (Copia e Cola)', value: `\`\`\`${pixPayload}\`\`\`` }
                    )
                    .setColor('#FFCC00')
                    .setFooter({ text: 'Após o pagamento, o envio do item é processado automaticamente.' });

                return interaction.reply({
                    embeds: [embedPix],
                    files: [{ attachment: qrCodeBuffer, name: 'qrcode.png' }],
                    ephemeral: true
                });
            }
        }

        // --- SUBMISSÃO DE MODAIS ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_add_product') {
                const id = interaction.fields.getTextInputValue('prod_id').trim().toLowerCase();
                const name = interaction.fields.getTextInputValue('prod_name').trim();
                const price = parseFloat(interaction.fields.getTextInputValue('prod_price').replace(',', '.'));
                const type = interaction.fields.getTextInputValue('prod_type').trim().toLowerCase();

                if (isNaN(price)) {
                    return interaction.reply({ content: '❌ O preço informado é inválido!', ephemeral: true });
                }

                // Adiciona produto via db.js
                Database.addProduct(id, name, price, type, []);

                return interaction.reply({
                    content: `✅ Produto **${name}** (ID: \`${id}\`) cadastrado com sucesso por **R$ ${price.toFixed(2)}**! Agora use o painel admin para abastecer o estoque.`,
                    ephemeral: true
                });
            }
        }

    } catch (err) {
        console.error('❌ Erro no tratamento de interações:', err);
    }
});

// 6. LOGIN DO BOT
client.login(process.env.DISCORD_TOKEN);
