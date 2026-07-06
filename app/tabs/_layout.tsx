import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b',
          borderTopColor: '#27272a',
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#71717a',
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="bot" 
        options={{ 
          title: 'AI',
          tabBarIcon: ({ color, size }) => <Feather name="cpu" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />
        }} 
      />
    </Tabs>
  );
}