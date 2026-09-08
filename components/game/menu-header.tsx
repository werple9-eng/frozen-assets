'use client';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { KineticText } from './motion';
export function MenuHeader({
  screen,
  subtitle,
}: {
  screen: 'Upgrades' | 'Settings';
  subtitle: string;
}) {
  return (
    <header className={`menu-header ${screen.toLowerCase()}`}>
      <span className="menu-rivet" />
      <small>
        {screen === 'Upgrades'
          ? 'BELLWETHER / WORKSHOP EQUIPMENT'
          : 'RECOVERY STATION / PERSONAL PREFERENCES'}
      </small>
      <DialogTitle>
        <KineticText text={screen.toUpperCase()} interval={38} delay={80} />
      </DialogTitle>
      <DialogDescription>{subtitle}</DialogDescription>
      <span className="menu-rivet" />
    </header>
  );
}
