import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import qrcode from "qrcode";
const easyinvoice = require("easyinvoice");
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
    // const query = `UPDATE`
    const sql = `DELETE FROM products WHERE product_id = ${id}`;
    supermarketDB.query(sql, (err: string, result: JSON) => {
      if (err) {
        console.log("error occurred from delete method", err);
      }
      // console.log("hey result", result)
      res.send(result);
    });
  });

  // post request
  app.post("/product", (req: Request, res: Response) => {
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

    qrcode.toString(stringdata, (err, QRcode) => {
      if (err) {
        console.log("error occurred at to string convert");
      }

      // Printing the generated code
      console.log(QRcode);
      const sql = `INSERT INTO products (title, description, selling_price, cost_price, QR_code_hash, created_at) VALUES ('${title}', '${description}', '${selling_price}', '${cost_price}', '${QRcode}', '${created_at}')`;

      supermarketDB.query(sql, function (err: string, result: any) {
        if (err) throw err;
        // console.log("Result:", result);
        res.send({ response: result });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

// handle storage using multer
/* var storage = multer.diskStorage({
  destination: function (req:any, file:any, cb) {
     cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
     cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
}); */

// generates a CSV/pdf bill for a single purchase
app.post("/cart/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = `SELECT * FROM products WHERE product_id = ${id}`;
  supermarketDB.query(query, (err, result) => {
    if (err) {
      throw new Error("error occurred");
    }
    // const obj = JSON.stringify(result);
    // res.send(result);
    // console.log("id get", result[0].title);

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
        //"custom1": "custom value 1",
        //"custom2": "custom value 2",
        //"custom3": "custom value 3"
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
        date: "12-12-2021",
        // Invoice due date
        "due-date": "31-12-2021",
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
        currency: "USD", // See documentation 'Locales and Currency' for more info. Leave empty for no currency.
        // "locale": "nl-NL", // Defaults to en-US, used for number formatting (See documentation 'Locales and Currency')
        // "tax-notation": "gst", // Defaults to 'vat'
        // "margin-top": 25, // Defaults to '25'
        // "margin-right": 25, // Defaults to '25'
        // "margin-left": 25, // Defaults to '25'
        // "margin-bottom": 25, // Defaults to '25'
        // "format": "A4", // Defaults to A4, options: A3, A4, A5, Legal, Letter, Tabloid
        // "height": "1000px", // allowed units: mm, cm, in, px
        // "width": "500px", // allowed units: mm, cm, in, px
        // "orientation": "landscape", // portrait or landscape, defaults to portrait
      },
      // Translate your invoice to your preferred language
      translate: {
        // "invoice": "FACTUUR",  // Default to 'INVOICE'
        // "number": "Nummer", // Defaults to 'Number'
        // "date": "Datum", // Default to 'Date'
        // "due-date": "Verloopdatum", // Defaults to 'Due Date'
        // "subtotal": "Subtotaal", // Defaults to 'Subtotal'
        // "products": "Producten", // Defaults to 'Products'
        // "quantity": "Aantal", // Default to 'Quantity'
        // "price": "Prijs", // Defaults to 'Price'
        // "product-total": "Totaal", // Defaults to 'Total'
        // "total": "Totaal" // Defaults to 'Total'
      },
    };

    /* //Create your invoice! Easy!
easyinvoice.createInvoice(data, function (result:any) {
    //The response will contain a base64 encoded PDF file
  // console.log('PDF base64 string: ', result.pdf);
}); */
    const convertJson = JSON.stringify(data);
    const query = `INSERT INTO purchase (invoice, id_product) VALUES ('${convertJson}', ${result[0].product_id})`;
    supermarketDB.query(query, function (err: string, result: any) {
      if (err) throw err;
      console.log("Result:", result);
      res.send({ response: result });
    });

    /* const result = await easyinvoice.createInvoice(data);
  await fs.writeFileSync("invoice.pdf", result.pdf, 'base64'); */
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
const path = require("path");
import { encode, decode } from "node-base64-image";
app.get("/encode", async (req, res) => {
  /*  console.log(__dirname); // "/Users/Sam/dirname-example/src/api"
  console.log(process.cwd()); */
  const filePath = path.join(process.cwd(), "/src/pro.png");
  // console.log(filePath);
/*   const data = fs.readFileSync(filePath, { encoding: "base64" });
  const buffer = Buffer.from(data, "base64");
  // const info= fs.writeFileSync('input.txt', buffer);
  // Display the file buffer
  // console.log(info); */

  const url =
    "https://cdn.pixabay.com/photo/2014/02/27/16/10/tree-276014__340.jpg";
  // const sql = `INSERT INTO images (image) VALUES('${filePath}')`
  const sql =`SELECT * FROM images`
  supermarketDB.query(sql, (err, result) => {
    if (err) {
      console.log(err)
    }
    res.send(result)

  })
 /*  const options = {
    string: true,
    headers: {
      "User-Agent": "my-app",
    },
  };

  const image = await encode(url, options);
  // console.log("encode",image)
  // const dhar = await decode(image, { fname: "example", ext: "png" });
  res.send({ image }); */
  // console.log(fs.openSync(filePath));
});
