import { StoreProvider } from '../lib/useStore';
import ToastContainer from '../components/Toast';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <StoreProvider>
      <Component {...pageProps} />
      <ToastContainer />
    </StoreProvider>
  );
}
