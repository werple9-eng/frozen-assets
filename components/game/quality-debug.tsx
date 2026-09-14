'use client';
import { useState } from 'react';
import type { GameScene } from '@/lib/game/scene';

// Mounted only on localhost ?qa=1, whose saves live entirely in memory.
export function QualityDebug({ scene }: { scene: () => GameScene | null }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [scenario, setScenario] = useState('tutorial');
  const run = async () => {
    const s = scene();
    if (!s || running) return;
    setRunning(true);
    setResult({ status: 'running', scenario });
    try {
      let report: unknown;
      if (scenario === 'tutorial') {
        report = await (
          await import('@/lib/game/landline-ui-qa')
        ).tutorialUIAudit(s);
      } else if (scenario === 'graphics') {
        report = await (
          await import('@/lib/game/workshop-qa')
        ).workshopGraphicsAudit(s);
      } else if (scenario === 'contacts') {
        report = await (
          await import('@/lib/game/contact-qa')
        ).contactAudit(s, true);
      } else if (scenario === 'release') {
        report = await (
          await import('@/lib/game/release-qa')
        ).renderedReleaseStress(s, new AbortController().signal);
      } else if (scenario === 'profile' || scenario === 'lifetime') {
        const qa = (await import('@/lib/game/major-qa')).createMajorQA(
          s,
          new AbortController().signal,
        );
        if (scenario === 'profile') {
          qa.practiceMajorDelivery({
            delivery: 32,
            phase: 2,
            tool: 'breaker',
            developed: true,
          });
          report = await qa.profileField({ seconds: 8, tool: 'breaker' });
        } else {
          qa.startLifetime(20, true);
          for (let poll = 0; poll < 1200; poll++) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            const snapshot = qa.inspect();
            report = snapshot.lifetime;
            if (snapshot.lifetime.status !== 'running') break;
          }
        }
      } else {
        report = await (
          await import('@/lib/game/polish-qa')
        ).polishAudit(
          s,
          scenario as
            | 'calls'
            | 'map'
            | 'tools'
            | 'camera'
            | 'phone'
            | 'tool-pages'
            | 'growth',
        );
      }
      setResult({ status: 'complete', scenario, result: report });
    } catch (error) {
      setResult({ status: 'failed', scenario, error: String(error) });
    } finally {
      setRunning(false);
    }
  };
  return (
    <details className="quality-debug" data-hud>
      <summary>QA · Stress tests</summary>
      <div>
        <p>Isolated practice save · test fixtures replace this bench.</p>
        <label>
          Audit{' '}
          <select
            aria-label="QA audit"
            value={scenario}
            disabled={running}
            onChange={(e) => setScenario(e.target.value)}
          >
            {[
              'tutorial',
              'graphics',
              'contacts',
              'release',
              'profile',
              'lifetime',
              'calls',
              'map',
              'tools',
              'camera',
              'phone',
              'tool-pages',
              'growth',
            ].map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <button disabled={running} onClick={() => void run()}>
          {running ? 'Testing…' : 'Run audit'}
        </button>
        <pre aria-label="QA result">{JSON.stringify(result, null, 2)}</pre>
      </div>
      <style>{`.quality-debug{position:fixed;right:8px;top:8px;z-index:200;font:11px monospace;color:#e8e7cf;background:#172823;border:1px solid #637767;padding:8px;max-width:380px}.quality-debug>div{max-height:65vh;overflow:auto}.quality-debug select,.quality-debug button{background:#30433b;color:#fff;padding:8px;border:1px solid #70816d;margin:4px}.quality-debug pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10px monospace}.quality-debug summary{cursor:pointer}`}</style>
    </details>
  );
}
