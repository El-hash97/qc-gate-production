import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as THREE from 'three';
import { ViewGizmo, viewPose } from '@/components/visual/ViewGizmo';

const center = new THREE.Vector3(1, 0, 19);
const home = { target: new THREE.Vector3(-1, 0, 17), pos: new THREE.Vector3(-17, 11.5, 2) };

describe('viewPose', () => {
  it('looks straight down for Z, with north up', () => {
    const { pos, target } = viewPose('z', center, home);
    expect(target).toEqual(center);
    expect(pos.y).toBeGreaterThan(50);
    expect(pos.x).toBe(1);
    expect(pos.z).toBeGreaterThan(19);
  });

  it('comes in from the named side for X / -X / Y / -Y (Blender Y = north = -z)', () => {
    expect(viewPose('x', center, home).pos.x).toBeGreaterThan(30);
    expect(viewPose('-x', center, home).pos.x).toBeLessThan(-30);
    expect(viewPose('y', center, home).pos.z).toBeLessThan(-10);
    expect(viewPose('-y', center, home).pos.z).toBeGreaterThan(50);
    // tilted, not level, so the line shows over the 6 m walls
    expect(viewPose('x', center, home).pos.y).toBeGreaterThan(15);
  });

  it('goes back to the start view for home', () => {
    expect(viewPose('home', center, home)).toEqual(home);
  });
});

describe('ViewGizmo', () => {
  it('reports the picked view and binds a per-frame update', async () => {
    const onPick = vi.fn();
    const bind = vi.fn();
    render(<ViewGizmo onPick={onPick} bind={bind} />);
    await userEvent.click(screen.getByRole('button', { name: 'View from +Z' }));
    await userEvent.click(screen.getByRole('button', { name: 'View from −X' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(onPick.mock.calls.map(([a]) => a)).toEqual(['z', '-x', 'home']);
    // the update moves the balls with the camera
    const update = bind.mock.calls[0][0];
    update(new THREE.Quaternion());
    expect(screen.getByRole('button', { name: 'View from +X' }).style.transform).toBe('translate(34px, 0px)');
  });
});
