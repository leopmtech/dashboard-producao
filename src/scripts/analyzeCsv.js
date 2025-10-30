/*
  Usage: node src/scripts/analyzeCsv.js "/absolute/path/to/file.csv"
*/

const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function sanitize(value) {
  if (value == null) return '';
  return String(value).trim();
}

function extractYearFromDateString(str) {
  if (!str) return null;
  const m = String(str).match(/\b(20\d{2})\b/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function analyzeCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) {
    console.error('Empty file');
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]);
  const colIndex = (nameFallbacks) => {
    for (const name of nameFallbacks) {
      const idx = header.findIndex(h => sanitize(h).toLowerCase() === sanitize(name).toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxTipo = colIndex(['Tipo de demanda', 'tipoDemanda', 'Tipo', 'Tipo de Demanda']);
  const idxData = colIndex(['Data de entrega', 'dataEntrega', 'DataEntrega']);
  const idxCliente = colIndex(['Cliente', 'cliente', 'Cliente1']);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.every(cell => sanitize(cell) === '')) continue; // skip fully empty
    rows.push(row);
  }

  const totalRows = rows.length;

  let tipoEmpty = 0;
  let tipoFilled = 0;
  let year2024 = 0;
  let year2025 = 0;
  let heatmap2025Like = 0; // has 2025 in date and non-empty cliente

  rows.forEach(row => {
    const tipo = idxTipo >= 0 ? sanitize(row[idxTipo]) : '';
    const dataStr = idxData >= 0 ? sanitize(row[idxData]) : '';
    const cliente = idxCliente >= 0 ? sanitize(row[idxCliente]) : '';

    if (tipo) tipoFilled++; else tipoEmpty++;

    const yr = extractYearFromDateString(dataStr);
    if (yr === 2024) year2024++;
    if (yr === 2025) year2025++;

    if (yr === 2025 && cliente) heatmap2025Like++;
  });

  console.log(JSON.stringify({
    header,
    columns: { idxTipo, idxData, idxCliente },
    totals: {
      totalRows,
      tipoFilled,
      tipoEmpty,
      year2024,
      year2025,
      heatmap2025Like
    }
  }, null, 2));
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node src/scripts/analyzeCsv.js "/absolute/path/to/file.csv"');
  process.exit(1);
}

analyzeCsv(path.resolve(file));


