import { useEffect, useState } from 'react';
import { ZenoxEngine } from '../bridge/ZenoxEngine';

type ZenoxStatus = {
  isActive: boolean;
  remainingSeconds: number;
  scheduleName: string;
  isFortress: boolean;
};

const INITIAL_STATUS: ZenoxStatus = {
  isActive: false,
  remainingSeconds: 0,
  scheduleName: '',
  isFortress: false,
};

export const useZenoxStatus = () => {
  const [status, setStatus] = useState<ZenoxStatus>(INITIAL_STATUS);

  useEffect(() => {
    let mounted = true;

    const refreshStatus = async () => {
      try {
        const next = await ZenoxEngine.getZenStatus();
        if (mounted) setStatus(next);
      } catch {
        if (mounted) setStatus(INITIAL_STATUS);
      }
    };

    refreshStatus();
    const intervalId = setInterval(refreshStatus, 1000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return status;
};

