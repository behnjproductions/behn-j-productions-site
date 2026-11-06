import assert from 'node:assert/strict';
import test from 'node:test';
import { createGalleryFixture } from './helpers/galerie-fixture.mjs';
function fixture(t) {
 const f=createGalleryFixture();t.after(f.close);
 f.sqlite.exec(`INSERT INTO collections(id,slug,client,status,mode,collection_type) VALUES('school','school','School','publié','selection','school');
 INSERT INTO school_groups(id,collection_id,name) VALUES('group','school','Group');
 INSERT INTO school_students(id,group_id,link_key,name) VALUES('ready','group','ready','Ready'),('pending','group','pending','Pending');
 INSERT INTO photos(id,collection_id,student_id,r2_key,thumb_key,original_key,filename) VALUES
 ('chosen','school','ready','old-web','old-thumb','old-original','IMG_0001.jpg'),
 ('not-in-package','school','ready','other-web','other-thumb','other-original','IMG_0002.jpg'),
 ('pending-photo','school','pending','pending-web','pending-thumb','pending-original','IMG_0003.jpg');
 INSERT INTO selections(collection_id,student_id,photo_ids,note) VALUES('school','ready','["chosen","not-in-package"]','Keep note');
 INSERT INTO school_deliveries(student_id,collection_id,enabled,batch_id) VALUES('ready','school',0,'test');
 INSERT INTO school_delivery_photos(student_id,photo_id,r2_key,thumb_key,original_key,width,height) VALUES('ready','chosen','final-web','final-thumb','final-original',4000,6000);`);
 f.env.PROOF_REQUIRED='true';f.env.BUCKET={get:async key=>({body:key,httpEtag:key,writeHttpMetadata(h){h.set('content-type','image/jpeg');}})};
 return {...f,enable:()=>f.sqlite.exec("UPDATE school_deliveries SET enabled=1 WHERE student_id='ready'")};
}
test('activation serves only authorized finals, preserves pending gallery and all selections, and rolls back',async t=>{
 const f=fixture(t);const before=f.rows();const pending=await(await f.request('/galerie/eleve-pending')).json();const staged=await(await f.request('/galerie/eleve-ready')).json();assert.equal(staged.mode,'selection');assert.equal(staged.photos.length,2);
 f.enable();const ready=await(await f.request('/galerie/eleve-ready')).json();assert.equal(ready.mode,'download');assert.deepEqual(ready.photos.map(p=>p.id),['chosen']);assert.equal(ready.photos[0].w,4000);assert.equal(ready.photos[0].downloadQuality,'original');assert.deepEqual(await(await f.request('/galerie/eleve-pending')).json(),pending);assert.deepEqual(f.rows(),before);assert.equal(f.sqlite.prepare("SELECT mode FROM collections WHERE id='school'").get().mode,'selection');
 const preview=await f.request('/photo/chosen?eleve=eleve-ready');assert.equal(await preview.text(),'final-thumb');assert.equal(preview.headers.get('cache-control'),'private, no-store');assert.equal(await(await f.request('/photo/chosen?s=web&eleve=eleve-ready')).text(),'final-web');assert.equal(await(await f.request('/photo/chosen/download?eleve=eleve-ready')).text(),'final-original');
 for(const path of ['/photo/not-in-package?eleve=eleve-ready','/photo/not-in-package/download?eleve=eleve-ready','/photo/pending-photo?eleve=eleve-ready','/photo/chosen?eleve=eleve-pending'])assert.equal((await f.request(path)).status,403,path);
 assert.equal(await(await f.request('/photo/pending-photo?eleve=eleve-pending')).text(),'proofs/pending-photo.jpg');
 f.sqlite.exec('UPDATE school_deliveries SET enabled=0');assert.deepEqual(await(await f.request('/galerie/eleve-ready')).json(),staged);assert.deepEqual(f.rows(),before);
});
test('email download grants reject photos outside the package and remain family-scoped',async t=>{
 const f=fixture(t);f.enable();f.env.DOWNLOAD_EMAIL_REQUIRED='true';const grant=ids=>f.request('/galerie/eleve-ready/download-request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'family@example.test',photoIds:ids,category:'full',quality:'original'})});
 assert.equal((await grant(['not-in-package'])).status,400);assert.equal((await grant(['pending-photo'])).status,400);assert.equal((await f.request('/photo/chosen/download?eleve=eleve-ready')).status,403);const r=await grant(['chosen']);assert.equal(r.status,201);const d=await r.json();const suffix=`&d=${d.downloadId}&dt=${encodeURIComponent(d.token)}&quality=original`;assert.equal(await(await f.request('/photo/chosen/download?eleve=eleve-ready'+suffix)).text(),'final-original');assert.equal((await f.request('/photo/not-in-package/download?eleve=eleve-ready'+suffix)).status,403);assert.equal((await f.request('/photo/chosen/download?eleve=eleve-pending'+suffix)).status,403);
});
test('delivered families cannot overwrite choices and pending families can still submit',async t=>{
 const f=fixture(t);f.enable();const before=f.rows();const submit=(s,p)=>f.request(`/galerie/eleve-${s}/selection`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({photoIds:[p]})});assert.equal((await submit('ready','chosen')).status,409);assert.deepEqual(f.rows(),before);assert.equal((await submit('pending','pending-photo')).status,200);assert.deepEqual(f.rows().slice(0,before.length),before);
});
test('delivery obeys publication and password and cannot activate a foreign school',async t=>{
 const f=fixture(t);f.enable();f.sqlite.exec("UPDATE collections SET status='brouillon' WHERE id='school'");assert.equal((await f.request('/galerie/eleve-ready')).status,404);assert.equal((await f.request('/photo/chosen?eleve=eleve-ready')).status,403);f.sqlite.exec("UPDATE collections SET status='publié',password_hash='protected' WHERE id='school'");assert.equal((await(await f.request('/galerie/eleve-ready')).json()).locked,true);assert.equal((await f.request('/photo/chosen?eleve=eleve-ready')).status,403);f.sqlite.exec("UPDATE collections SET password_hash=NULL WHERE id='school';UPDATE school_deliveries SET collection_id='other'");assert.equal((await(await f.request('/galerie/eleve-ready')).json()).mode,'selection');
});
test('worker is backward compatible before additive migration',async t=>{
 const f=fixture(t);f.sqlite.exec('DROP TABLE school_delivery_photos;DROP TABLE school_deliveries;');const d=await(await f.request('/galerie/eleve-ready')).json();assert.equal(d.mode,'selection');assert.equal(d.photos.length,2);
});
