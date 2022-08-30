require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express()
const mongoose = require("mongoose")
const dns = require("dns")
mongoose.connect(process.env.MONGODB_URI)

// Basic Configuration
const port = process.env.PORT || 4000;

const bodyParser = require('body-parser');
const { truncate } = require('fs/promises');
const { countReset } = require('console');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
})

const Url = mongoose.model("Url", urlSchema)

// Function that check if input is a valid URL 
const isValidUrl = urlString => {
  var urlPattern = new RegExp('^(https?:\\/\\/)?' + // validate protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // validate fragment locator
  return !!urlPattern.test(urlString) && urlString.includes("http");
}


app.post("/api/shorturl", (req, res) => {
  let input = req.body.url

  // Check if URL is already in the databse
  Url.findOne({ original_url: input }, (err, data) => {
    if (err) {
      console.log(err)
    } else {

      // if database already has the url, dont store, only show
      if (data) {
        res.json({ "original_url": data.original_url, "short_url": data.short_url })

        // if database does not have the url, store and show it
      } else if (input) {

        // Check database count to find which id it should allocate
        Url.count((err, responseCount) => {
          if (err) { }
          if (isValidUrl(input)) {
            let count = responseCount
            let url = new Url({ original_url: input, short_url: responseCount + 1 })

            // Then save the new URL
            url.save((err, data) => {
              if (err) {
                console.log(err)
              } else {
                res.json({ "original_url": data.original_url, "short_url": data.short_url })
              }
            })
          } else {
            res.json({ error: "invalid url" })
          }
        })
      }
    }
  })
})

// Handle the redirects
app.get("/api/shorturl/:short_url?", (req, res) => {
  let short_url = req.params.short_url
  Url.findOne({ short_url: short_url }, (err, data) => {
    if (err) { console.log(err) }
    if (data) {
      res.redirect(data.original_url)
    } else {
      res.send("No website stored for that route")
    }
  })

})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
