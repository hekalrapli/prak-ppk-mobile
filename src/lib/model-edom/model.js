// src/lib/model-edom/model.js
// Pemuat bobot model-edom (JSON ~273 KB). Dipisah dari kode TypeScript agar
// TS memakai deklarasi di model.d.ts, bukan literal type raksasa dari
// resolveJsonModule untuk file JSON berukuran besar ini.
import modelEdom from './model-edom.json';

export default modelEdom;
