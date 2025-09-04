import fs from 'fs';
import path from 'path';

const headerPath = path.resolve('prisma/_header.prisma');
const modelsDir = path.resolve('prisma/models');
const outPath = path.resolve('prisma/schema.prisma');

const header = fs.readFileSync(headerPath, 'utf-8');
const modelFiles = fs
  .readdirSync(modelsDir)
  .filter((f) => f.endsWith('.prisma'));

let models = '';
for (const file of modelFiles) {
  models += fs.readFileSync(path.join(modelsDir, file), 'utf-8') + '\n';
}

fs.writeFileSync(outPath, header + '\n' + models);
console.log('✅ Prisma schema merged!');
