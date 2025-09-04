// scripts/merge-prisma.js
import fs from 'fs';
import path from 'path';

const headerPath = path.resolve('prisma/_header.prisma');
const modelsDir = path.resolve('prisma/models');
const outPath = path.resolve('prisma/schema.merged.prisma');

// Đọc header (nếu không tồn tại, tạo header mặc định)
let header = '// Auto-generated schema (do not edit)\n\n';
if (fs.existsSync(headerPath)) {
  header += fs.readFileSync(headerPath, 'utf8').trim() + '\n\n';
} else {
  header += `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n\n`;
}

// Lấy tất cả file .prisma trong models (sort để có thứ tự nhất định)
const files = fs
  .readdirSync(modelsDir)
  .filter((f) => f.endsWith('.prisma'))
  .sort();

let merged = header;

// Nối từng file model (kèm comment phân biệt)
for (const f of files) {
  const content = fs.readFileSync(path.join(modelsDir, f), 'utf8').trim();
  if (!content) continue;
  merged += `// ===== ${f} =====\n${content}\n\n`;
}

fs.writeFileSync(outPath, merged.trim() + '\n');
console.log(`✅ Merged ${files.length} model files → ${outPath}`);
