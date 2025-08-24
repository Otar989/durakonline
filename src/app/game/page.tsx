"use client";
import React from 'react';
import NewGamePage from '../../../ui/pages/NewGamePage';
import AppShell from '../../../ui/components/AppShell';

export default function GamePage(){
  return <main className="max-w-7xl mx-auto p-4 md:p-6"><AppShell><NewGamePage /></AppShell></main>;
}
