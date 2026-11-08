const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'store.json');

if (!fs.existsSync(dbPath)) {
    const initialData = {
        products: {},
        orders: {},
        config: { adminRole: null, logsChannel: null }
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
}

class Database {
    static get() {
        try {
            const data = fs.readFileSync(dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { products: {}, orders: {}, config: {} };
        }
    }

    static save(data) {
        try {
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            return false;
        }
    }

    static addProduct(id, name, price, type, items = []) {
        const db = this.get();
        db.products[id] = { name, price: Number(price), type, stock: items };
        return this.save(db);
    }

    static consumeStock(id) {
        const db = this.get();
        if (!db.products[id] || db.products[id].stock.length === 0) return null;
        const item = db.products[id].stock.shift();
        this.save(db);
        return item;
    }
}

module.exports = Database;
