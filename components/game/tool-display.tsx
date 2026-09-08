'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- This image is a live WebGL canvas, not an img source. */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { toolMesh } from '@/lib/game/workshop';
import type { ToolId } from '@/lib/game/campaign-content';
export function ToolDisplay({ tool }: { tool: ToolId }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current!,
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    scene.add(new THREE.HemisphereLight(0xe1eff3, 0x4b3321, 3));
    const key = new THREE.DirectionalLight(0xffdf9c, 5);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fcfe2, 4);
    rim.position.set(-4, 1, -2);
    scene.add(rim);
    const model = toolMesh(tool),
      pivot = new THREE.Group(),
      box = new THREE.Box3().setFromObject(model),
      center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3());
    model.position.sub(center);
    pivot.add(model);
    scene.add(pivot);
    camera.position.set(
      0,
      Math.max(size.x, size.y, size.z) * 0.25,
      Math.max(size.x, size.y, size.z) * 2.15,
    );
    camera.lookAt(0, 0, 0);
    pivot.rotation.set(1.15, -0.55, -0.4);
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const reduced =
          !!el.closest('.reduced-motion') ||
          matchMedia('(prefers-reduced-motion: reduce)').matches,
        t = Math.min(1, (now - start) / 750);
      pivot.scale.setScalar(
        reduced ? 1 : 1 - Math.exp(-t * 7) * Math.cos(t * 10) * 0.12,
      );
      pivot.rotation.y = -0.55 + (reduced ? 0 : Math.sin(now * 0.0004) * 0.12);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [tool]);
  return (
    <div
      className="tool-display"
      ref={host}
      role="img"
      aria-label={`Three-dimensional ${tool} tool model`}
    />
  );
}
