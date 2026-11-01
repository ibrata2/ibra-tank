import assert from 'node:assert/strict';
import { MODES, SECRET_STAGES, vehicleFor, resolveSecret } from '../src/campaign.mjs';
assert.deepEqual(MODES, ['tank', 'heli', 'boat', 'combined']);
assert.equal(new Set(SECRET_STAGES.map(s => s.code)).size, 10);
for (const mode of MODES.slice(0, 3)) for (const level of [1, 8, 99, 10000]) assert.equal(vehicleFor(mode, level), mode);
for (let level = 1; level <= 300; level++) assert.equal(vehicleFor('combined', level), 'tank');
for (const stage of SECRET_STAGES) { assert.equal(resolveSecret(stage.code), stage); assert.equal(resolveSecret(' '+stage.code+' '), stage); assert.ok(stage.level > 1); }
assert.equal(resolveSecret('٧٣١٩٠٤'), SECRET_STAGES[0]);
assert.equal(resolveSecret('۷۳۱۹۰۴'), SECRET_STAGES[0]);
for (const invalid of ['', '000000', '731904x', '<script>', '73190', '7319041']) assert.equal(resolveSecret(invalid), null);
console.log('Campaign modes, combined campaign starts with tank and ten secret codes: passed');
