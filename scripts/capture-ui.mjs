import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
await fs.mkdir('docs/screenshots',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3050/',{waitUntil:'networkidle'});await page.screenshot({path:'docs/screenshots/desktop-home.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/screenshots/mobile-home.png',fullPage:true});
console.log(JSON.stringify({errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),cards:await page.locator('.resource-card').count()}));await browser.close();
