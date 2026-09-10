import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESK_PROPS,
  LAMP_ARM_MIN_Y,
  RAISED_PROP_MIN_Y,
  ROOM,
  TRAY_CLEARANCE_RADIUS,
  TRAY_SWEEP_RADIUS,
  TRAY_SWEEP_TOP,
  clearsTray,
  nearestDistance,
  trayCorners,
} from '../lib/game/room-layout';
import { TUNE } from '../lib/game/tuning';
import { campaignField } from '../lib/game/campaign-layout';
import { MAJOR_BLOCKS } from '../lib/game/major-campaign';

void test('every desk prop clears the tray at every yaw and both tilt extremes', () => {
  for (const f of DESK_PROPS)
    assert.ok(
      clearsTray(f),
      `${f.id} reaches ${nearestDistance(f).toFixed(2)} of the tray centre; clearance is ${TRAY_CLEARANCE_RADIUS.toFixed(2)}`,
    );
  // The sweep radius is the farthest tray corner at any yaw, and the raised
  // shelf sits above the highest corner at full tilt.
  for (const yaw of [0, 0.7, Math.PI / 2, 2.1, Math.PI, 4.4, 5.9])
    for (const tilt of [-TUNE.rotationTiltLimit, 0, TUNE.rotationTiltLimit])
      for (const c of trayCorners(yaw, tilt)) {
        assert.ok(Math.hypot(c.x, c.z) <= TRAY_SWEEP_RADIUS + 1e-9);
        assert.ok(c.y <= TRAY_SWEEP_TOP + 1e-9);
      }
  assert.ok(RAISED_PROP_MIN_Y > TRAY_SWEEP_TOP);
  const raised = DESK_PROPS.filter((f) => f.y !== undefined);
  assert.ok(raised.length >= 2, 'the phone rests on a raised shelf');
  for (const f of raised) assert.ok(f.y! >= RAISED_PROP_MIN_Y, f.id);
});

void test('every authored block, including the Vault, fits inside the room and under the lamp arm', () => {
  for (let block = 0; block < MAJOR_BLOCKS.length; block++) {
    const phases = MAJOR_BLOCKS[block].ice?.phases.length ?? 1;
    for (let phase = 0; phase < phases; phase++) {
      const field = campaignField(block, phase);
      const scale = Math.max(
        field.grid.physicalWidth / 12.8,
        field.grid.physicalDepth / 8.5,
      );
      let maxX = 0,
        maxZ = 0,
        maxY = -Infinity;
      for (let i = 0; i < field.values.length; i++)
        if (field.values[i] > 0) {
          const p = field.points[i];
          maxX = Math.max(maxX, Math.abs(p.x));
          maxZ = Math.max(maxZ, Math.abs(p.z));
          maxY = Math.max(maxY, p.y);
        }
      const label = `delivery ${block + 1} phase ${phase + 1}`;
      assert.ok(
        maxX < (ROOM.halfWidth - 1) * scale,
        `${label}: width ${maxX.toFixed(1)}`,
      );
      assert.ok(
        maxZ < (-ROOM.back - 1) * scale,
        `${label}: depth ${maxZ.toFixed(1)}`,
      );
      assert.ok(
        maxY + 0.5 < LAMP_ARM_MIN_Y * scale - 0.25,
        `${label}: ice top ${maxY.toFixed(1)} reaches the lamp arm at ${(LAMP_ARM_MIN_Y * scale).toFixed(1)}`,
      );
    }
  }
});
