import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../api/client';

// Health lives at the server origin, not under /api.
const HEALTH_URL = API_BASE_URL.replace(/\/api\/?$/, '') + '/health';
const ATTEMPT_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 3000;
const WAKING_COPY_AFTER_MS = 2000;
const STILL_TRYING_AFTER_MS = 90000;

/**
 * Blocks the app until the backend answers /health. The Render free tier
 * spins down when idle; without this, launch-time API calls time out and
 * used to be mistaken for an invalid session.
 */
export const ServerGate = ({ children }: React.PropsWithChildren) => {
  const [ready, setReady] = useState(false);
  const [waking, setWaking] = useState(false);
  const [stillTrying, setStillTrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const wakingTimer = setTimeout(() => setWaking(true), WAKING_COPY_AFTER_MS);
    const stillTimer = setTimeout(() => setStillTrying(true), STILL_TRYING_AFTER_MS);

    const poll = async () => {
      while (!cancelled) {
        try {
          await axios.get(HEALTH_URL, { timeout: ATTEMPT_TIMEOUT_MS });
          if (!cancelled) setReady(true);
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(wakingTimer);
      clearTimeout(stillTimer);
    };
  }, []);

  if (ready) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VokiToki</Text>
      <ActivityIndicator size="large" color="#2563eb" style={styles.spinner} />
      {waking && (
        <>
          <Text style={styles.title}>Waking up the server…</Text>
          <Text style={styles.subtitle}>
            Free hosting sleeps when idle. This can take up to a minute.
          </Text>
        </>
      )}
      {stillTrying && <Text style={styles.subtitle}>Still trying — hang tight…</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f4f4f5',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f4f4f5',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
});
