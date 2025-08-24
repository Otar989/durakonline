// Minimal ambient module declarations for framer-motion to satisfy TS when skipLibCheck true.
declare module 'framer-motion' {
	import * as React from 'react';
	export interface MotionProps extends React.HTMLAttributes<any> {
		layout?: boolean; initial?: any; animate?: any; exit?: any; transition?: any; whileTap?: any;
		disabled?: boolean; // allow forwarding button prop
	}
	type MC = React.ComponentType<MotionProps>;
	export const motion: Record<string, MC> & { div: MC; button: MC };
	export const AnimatePresence: React.FC<{ initial?: boolean; children?: React.ReactNode }>;
}
