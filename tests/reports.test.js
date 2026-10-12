import test from 'node:test';
import assert from 'node:assert/strict';
import {filterReports,createReport,seedReports} from '../src/data.js';
test('filters combine search, category and status',()=>{const result=filterReports(seedReports,{search:'arequipa',category:'Alumbrado',status:'Reportado'});assert.equal(result.length,1);assert.equal(result[0].id,'AV-1048')});
test('personal reports exclude demonstration data',()=>{const r=createReport({title:' Poste roto ',description:'No ilumina',address:'Calle 3',category:'Alumbrado',lat:-12,lng:-77});const result=filterReports([...seedReports,r],{mine:true});assert.equal(result.length,1);assert.equal(result[0].title,'Poste roto');assert.equal(r.status,'Reportado');assert.equal(r.history.length,1)});
test('reports require valid location and nonempty content',()=>{assert.throws(()=>createReport({title:' ',description:'test',address:'test',category:'Limpieza',lat:0,lng:0}));assert.throws(()=>createReport({title:'test',description:'test',address:'test',category:'Limpieza',lat:100,lng:0}));});
test('popular sorting preserves input and orders support counts',()=>{const before=seedReports.map(r=>r.id);const result=filterReports(seedReports,{sort:'popular'});assert.equal(result[0].votes,32);assert.deepEqual(seedReports.map(r=>r.id),before)});
