import { useAuth } from '@clerk/expo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export const CLASS_BUD_ENTITLEMENT = 'class_bud';

const revenueCatApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

type SubscriptionContextValue = {
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isConfigured: boolean;
  isLoading: boolean;
  isClassBudActive: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<CustomerInfo>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function userFacingError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const configuredUserId = useRef<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = Platform.OS !== 'web' && Boolean(revenueCatApiKey) && Boolean(userId);

  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    setIsLoading(true);
    setError(null);
    try {
      const [offerings, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()]);
      setCurrentOffering(offerings.current ?? null);
      setCustomerInfo(info);
    } catch (cause) {
      setError(userFacingError(cause, 'Could not retrieve subscription information.'));
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!isLoaded || Platform.OS === 'web') return;
    if (!isSignedIn || !userId || !revenueCatApiKey) {
      if (configuredUserId.current) {
        void Purchases.logOut().catch(() => undefined);
        configuredUserId.current = null;
      }
      setCustomerInfo(null);
      setCurrentOffering(null);
      return;
    }

    let listener: ((info: CustomerInfo) => void) | null = null;
    const configure = async () => {
      try {
        if (await Purchases.isConfigured()) {
          if (configuredUserId.current !== userId) await Purchases.logIn(userId);
        } else {
          Purchases.configure({ apiKey: revenueCatApiKey, appUserID: userId });
        }
        configuredUserId.current = userId;
        listener = (info) => setCustomerInfo(info);
        Purchases.addCustomerInfoUpdateListener(listener);
        await refresh();
      } catch (cause) {
        setError(userFacingError(cause, 'Could not configure subscriptions.'));
      }
    };
    void configure();
    return () => {
      if (listener) Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [isLoaded, isSignedIn, refresh, userId]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    const { customerInfo: info } = await Purchases.purchasePackage(pkg);
    setCustomerInfo(info);
    return info;
  }, []);

  const restorePurchases = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    return info;
  }, []);

  const value = useMemo<SubscriptionContextValue>(() => ({
    customerInfo,
    currentOffering,
    isConfigured,
    isLoading,
    isClassBudActive: Boolean(customerInfo?.entitlements.active[CLASS_BUD_ENTITLEMENT]),
    error,
    refresh,
    purchasePackage,
    restorePurchases,
  }), [customerInfo, currentOffering, error, isConfigured, isLoading, purchasePackage, refresh, restorePurchases]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptions() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscriptions must be used within SubscriptionProvider.');
  return value;
}
