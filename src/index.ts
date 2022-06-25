import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import qrcode from "qrcode";
const easyinvoice = require("easyinvoice");
import fetch from "node-fetch";
const imgbbUploader = require("imgbb-uploader");

const fs = require("fs");
const multer = require("multer");
import mysql from "mysql";
const cors = require("cors");
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;
// middle ware
app.use(cors());
// app.use(express())
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
// parse application/json
app.use(express.json());

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

supermarketDB.connect(function (err: string) {
  if (err) {
    console.log("failed", err);
  }
  // database connection ready for creating api
  console.log("Connected!");

  // read method api
  app.get("/product/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(id, "id got");
    const sql = `SELECT * FROM products WHERE product_id=${id}`;
    supermarketDB.query(sql, function (err: string, result: any) {
      if (err) throw err;
      // console.log("Result:", result);
      res.send({ response: result });
    });
  });

  // update or modify method
  app.patch("/product/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const keys = Object.keys(req.body);
    const params: any = [];
    keys.forEach((key) => {
      const value = req.body[key];
      if (value) {
        params.push(`${key}='${value}'`);
      }
    });
    const query = `UPDATE products SET ${params.join(
      ", "
    )} WHERE product_id=${id};`;
    // console.log("query", query);
    supermarketDB.query(query, function (err: string, result: any) {
      if (err) throw err;
      // console.log("Result:", result);
      res.send({ success: result });
    });
  });

  // delete method
  app.delete("/product/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    // const delete_at = new Date().toLocaleString();
    const sql = `UPDATE products SET deleted_at =now() WHERE product_id = ${id}`;
    supermarketDB.query(sql, (err: string, result: JSON) => {
      if (err) {
        console.log("error occurred from delete method", err);
      }
      res.send(result);
    });
  });

  // post request
  app.post("/product", (req: Request, res: Response) => {
    const { title, description, selling_price, cost_price } = req.body;
    const created_at = new Date().toLocaleString();
    // Creating the data
    console.log("get data", title, description);
    const data: {
      title: string;
      description: string;
      selling_price: number;
      cost_price: number;
      created_at: number | string;
    } = {
      title: title,
      description: description,
      selling_price: selling_price,
      cost_price: cost_price,
      created_at: created_at,
    };
    const stringData = JSON.stringify(data);

    const option: { errorCorrectionLevel: any; type: any } = {
      errorCorrectionLevel: "H",
      type: "image/jpeg",
    };

    qrcode.toDataURL(stringData, option, function (err, url) {
      if (err) throw err;

      const sql = `INSERT INTO products (title, description, selling_price, cost_price, QR_code_hash, created_at) VALUES ('${title}', '${description}', '${selling_price}', '${cost_price}', '${url}', '${created_at}')`;
      // console.log(sql)
      supermarketDB.query(sql, function (err: string, result: any) {
        if (err) throw err;
        // console.log("Result:", result);
        res.send({ response: result });
      });
    });
  });
});

//fetch a product and generates a pdf bill for a single purchase
app.post("/cart/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = `SELECT * FROM products WHERE product_id = ${id}`;
  supermarketDB.query(query, (err, result) => {
    if (err) {
      throw new Error("error occurred");
    }
    const data = {
      images: {
        // The logo on top of your invoice
        logo: "https://public.easyinvoice.cloud/img/logo_en_original.png",
        // The invoice background
        background: "https://public.easyinvoice.cloud/img/watermark-draft.jpg",
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
        product_id: `${result[0].product_id}`,
        title: `${result[0].title}`,
        description: `${result[0].description}`,
        selling_price: `${result[0].selling_price}`,
        city: "Clientcity",
        cost_price: `${result[0].cost_price}`,
        // QR_code_hash: `${result[0].QR_code_hash}`,
        created_at: `${result[0].created_at}`,
      },
      information: {
        // Invoice number
        number: "2021.0001",
        // Invoice data
        date: new Date().toLocaleString(),
        // Invoice due date
        "due-date": "31-12-2025",
      },
      // The products you would like to see on your invoice
      // Total values are being calculated automatically
      products: [
        {
          quantity: 2,
          description: "Product 1",
          "tax-rate": 6,
          price: 33.87,
        },
        {
          quantity: 4.1,
          description: "Product 2",
          "tax-rate": 6,
          price: 12.34,
        },
        {
          quantity: 4.5678,
          description: "Product 3",
          "tax-rate": 21,
          price: 6324.453456,
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
    const query = `INSERT INTO purchase (invoice, id_product) VALUES ('${convertJson}', ${result[0].product_id})`;
    supermarketDB.query(query, function (err: string, result: any) {
      if (err) throw err;
      console.log("Result:", result);
      res.send({ response: result });
    });
  });
});

app.get("/cart/:id", (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM purchase WHERE id_purchase = ${id}`;
  supermarketDB.query(query, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});



    app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    });