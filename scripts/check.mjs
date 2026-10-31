import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const context = { window: {} };
vm.runInNewContext(readFileSync('dist/data.js','utf8'),context);
const {questions,topics} = context.window.CITY_QUIZ;
assert.equal(questions.length,41,'В основном квизе должно быть ровно 41 вопрос');
assert.equal(new Set(questions.map(q=>q.id)).size,41,'Идентификаторы должны быть уникальны');
for(const t of topics){
  assert.equal(questions.filter(q=>q.topic===t.id).length,t.count,`Число вопросов в теме ${t.name}`);
  assert.ok(existsSync('dist/assets/'+t.image),`Фото темы ${t.name}`);
}
for(const q of questions){
  assert.equal(q.options.length,3,`Три варианта для вопроса ${q.id}`);
  assert.equal(new Set(q.options).size,3,`Разные варианты для вопроса ${q.id}`);
  assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<3);
  assert.ok(q.explanation.length>50,`Содержательное пояснение для вопроса ${q.id}`);
  assert.ok(q.source[1].startsWith('https://'),`Источник вопроса ${q.id}`);
}
const credits=JSON.parse(readFileSync('dist/assets/credits.json','utf8'));
for(const credit of credits){assert.ok(existsSync('dist/assets/'+credit.file));assert.ok(credit.author&&credit.license&&credit.source);}
for(const q of questions){
  if(!q.photo)continue;
  const credit=credits.find(c=>c.id===q.photo||c.place.toLowerCase()===q.photo);
  const photo=credit?.file||(['venice','tokyo','newyork'].includes(q.photo)?q.photo+'.jpg':null);
  assert.ok(photo&&existsSync('dist/assets/'+photo),`Фото ответа на вопрос ${q.id}`);
}
assert.ok(existsSync('dist/assets/club-next.jpg'),'Оригинальная эмблема клуба');
assert.ok(existsSync('dist/assets/share-card.jpg'),'Обложка для карточки ссылки');
const css=readFileSync('dist/fonts.css','utf8');
for(const [,font] of css.matchAll(/url\(([^)]+)\)/g))assert.ok(existsSync('dist/'+font),`Локальный шрифт ${font}`);
console.log('OK: 41 вопрос, 4 темы, 123 варианта, пояснения, источники, фото и локальные шрифты.');
