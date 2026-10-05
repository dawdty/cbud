import { useAuth } from '@clerk/expo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export const CLASS_BUD_ENTITLEMENT = 'class_bud';

const revenueCatApiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
});

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
  const identityVersion = useRef(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const expectedUserId = configuredUserId.current;
    const version = identityVersion.current;
    if (!expectedUserId || Platform.OS === 'web') return;
    setIsLoading(true);
    setError(null);
    try {
      const [offerings, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()]);
      if (identityVersion.current !== version || configuredUserId.current !== expectedUserId) return;
      setCurrentOffering(offerings.current ?? null);
      setCustomerInfo(info);
    } catch (cause) {
      if (identityVersion.current === version && configuredUserId.current === expectedUserId) {
        setCustomerInfo(null);
        setCurrentOffering(null);
        setError(userFacingError(cause, 'Could not retrieve subscription information.'));
      }
    } finally {
      if (identityVersion.current === version && configuredUserId.current === expectedUserId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    identityVersion.current += 1;
    const version = identityVersion.current;
    let listener: ((info: CustomerInfo) => void) | null = null;

    if (!isLoaded || Platform.OS === 'web') {
      setIsConfigured(false);
      setIsLoading(false);
      setCustomerInfo(null);
      setCurrentOffering(null);
      return;
    }
    if (!isSignedIn || !userId || !revenueCatApiKey) {
      setIsConfigured(false);
      setIsLoading(false);
      setCustomerInfo(null);
      setCurrentOffering(null);
      setError(!revenueCatApiKey ? 'Subscriptions are not configured for this platform.' : null);
      if (configuredUserId.current) {
        void Purchases.logOut().catch(() => undefined);
        configuredUserId.current = null;
      }
      return;
    }

    setIsConfigured(false);
    setIsLoading(true);
    setCustomerInfo(null);
    setCurrentOffering(null);
    setError(null);
    const configure = async () => {
      try {
        if (await Purchases.isConfigured()) {
          if (configuredUserId.current !== userId) await Purchases.logIn(userId);
        } else {
          Purchases.configure({ apiKey: revenueCatApiKey, appUserID: userId });
        }
        if (identityVersion.current !== version) return;
        configuredUserId.current = userId;
        listener = (info) => {
          if (identityVersion.current === version && configuredUserId.current === userId) setCustomerInfo(info);
        };
        Purchases.addCustomerInfoUpdateListener(listener);
        const [offerings, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()]);
        if (identityVersion.current !== version || configuredUserId.current !== userId) return;
        setCurrentOffering(offerings.current ?? null);
        setCustomerInfo(info);
        setIsConfigured(true);
      } catch (cause) {
        if (identityVersion.current !== version) return;
        configuredUserId.current = null;
        setCustomerInfo(null);
        setCurrentOffering(null);
        setError(userFacingError(cause, 'Could not configure subscriptions.'));
      } finally {
        if (identityVersion.current === version) setIsLoading(false);
      }
    };
    void configure();
    return () => {
      if (listener) Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [isLoaded, isSignedIn, userId]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    const expectedUserId = configuredUserId.current;
    const version = identityVersion.current;
    const { customerInfo: info } = await Purchases.purchasePackage(pkg);
    if (identityVersion.current === version && configuredUserId.current === expectedUserId) setCustomerInfo(info);
    return info;
  }, []);

  const restorePurchases = useCallback(async () => {
    const expectedUserId = configuredUserId.current;
    const version = identityVersion.current;
    const info = await Purchases.restorePurchases();
    if (identityVersion.current === version && configuredUserId.current === expectedUserId) setCustomerInfo(info);
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
