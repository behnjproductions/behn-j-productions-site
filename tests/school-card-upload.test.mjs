import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/AdminPage.jsx',import.meta.url),'utf8');
function setup(fail=false){
 const requests=[],failures=[]; let reloads=0;
 const context={useCallback:f=>f,studentId:null,slug:'school',reload:()=>{reloads++},data:{collection:{collectionType:'school',mode:'selection'},students:[{id:'a'},{id:'b'}]},uploadRef:{current:false},savingRef:{current:false},setError:()=>{},setUploadFailures:x=>failures.push(x),setUploadResult:()=>{},setUpload:()=>{},downloadFileIssue:()=>null,prepareImage:async()=>({blob:new Blob(['preview']),width:100,height:100}),WEB_SIDE:1200,THUMB_SIDE:200,FormData,File,resolvedDownloadType:()=> 'image/jpeg',api:async(path,options)=>{requests.push({path,body:options.body});if(fail)throw Error('offline');return {photo:{id:'p'}}},Promise};
 const block=source.slice(source.indexOf('  const addFiles = useCallback'),source.indexOf('  const protectPhotos ='));
 const add=vm.runInNewContext(block+'\naddFiles;',context);
 return {add,requests,failures,get reloads(){return reloads}};
}
test('group view drop uploads to explicit student, retains proof, and reloads counts',async()=>{
 const f=setup();await f.add([new File(['x'],'portrait.jpg',{type:'image/jpeg'})],'full','b');
 assert.equal(f.requests[0].body.get('studentId'),'b');assert.ok(f.requests[0].body.get('original'));assert.match(f.requests[1].path,/proof\/p$/);assert.equal(f.reloads,1);
});
test('failed card upload retains its student for retry while no student is open',async()=>{
 const f=setup(true);await f.add([new File(['x'],'portrait.jpg',{type:'image/jpeg'})],'full','a');
 const failure=f.failures.at(-1)[0];assert.equal(failure.studentId,'a');assert.equal(failure.retryable,true);
});
test('unknown student cannot receive card uploads',async()=>{
 const f=setup();await f.add([new File(['x'],'portrait.jpg')],'full','foreign');assert.equal(f.requests.length,0);
});
