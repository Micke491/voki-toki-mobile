import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BotChatWindow } from '../../src/features/bot/components/BotChatWindow';

export default function BotChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return <BotChatWindow chatId={id} />;
}
