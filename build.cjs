const fs=require('node:fs');const vm=require('node:vm');
for(const file of ['app.js','sw.js'])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8').replace(/^\uFEFF/,''));if(!manifest.name.includes('Uniluva'))throw Error('Wrong manifest');
const html=fs.readFileSync('index.html','utf8');for(const id of ['cards','task-form','tasks','detail','pause-clock','text-size'])if(!html.includes('id="'+id+'"'))throw Error('Missing element '+id);
fs.mkdirSync('dist',{recursive:true});for(const file of ['index.html','styles.css','app.js','sw.js','manifest.json','icon-192.svg','icon-512.svg','og.png']){if(fs.existsSync(file))fs.copyFileSync(file,'dist/'+file)}console.log('Uniluva lista: código y recursos verificados.');
