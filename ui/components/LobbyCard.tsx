"use client";
import React from 'react';

interface LobbyCardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const LobbyCard: React.FC<LobbyCardProps> = ({ title, children, footer, className }) => {
  return (
    <section className={"glass rounded-2xl p-5 flex flex-col gap-4 shadow-lg " + (className||"") }>
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </header>
      <div className="flex flex-col gap-4">
        {children}
      </div>
      {footer && <footer className="pt-2 border-t border-white/10 text-xs flex flex-col gap-2">{footer}</footer>}
    </section>
  );
};

export default LobbyCard;
