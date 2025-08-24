// Augment framer-motion types to include layoutId (temporary until upstream types updated for React 19)
import 'framer-motion';
import { MotionProps } from 'framer-motion';

declare module 'framer-motion' {
  interface MotionProps {
    layoutId?: string;
  }
}
