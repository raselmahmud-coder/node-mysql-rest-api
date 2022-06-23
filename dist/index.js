"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const qrcode_1 = __importDefault(require("qrcode"));
const mysql = require("mysql");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
/* app.post("/", (req:Request, res:Response) => {
  res.send({
    data: req.body,
  });
});
 */
const supermarketDB = mysql.createConnection({
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
    console.log("Connected!");
    // database connection ready for creating api
    /*   app.get("/:id", (req: Request, res: Response) => {
      const { id } = req.params;
      console.log(id,'id got')
    const sql = `SELECT * FROM actor where actor_id=${id}`;
    con.query(sql, function (err:string, result:any) {
      if (err) throw err;
      console.log("Result:", result);
        res.send({response:result});
      });
    }); */
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
        const sql = `DELETE FROM products WHERE product_id = ${id}`;
        supermarketDB.query(sql, (err, result) => {
            if (err) {
                console.log("error occurred from delete method", err);
            }
            // console.log("hey result", result)
            res.send(result);
        });
    });
    // post request
    app.post("/product", (req, res) => {
        const { title } = req.body;
        const { description } = req.body;
        const { selling_price } = req.body;
        const { cost_price } = req.body;
        const created_at = new Date().toLocaleString();
        // Creating the data
        const data = {
            title: title,
            description: description,
            selling_price: selling_price,
            cost_price: cost_price,
            created_at: created_at,
        };
        // Converting the data into String format
        const stringdata = JSON.stringify(data);
        qrcode_1.default.toString(stringdata, (err, QRcode) => {
            if (err) {
                console.log("error occurred at to string convert");
            }
            // Printing the generated code
            console.log(QRcode);
            const sql = `INSERT INTO products (title, description, selling_price, cost_price, QR_code_hash, created_at) VALUES ('${title}', '${description}', '${selling_price}', '${cost_price}', '${QRcode}', '${created_at}')`;
            supermarketDB.query(sql, function (err, result) {
                if (err)
                    throw err;
                // console.log("Result:", result);
                res.send({ response: result });
            });
        });
    });
});
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});