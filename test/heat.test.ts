import { describe, expect, test } from 'bun:test';

import { heatStyle, heatTitle } from '../src/client/lib/heat.ts';

function mix(style: ReturnType<typeof heatStyle>): number {
	const match = /(\d+)%/.exec(String(style?.background));
	return match ? Number(match[1]) : 0;
}

describe('heatStyle', () => {
	test('leaves the cell plain without both numbers', () => {
		expect(heatStyle(null, 94, 2.5)).toBeUndefined();
		expect(heatStyle(96, null, 2.5)).toBeUndefined();
		expect(heatStyle(96, 94, 0)).toBeUndefined();
	});

	test('tints above the baseline warm and below it cool', () => {
		expect(String(heatStyle(96, 94, 2.5)?.background)).toContain('--warn');
		expect(String(heatStyle(92, 94, 2.5)?.background)).toContain('--info');
	});

	test('is plain exactly on the baseline', () => {
		expect(heatStyle(94, 94, 2.5)).toBeUndefined();
	});

	test('grows with the delta and saturates at the span', () => {
		expect(mix(heatStyle(95, 94, 2.5))).toBe(18);
		expect(mix(heatStyle(96.5, 94, 2.5))).toBe(45);
		// Past the span, and past it again, both clamp to the max mix.
		expect(mix(heatStyle(100, 94, 2.5))).toBe(45);
		expect(mix(heatStyle(-100, 94, 2.5))).toBe(45);
	});
});

describe('heatTitle', () => {
	test('shows a dash for a missing value', () => {
		expect(heatTitle('Velo', null, 94, 'mph')).toBe('Velo: —');
	});

	test('notes when there is no league baseline', () => {
		expect(heatTitle('Spin', 2400, null, 'rpm', 0)).toBe('Spin: 2400 rpm (no league average)');
	});

	test('reports the baseline and a signed delta', () => {
		expect(heatTitle('Velo', 96.2, 94, 'mph')).toBe(
			'Velo: 96.2 mph\nLeague avg: 94.0 mph\nDelta: +2.2 mph'
		);
		expect(heatTitle('Velo', 92.7, 94, 'mph')).toBe(
			'Velo: 92.7 mph\nLeague avg: 94.0 mph\nDelta: -1.3 mph'
		);
	});
});
