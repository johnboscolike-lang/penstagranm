import type { AppProps } from "next/app";

import "@/styles/globals.css";

/**
 * Loads global styles for the entire pages-router application.
 */
export default function PenstagramApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
