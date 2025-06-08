// 4. Offline Banner Component
// src/components/OfflineBanner.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTheme } from '../../utils/ThemeContext';

export const OfflineBanner = () => {
  const { isOnline, isConnecting } = useNetworkStatus();
  const { theme } = useTheme();

  if (isOnline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.warning }]}>
      <Icon name="wifi-off" size={16} color="#fff" />
      <Text style={styles.text}>
        {isConnecting ? 'Reconnecting...' : 'Working offline'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
