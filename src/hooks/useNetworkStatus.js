// src/hooks/useNetworkStatus.js
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected && state.isInternetReachable;
      
      setIsOnline(isNowOnline);
      
      // If we just came back online, trigger sync
      if (wasOffline && isNowOnline) {
        setIsConnecting(true);
        // Trigger sync in your controllers
        setTimeout(() => setIsConnecting(false), 2000);
      }
    });

    return unsubscribe;
  }, [isOnline]);

  return { isOnline, isConnecting };
};