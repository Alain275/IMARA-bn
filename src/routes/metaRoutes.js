import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
let cache = null;

// Resolve location.json robustly based on the monorepo layout.
// This file lives in backend-api/src/routes, while location.json lives in:
// - backend-api/database/location.json (primary)
// - database/location.json at repo root (fallback)
function loadLocationsOnce() {
  if (cache) return cache;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Monorepo root is two levels up from backend-api/src/routes
  // routes -> src -> backend-api -> SmartFarmiX
  const monorepoRoot = path.resolve(__dirname, '../../..');

  const tryPaths = [
    // backend-api/database/location.json (one level up from src, then into database)
    path.resolve(__dirname, '../../database/location.json'),
    // backend-api/src/database/location.json (fallback if structure changes)
    path.resolve(__dirname, '../database/location.json'),
    // monorepo root /database/location.json (SmartFarmiX/database/location.json)
    path.resolve(monorepoRoot, 'database/location.json'),
  ];

  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, { encoding: 'utf-8' });
        const data = JSON.parse(raw);
        // Normalize into lookup maps for easy dropdowns
        const provinces = (data.provinces || []).map(p => ({ name: p.name }));
        const districts = {};
        const sectors = {};
        const cells = {};
        const villages = {};
        for (const prov of data.provinces || []) {
          districts[prov.name] = (prov.districts || []).map(d => ({ name: d.name }));
          for (const d of prov.districts || []) {
            if (Array.isArray(d.sectors) && d.sectors.length) {
              sectors[d.name] = d.sectors.map(s => ({ name: s.name }));
              for (const s of d.sectors) {
                cells[s.name] = (s.cells || []).map(c => ({ name: c.name }));
                for (const c of s.cells || []) {
                  villages[c.name] = (c.villages || []).map(v => v.name || v);
                }
              }
            } else if (Array.isArray(d.cells)) {
              sectors[d.name] = [];
              cells[d.name] = (d.cells || []).map(c => ({ name: c.name }));
              for (const c of d.cells || []) {
                villages[c.name] = (c.villages || []).map(v => v.name || v);
              }
            }
          }
        }
        cache = { provinces, districts, sectors, cells, villages };
        return cache;
      }
    } catch (e) {
      // continue to next path
    }
  }

  throw new Error('location.json not found');
}

router.get('/locations', (_req, res) => {
  try {
    res.json(loadLocationsOnce());
  } catch (e) {
    res.status(500).json({ error: 'Failed to load locations', details: e.message });
  }
});

export default router;


