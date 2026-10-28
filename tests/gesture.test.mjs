import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GestureEngine} from '../extension/gesture-engine.mjs';
const open={left:0,right:0,mouth:0},closed={left:1,right:1,mouth:0},mouth={left:0,right:0,mouth:1};
function feed(e,face,a,b,step=50){let last;for(let t=a;t<=b;t+=step)last=e.update(face,t);return last;}
function armed(mode='eyes'){const e=new GestureEngine({mode});feed(e,open,0,400);return e;}
test('natural blink ignored, deliberate closure fires on release once',()=>{const e=armed();feed(e,closed,450,550);assert.ok(!e.update(open,600).trigger);feed(e,open,650,1100);feed(e,closed,1150,1850);assert.ok(e.update(open,1900).trigger);assert.ok(!e.update(open,1950).trigger);});
test('one eye alone does not trigger',()=>{const e=armed();feed(e,{left:1,right:0,mouth:0},450,1450);assert.ok(!e.update(open,1500).trigger);});
test('long closure or tracking gap cancels gesture',()=>{let e=armed();feed(e,closed,450,3100);assert.ok(!e.update(open,3150).trigger);e=armed();feed(e,closed,450,1150);assert.ok(!e.update(open,1700).trigger);});
test('face loss resets held gesture and requires neutral re-arm',()=>{const e=armed();feed(e,closed,450,1150);e.update(null,1200);feed(e,closed,1250,2000);assert.ok(!e.update(open,2050).trigger);feed(e,open,2100,2500);feed(e,closed,2550,3250);assert.ok(e.update(open,3300).trigger);});
test('cooldown prevents repeat and holding cannot auto-repeat',()=>{const e=armed();feed(e,closed,450,1150);assert.ok(e.update(open,1200).trigger);feed(e,open,1250,1600);feed(e,closed,1650,2350);assert.ok(!e.update(open,2400).trigger);feed(e,open,2450,3500);feed(e,closed,3550,4250);assert.ok(e.update(open,4300).trigger);});
test('mouth mode ignores eyes and fires only after mouth closes',()=>{const e=armed('mouth');feed(e,closed,450,1150);assert.ok(!e.update(open,1200).trigger);feed(e,open,1250,1600);feed(e,mouth,1650,2350);assert.ok(e.update(open,2400).trigger);});

test('moderate mouth opening works at the configured threshold',()=>{const e=armed('mouth');feed(e,{left:0,right:0,mouth:.3},450,1150);assert.ok(e.update(open,1200).trigger);});
test('sensitivity can be tuned without turning a natural blink into a page turn',()=>{const e=armed();e.thresholds.eyes=.35;feed(e,{left:.4,right:.4,mouth:0},450,550);assert.ok(!e.update(open,600).trigger);feed(e,open,650,1100);feed(e,{left:.4,right:.4,mouth:0},1150,1850);assert.ok(e.update(open,1900).trigger);});
