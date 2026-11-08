const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const QRCode = require('qrcode');
require('dotenv').config();

const Database = require('./src/database/db');

process.on('uncaughtException', (error) => {
    console.error('❌ ERRO CRÍTICO NÃO TRATADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ REJEIÇÃO NÃO TRATADA:', reason);
});

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

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('🤖 Milano Vendas operando 100% online!');
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor web de suporte ativo na porta ${PORT}`);
});

client.once('ready', () => {
    console.log(`✅ Conectado com sucesso como ${client.user.tag}! Milano Vendas pronto.`);
    client.user.setActivity('Milano Vendas 🚀', { type: 3 });
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            if (commandName === 'painel') {
                const db = Database.get();
                const products = db.products || {};
                const productKeys = Object.keys(products);

                if (productKeys.length === 0) {
                    return interaction.reply({
                        content: '⚠️ Nenhum produto cadastrado na loja no momento. Use `/config` para adicionar.',
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
                    .setTitle('🛒 Milano Vendas • Vitrine')
                    .setDescription('Selecione abaixo o item que deseja adquirir. Pagamento 100% via Pix automático!')
                    .setColor('#9900FF')
                    .setFooter({ text: 'Milano Vendas • Sistema Automatizado' });

                return interaction.reply({ embeds: [embed], components: [row] });
            }

            if (commandName === 'config') {
                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Milano Vendas • Administração')
                    .setDescription('Gerencie os produtos e o estoque da loja.')
                    .setColor('#FF0055');

                const btnAddProduct = new ButtonBuilder()
                    .setCustomId('btn_add_product')
                    .setLabel('➕ Adicionar Produto')
                    .setStyle(ButtonStyle.Success);

                const row = new ActionRowBuilder().addComponents(btnAddProduct);

                return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_product') {
                const productId = interaction.values[0];
                const db = Database.get();
                const product = db.products[productId];

                if (!product || product.stock.length === 0) {
                    return interaction.reply({ content: '❌ Este produto está esgotado no momento!', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🛍️ ${product.name}`)
                    .addFields(
                        { name: '💰 Preço', value: `R$ ${product.price.toFixed(2)}`, inline: true },
                        { name: '📦 Estoque', value: `${product.stock.length} unidade(s)`, inline: true }
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

        if (interaction.isButton()) {
            if (interaction.customId === 'btn_add_product') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_add_product')
                    .setTitle('Adicionar Novo Produto');

                const inputId = new TextInputBuilder()
                    .setCustomId('prod_id')
                    .setLabel('ID (ex: fruta_leopardo)')
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

            if (interaction.customId.startsWith('buy_')) {
                const productId = interaction.customId.replace('buy_', '');
                const db = Database.get();
                const product = db.products[productId];

                if (!product || product.stock.length === 0) {
                    return interaction.reply({ content: '❌ O estoque acabou de esgotar!', ephemeral: true });
                }

                const pixPayload = process.env.PIX_KEY || 'Chave Pix Não Configurada';
                const qrCodeBuffer = await QRCode.toBuffer(pixPayload);

                const embedPix = new EmbedBuilder()
                    .setTitle(`🔑 Pagamento PIX - ${product.name}`)
                    .setDescription(`Efetue o pagamento de **R$ ${product.price.toFixed(2)}** usando a chave PIX abaixo:`)
                    .addFields({ name: '📋 Chave PIX (Copia e Cola)', value: `\`\`\`${pixPayload}\`\`\`` })
                    .setColor('#FFCC00');

                return interaction.reply({
                    embeds: [embedPix],
                    files: [{ attachment: qrCodeBuffer, name: 'qrcode.png' }],
                    ephemeral: true
                });
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_add_product') {
                const id = interaction.fields.getTextInputValue('prod_id').trim().toLowerCase();
                const name = interaction.fields.getTextInputValue('prod_name').trim();
                const price = parseFloat(interaction.fields.getTextInputValue('prod_price').replace(',', '.'));
                const type = interaction.fields.getTextInputValue('prod_type').trim().toLowerCase();

                if (isNaN(price)) {
                    return interaction.reply({ content: '❌ Preço inválido!', ephemeral: true });
                }

                Database.addProduct(id, name, price, type, []);

                return interaction.reply({
                    content: `✅ Produto **${name}** (ID: \`${id}\`) cadastrado com sucesso!`,
                    ephemeral: true
                });
            }
        }
    } catch (err) {
        console.error('❌ Erro:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
                                          
