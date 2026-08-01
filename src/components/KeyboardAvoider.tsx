import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Reports whether the software keyboard is currently on screen.
 *
 * Used by composers to drop the home-indicator / navigation-bar inset while the
 * keyboard is up — the keyboard already occupies that strip, so keeping the
 * inset would leave a dead gap under the input bar.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(showEvent, () => setVisible(true)),
      Keyboard.addListener(hideEvent, () => setVisible(false)),
    ];
    return () => subs.forEach(sub => sub.remove());
  }, []);

  return visible;
}

interface KeyboardAvoiderProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Full-screen container that keeps its bottom child docked directly above the
 * software keyboard.
 *
 * `KeyboardAvoidingView behavior="padding"` cannot be used here. The Android
 * activity runs with `windowSoftInputMode="adjustResize"`, so the window is
 * already shortened by the keyboard; adding a keyboard-sized padding on top of
 * that counts the keyboard twice, which is what left the composer stranded in
 * the middle of the screen and squashed the content above it into (and over)
 * the header.
 *
 * Instead of branching on `Platform` — which silently breaks again if the
 * soft-input mode or edge-to-edge setting changes — this measures how much
 * height the container actually lost to the window resize and pads only the
 * part of the keyboard that still overlaps it. That is 0 on a resizing Android
 * window and the full keyboard height on iOS, where the window never resizes.
 */
export function KeyboardAvoider({ style, children }: KeyboardAvoiderProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [height, setHeight] = useState(0);
  // The container is the whole screen on a portrait-locked app, so its tallest
  // observed height is its height with the keyboard closed. Tracking the max
  // (rather than "the height while the keyboard was last hidden") makes the
  // baseline immune to whether the resize lands before or after the keyboard
  // event, which is not guaranteed on Android.
  const restHeightRef = useRef(0);

  useEffect(() => {
    // `keyboardWillChangeFrame` also covers the iOS hardware-keyboard and
    // floating-keyboard cases, where height shrinks without a hide event.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
        setKeyboardHeight(event.endCoordinates?.height ?? 0);
      }),
      Keyboard.addListener(hideEvent, () => setKeyboardHeight(0)),
    ];
    return () => subs.forEach(sub => sub.remove());
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    restHeightRef.current = Math.max(restHeightRef.current, next);
    setHeight(next);
  }, []);

  const shrunkBy = Math.max(0, restHeightRef.current - height);
  const paddingBottom = keyboardHeight > 0 ? Math.max(0, keyboardHeight - shrunkBy) : 0;

  return (
    <View style={[style, { paddingBottom }]} onLayout={handleLayout}>
      {children}
    </View>
  );
}
