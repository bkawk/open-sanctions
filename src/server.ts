import * as dotenv from "dotenv"
import * as express from 'express'
import * as mongoose from 'mongoose';
import * as bluebird from "bluebird";
import * as https from "https";
import * as xml2js from "xml2js";
import { getCode } from "country-list";

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('127.0.0.1', '5001', {protocol: 'http'});

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
              const individualsArray = json.CONSOLIDATED_LIST.INDIVIDUALS[0].INDIVIDUAL;
              individualsArray.forEach(async (value: any) => {
                const yearsArray: number[] = [];
                const namesArray: string[] = [];
                const nationalitiesArray: string[] = [];
                let ipfsHash: string;

                try {
                  // IPFS HASH
                  ipfsHash = await pinToIpfs(value);
                  // NAME
                  const firstName = value.FIRST_NAME[0];
                  let middleName, lastName, alias, nationality, dob ;
                  if(value.THIRD_NAME){
                    middleName = value.SECOND_NAME[0];
                    lastName = value.THIRD_NAME[0];
                  } else if (value.SECOND_NAME) {
                    middleName = '';
                    lastName = value.SECOND_NAME[0];
                  }
                  const unformattedName = `${firstName} ${middleName} ${lastName}`
                  const name = unformattedName.replace('undefined', '').replace(/\s+/g,' ').replace(/ *\([^)]*\) */g, "").replace(/,/g, '').toUpperCase().trim()
                  if (namesArray.indexOf(name) === -1) namesArray.push(name);

                  // NATIONALITY
                  if (value.NATIONALITY) {
                    const nationalityName = value.NATIONALITY[0].VALUE[0];
                    if (nationalityName === 'Iran (Islamic Republic of)') {
                      if (nationalitiesArray.indexOf('IR') === -1) nationalitiesArray.push('IR');
                    } else if (nationalityName === 'Democratic People\'s Republic of Korea') {
                      if (nationalitiesArray.indexOf('KP') === -1) nationalitiesArray.push('KP');
                    } else if (nationalityName === 'Democratic People\'s Republic of Korea ') {
                      if (nationalitiesArray.indexOf('KP') === -1) nationalitiesArray.push('KP');
                    } else if (nationalityName === 'United Kingdom of Great Britain and Northern Ireland') {
                      if (nationalitiesArray.indexOf('GB') === -1) nationalitiesArray.push('KP');
                    } else if (nationalityName === 'United States of America') {
                      if (nationalitiesArray.indexOf('US') === -1) nationalitiesArray.push('US');
                    } else if (nationalityName === 'Democratic Republic of the Congo') {
                      if (nationalitiesArray.indexOf('CD') === -1) nationalitiesArray.push('CD');
                    } else if (nationalityName === 'Palestinian') {
                      if (nationalitiesArray.indexOf('PS') === -1) nationalitiesArray.push('PS');
                    } else if (nationalityName === 'Iran') {
                      if (nationalitiesArray.indexOf('IR') === -1) nationalitiesArray.push('IR');
                    } else if (nationalityName === 'Somali') {
                      if (nationalitiesArray.indexOf('SO') === -1) nationalitiesArray.push('SO');
                    } else if (nationalityName === 'Algerian') {
                      if (nationalitiesArray.indexOf('DZ') === -1) nationalitiesArray.push('DZ');
                    } else if (nationalityName === 'Afghan') {
                      if (nationalitiesArray.indexOf('AF') === -1) nationalitiesArray.push('AF');
                    } else if (nationalityName === 'Syrian Arab Republic') {
                      if (nationalitiesArray.indexOf('SY') === -1) nationalitiesArray.push('SY');
                    } else if (nationalityName === 'United Republic of Tanzania') {
                      if (nationalitiesArray.indexOf('TZ') === -1) nationalitiesArray.push('TZ');
                    } else if (value.NATIONALITY[0].VALUE[0]){
                      nationality = getCode(nationalityName.trim())
                      if (nationality && nationalitiesArray.indexOf(nationality) === -1) nationalitiesArray.push(nationality);
                    }  
                  }

                  // DOB Year
                  if (value.INDIVIDUAL_DATE_OF_BIRTH) {
                    value.INDIVIDUAL_DATE_OF_BIRTH.forEach(async (dob: any) => { 
                      if (dob.YEAR) {
                        const dobYear = Number(dob.YEAR);
                        if (yearsArray.indexOf(dobYear) === -1) yearsArray.push(dobYear);
                      } else if (dob.DATE) {
                        const dobYear = Number(dob.DATE.toString().substring(0,4)) ;
                        if (yearsArray.indexOf(dobYear) === -1) yearsArray.push(dobYear);
                      } else if (dob.TYPE_OF_DATE[0] === 'BETWEEN') {
                        const fromYear = Number(dob.FROM_YEAR[0]);
                        const toYear = Number(dob.TO_YEAR[0]);
                        for (let i = fromYear; i <= toYear; i++) {
                          if (yearsArray.indexOf(i) === -1) yearsArray.push(i);
                        }
                      }
                    })
                  }
                  // ALIAS
                  if (value.INDIVIDUAL_ALIAS) {
                    alias = value.INDIVIDUAL_ALIAS;
                    alias.forEach(async (value: any) => {
                      if (value.QUALITY[0] === 'Good' && value.ALIAS_NAME[0]) {
                        const name = value.ALIAS_NAME[0].replace('undefined', '').replace(/\s+/g,' ').replace(/ *\([^)]*\) */g, "").replace(/,/g, '').replace(/\".*\"/g, '').replace(/[^\x00-\x7F]/g, "").toUpperCase().trim();
                        const names = name.split(';');
                        names.forEach(async (value: any) => {
                          const nameCount = value.split(' ');
                          if (nameCount.length >= 2 && namesArray.indexOf(value.trim()) === -1) namesArray.push(value.trim());
                        })
                      }
                    })
                  }

                  // LOG NAME
                  console.log(namesArray);
                  console.log(nationalitiesArray);
                  console.log(yearsArray);
                  console.log('-----------------------');
                  
                } catch(err) {
                  console.log(err)
                } 
              });

                  // make an item for each possibility
                  // get last imported date from the array in the database
                  // check the date generated and compare to last import
                  // confirm the timezone!
                  // if date generated is > last imported start the import!
                  // remove the items that are not in the list
                  // update the items that are in the list
                  // add the new items in the list
                  // hande names with special charectors
                  // some names have UNDEFINED middle or last names find out why


            }
        });
      });
      res.on('error', (err) => console.log(err));
    });
  }, interval);
})()



async function pinToIpfs(json: any) {
  try {
    const base64 = Buffer.from(JSON.stringify(json)).toString("base64");
    const add = await ipfs.add(Buffer.from(base64));
    const hash = add[0].hash;
    const pin = await ipfs.pin.add(hash);
    return pin[0].hash;
  }
  catch(err) {
    return err
  } 
} 

const port = process.env.API_PORT;
app.listen(port, ()=> {
  console.log(`listening on ${port}`);
});
