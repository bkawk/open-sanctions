import * as dotenv from "dotenv"
import * as express from 'express'
import * as mongoose from 'mongoose';
import * as bluebird from "bluebird";
import * as https from "https";
import * as xml2js from "xml2js";
import * as eyes from "eyes";

dotenv.config();

// Connect to MongoDB
(<any>mongoose).Promise = bluebird;
mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true`, {useCreateIndex: true, useNewUrlParser: true});
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${process.env.DB_NAME}`);
});

// Configure App
const app = express();

// Check UN Sanctions
(() => {
  const minutes = 0.5; 
  const interval = minutes * 60 * 1000;
  setInterval(() => {
    console.log("Checking UN Sanctions");
    https.get('https://scsanctions.un.org/resources/xml/en/consolidated.xml', (res) => {
      let xml = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => xml += chunk);
      res.on('end', () => {
          const parser = new xml2js.Parser();
          parser.parseString(xml, (err: any, json: any) => {
            if (err) {
              console.log(err);
            } else {
              eyes.inspect(json);
              // get last imported date from the array in the database
              // check the date generated and compare to last import
              // confirm the timezone!
              // if date generated is > last imported start the import!
              // remove the items that are not in the list
              // update the items that are in the list
              // add the new items in the list
            }
        });
      });
      res.on('error', (err) => console.log(err));
    });

  }, interval);
})()

const port = process.env.API_PORT;
app.listen(port, ()=> {
  console.log(`listening on ${port}`);
});