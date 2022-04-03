#!/usr/bin/env node

const start = Date.now();

const fs = require('fs');
const handlebars = require('handlebars');
const yaml = require('js-yaml');
const program = require('commander');
const puppeteer = require('puppeteer');
const package = require('./package.json');

program
  .name(package.name)
  .description(package.description)
  .version(package.version)
  .helpOption('-H, --help', 'display help for command')
  .requiredOption('-c, --config <path>', 'path to the configuration file', './loriqeet.config.yaml')
  .requiredOption('-t, --template <path>', 'path to the template file', './loriqeet.template.html')
  .requiredOption('-w, --width <number>', 'image width', Number, 1200)
  .requiredOption('-h, --height <number>', 'image height', Number, 630)
  .requiredOption('-v, --verbose', 'display verbose output', false)
  .requiredOption('-d, --debug', 'run in debug mode', false)
  .parse();

const options = program.opts();

let buffer = fs.readFileSync(options.config);
const config = yaml.load(buffer);

(async () => {

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox'
    ]
  });

  const page = await browser.newPage();

  let count = 1;

  for (let i in config) {

    let image = {
      ...options,
      ...config[i]
    };

    if (options.debug) {
      console.log(`Image ${count} of ${config.length}:`, image);
    }

    if (options.verbose) {
      console.log(`Saving image ${count} of ${config.length}:`, image.path);
    }

    if (!options.debug) {

      await page.setViewport({
        width: image.width,
        height: image.height,
        deviceScaleFactor: 1
      });

      let buffer = fs.readFileSync(image.template);
      let string = buffer.toString();
      let template = handlebars.compile(string);
      let html = template(image);

      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      await page.screenshot({
        path: image.path
      });

    }

    count++;

  }

  await browser.close();

  const end = Date.now();

  console.log(`Done in ${(end - start) / 1000} seconds.`);

})();
