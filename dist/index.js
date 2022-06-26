"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const qrcode_1 = __importDefault(require("qrcode"));
const easyinvoice = require("easyinvoice");
const imgbbUploader = require("imgbb-uploader");
const fs = require("fs");
const multer = require("multer");
const mysql_1 = __importDefault(require("mysql"));
const cors = require("cors");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
// middle ware
app.use(cors());
// app.use(express())
// parse application/x-www-form-urlencoded
app.use(express_1.default.urlencoded({ extended: false }));
// parse application/json
app.use(express_1.default.json());
/* app.post("/", (req:Request, res:Response) => {
  res.send({
    data: req.body,
  });
});
 */
const supermarketDB = mysql_1.default.createConnection({
    host: `${process.env.host}`,
    user: `${process.env.user}`,
    password: `${process.env.password}`,
    database: `${process.env.database}`,
    multipleStatements: true,
});
supermarketDB.connect(function (err) {
    if (err) {
        console.log("failed", err);
    }
    // database connection ready for creating api
    console.log("Connected!");
    // read method api
    app.get("/product/:id", (req, res) => {
        const { id } = req.params;
        console.log(id, "id got");
        const sql = `SELECT * FROM products WHERE product_id=${id}`;
        supermarketDB.query(sql, function (err, result) {
            if (err)
                throw err;
            // console.log("Result:", result);
            res.send({ response: result });
        });
    });
    // update or modify method
    app.patch("/product/:id", (req, res) => {
        const { id } = req.params;
        const keys = Object.keys(req.body);
        const params = [];
        keys.forEach((key) => {
            const value = req.body[key];
            if (value) {
                params.push(`${key}='${value}'`);
            }
        });
        const query = `UPDATE products SET ${params.join(", ")} WHERE product_id=${id};`;
        // console.log("query", query);
        supermarketDB.query(query, function (err, result) {
            if (err)
                throw err;
            // console.log("Result:", result);
            res.send({ success: result });
        });
    });
    // delete method
    app.delete("/product/:id", (req, res) => {
        const { id } = req.params;
        // const delete_at = new Date().toLocaleString();
        const sql = `UPDATE products SET deleted_at =now() WHERE product_id = ${id}`;
        supermarketDB.query(sql, (err, result) => {
            if (err) {
                console.log("error occurred from delete method", err);
            }
            res.send(result);
        });
    });
    // post request
    app.post("/product", (req, res) => {
        const { title, description, selling_price, cost_price } = req.body;
        const created_at = new Date().toLocaleString();
        // Creating the data
        console.log("get data", title, description);
        const data = {
            title: title,
            description: description,
            selling_price: selling_price,
            cost_price: cost_price,
            created_at: created_at,
        };
        const stringData = JSON.stringify(data);
        const option = {
            errorCorrectionLevel: "H",
            type: "image/jpeg",
        };
        qrcode_1.default.toDataURL(stringData, option, function (err, url) {
            if (err)
                throw err;
            const sql = `INSERT INTO products (title, description, selling_price, cost_price, QR_code_hash, created_at) VALUES ('${title}', '${description}', '${selling_price}', '${cost_price}', '${url}', '${created_at}')`;
            // console.log(sql)
            supermarketDB.query(sql, function (err, result) {
                if (err)
                    throw err;
                // console.log("Result:", result);
                res.send({ response: result });
            });
        });
    });
});
//fetch a product and generates a pdf bill for a single purchase
app.post("/purchase/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const query = `SELECT * FROM products WHERE product_id = ${id}`;
    supermarketDB.query(query, (err, result) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            throw new Error("error occurred");
        }
        const convertNumSelling = parseFloat(`${result[0].selling_price}`);
        const data = {
            images: {
                logo: "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",
                background: "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",
            },
            // Your own data
            sender: {
                company: "Sample Corp",
                address: "Sample Street 123",
                zip: "1234 AB",
                city: "Sampletown",
                country: "Samplecountry",
            },
            // Your recipient
            "product info": {
                customer: "Mr. Ryan dal",
                phone: "12345678",
                address: "Xindu district, Chengdu city",
                city: "Clientcity",
            },
            information: {
                // Invoice number
                number: "2021.0001",
                // Invoice data
                date: new Date().toLocaleString(),
                // Invoice due date
                "due-date": "31-12-2025",
            },
            products: [
                {
                    product_id: `${result[0].product_id}`,
                    title: `${result[0].title}`,
                    description: `${result[0].description}`,
                    selling_price: convertNumSelling,
                    cost_price: `${result[0].cost_price}`,
                    QR_code_hash: `${result[0].QR_code_hash}`,
                    created_at: `${result[0].created_at}`,
                    quantity: 2,
                    "tax-rate": 6,
                    Promo_Code: convertNumSelling - 33.87,
                },
            ],
            // The message you would like to display on the bottom of your invoice
            "bottom-notice": "Kindly pay your invoice within 15 days.",
            // Settings to customize your invoice
            settings: {
                currency: "USD",
            },
        };
        const convertJson = JSON.stringify(data);
        const query = `INSERT INTO purchase (invoice, id_product, purchase_at, selling_price, cost_price) VALUES ('${convertJson}', ${result[0].product_id}, CURDATE(), ${result[0].selling_price}, ${result[0].cost_price})`;
        supermarketDB.query(query, function (err, result) {
            if (err) {
                console.log("error", err);
            }
            // console.log("Result:", result);
            res.send({ response: result });
        });
        const result1 = yield easyinvoice.createInvoice(convertJson);
        yield fs.writeFileSync("invoice.pdf", result1.pdf, "base64");
    }));
}));
app.get("/purchase", (req, res) => {
    const { day } = req.query;
    // console.log("day expected",day)
    if (day) {
        const query = `SELECT SUM(selling_price) FROM purchase WHERE purchase_at = DATE_SUB(CURDATE(), INTERVAL ${day} DAY)`;
        supermarketDB.query(query, (err, selling_price) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                console.log(err);
            }
            const selling = Object.values(selling_price[0]);
            const cost_price = `SELECT SUM(cost_price) FROM purchase WHERE purchase_at = DATE_SUB(CURDATE(), INTERVAL ${day} DAY)`;
            supermarketDB.query(cost_price, (err, cost_price) => __awaiter(void 0, void 0, void 0, function* () {
                if (err) {
                    console.log(err);
                }
                const cost = Object.values(cost_price[0]);
                res.send({ profit: selling - cost });
            }));
        }));
    }
});
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
