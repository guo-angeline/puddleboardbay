import { chromium } from '@playwright/test';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
try {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  await p.goto('http://localhost:3000', { waitUntil:'domcontentloaded' });
  await sleep(20000); // single long wait for on-demand chunk compile
  const info = await p.evaluate(()=>({ leaflet: !!document.querySelector('.leaflet-container'), tiles: document.querySelectorAll('img.leaflet-tile').length }));
  console.log('WARM', JSON.stringify(info));
  await b.close();
} catch(e){ console.log('SCRIPT_ERR', e.message); }
