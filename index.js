#!/usr/bin/env node

const start = Date.now();

const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const { program } = require('commander');
const puppeteer = require('puppeteer');
const yaml = require('js-yaml');

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
  .requiredOption('-q, --quality <number>', 'image quality between 0-100 (not applicable to PNG images)', Number, 100)
  .requiredOption('--no-background', 'allow transparent background (not applicable to JPEG images)')
  .requiredOption('-v, --verbose', 'display verbose output', false)
  .requiredOption('-d, --debug', 'run in debug mode', false);

program.parse();

const options = program.opts();

var buffer = fs.readFileSync(options.config);
const config = yaml.load(buffer);

if (options.debug) {
  console.log('Options:', options);
  console.log('Config:', config);
  process.exit(1);
}

var buffer = fs.readFileSync(options.template);
let string = buffer.toString();
const template = handlebars.compile(string);

(async () => {

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox'
    ]
  });

  const page = await browser.newPage();

  let count = 1;

  for (let data of config) {

    if (options.verbose) {
      console.log(`Saving image ${count} of ${config.length}:`, data.path);
    }

    await page.setViewport({
      width: options.width,
      height: options.height,
      deviceScaleFactor: 1
    });

    let html = template(data);

    let waitUntil = (count == 1) ? 'networkidle0' : 'load';

    await page.setContent(html, {
      waitUntil: waitUntil
    });

    let screenshotOptions = {
      path: data.path,
      omitBackground: !options.background
    };

    if (path.extname(data.path).toLowerCase() !== '.png') {
      screenshotOptions.quality = options.quality
    }

    await page.screenshot(screenshotOptions);

    count++;

  }

  await browser.close();

  const end = Date.now();

  console.log(`Done in ${(end - start) / 1000} seconds.`);

})();
