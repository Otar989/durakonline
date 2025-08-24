// Minimal ambient module declarations for framer-motion to satisfy TS when skipLibCheck true.
declare module 'framer-motion' {
	import * as React from 'react';
	export interface MotionProps extends React.HTMLAttributes<any> { layout?: boolean; initial?: any; animate?: any; exit?: any; transition?: any; whileTap?: any; }
	export const motion: Record<string, React.ComponentType<MotionProps>> & { div: React.ComponentType<MotionProps>; button: React.ComponentType<MotionProps>; };
	export const AnimatePresence: React.FC<{ initial?: boolean; children?: React.ReactNode }>;
}
