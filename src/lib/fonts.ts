import localFont from 'next/font/local';

const epilogue = localFont({
  src: [
    { path: '../../public/fonts/Epilogue-Regular.ttf', weight: '300 500', style: 'normal' },
    { path: '../../public/fonts/Epilogue-Semibold.ttf', weight: '600 800', style: 'normal' },
  ],
  variable: '--font-epilogue',
  display: 'swap',
});

const clashGrotesk = localFont({
  src: [
    { path: '../../public/fonts/ClashGrotesk-Regular.woff2', weight: '300 500', style: 'normal' },
    { path: '../../public/fonts/ClashGrotesk-Semibold.woff2', weight: '600 800', style: 'normal' },
  ],
  variable: '--font-clash-grotesk',
  display: 'swap',
});

export const fontVariables = `${epilogue.variable} ${clashGrotesk.variable}`;
