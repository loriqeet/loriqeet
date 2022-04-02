#!/usr/bin/env node

// Get the start time
const start = Date.now();

// Load all the things
const fs = require('fs');
const handlebars = require('handlebars');
const yaml = require('js-yaml');
const program = require('commander');
const puppeteer = require('puppeteer');
const package = require('./package.json');

// Define the program
program
  .name(package.name)
  .description(package.description)
  .version(package.version)
  .requiredOption('-c, --config <path>', 'path to the configuration file', './loriqeet.config.yaml')
  .option('-v, --verbose', 'display verbose output')
  .parse();

// Get program options
const opts = program.opts();

// Set verbose mode
const verbose = opts.verbose ? true : false;

// Load user config YAML file
let buffer = fs.readFileSync(opts.config);
const config = yaml.load(buffer);

// Define default options
const options = {
  template: config.template,
  width: config.width,
  height: config.height
};

// Define array of image options
let images = [];

// Merge default options with image options
for (let i in config.images) {
  let image = {
    ...options,
    ...config.images[i]
  };
  images.push(image);
}

// Get the total number of images
const total = images.length;

(async () => {

  // Launch a browser
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox'
    ]
  });

  // Open a new page
  const page = await browser.newPage();

  // Start the image counter
  let count = 1;

  // Loop over image options
  for (let i in images) {

    if (verbose) {
      console.log(`Saving image ${count} of ${total}:`, images[i].path);
    }

    // Set the page viewport (image width x height)
    await page.setViewport({
      width: images[i].width,
      height: images[i].height,
      deviceScaleFactor: 1
    });

    // Get the page content
    let buffer = fs.readFileSync(images[i].template);
    let html = buffer.toString();
    let template = handlebars.compile(html);
    let content = template(images[i]);

    // Set the page content
    await page.setContent(content, {
      waitUntil: 'networkidle0'
    });

    // Take a screenshot
    await page.screenshot({
      path: images[i].path
    });

    // Increment the image counter
    count++;

  }

  // Close the browser
  await browser.close();

  // Get the end time
  const end = Date.now();

  console.log(`Done in ${(end - start) / 1000} seconds.`);

})();
