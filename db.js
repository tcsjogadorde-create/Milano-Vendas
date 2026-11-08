const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'store.json');

// Garante que o ficheiro de base de dados existe
if (!fs.existsSync(dbPath)) {
    const initialData = {
        products: {}, // { productId: { name, price, stock: [...], type: 'solo'|'catalog' } }
        orders: {},   // Registo de transações
        config: {
            adminRole: null,
            logsChannel: null
        }
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
}

class Database {
    static get() {
        try {
            const data = fs.readFileSync(dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Erro ao ler a base de dados:', error);
            return { products: {}, orders: {}, config: {} };
        }
    }

    static save(data) {
        try {
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('❌ Erro ao escrever na base de dados:', error);
            return false;
        }
    }

    // Adicionar produto (Suporta métodos solo ou catálogo)
    static addProduct(id, name, price, type, items = []) {
        const db = this.get();
        db.products[id] = {
            name,
            price: Number(price),
            type, // 'solo' (ex: métodos, chaves de uso único) ou 'catalog' (ex: frutas, contas)
            stock: items // Array de strings com os conteúdos/chaves ou quantidade
        };
        return this.save(db);
    }

    // Remover stock de forma atômica na hora da compra
    static consumeStock(id) {
        const db = this.get();
        if (!db.products[id] || db.products[id].stock.length === 0) {
            return null; // Stock esgotado
        }
        const item = db.products[id].stock.shift(); // Pega o primeiro item da lista (uso único)
        this.save(db);
        return item;
    }
}

module.exports = Database;
