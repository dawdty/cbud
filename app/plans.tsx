import { useAuth } from '@clerk/expo';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { PurchasesPackage } from 'react-native-purchases';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CLASS_BUD_ENTITLEMENT, useSubscriptions } from '../lib/subscriptions';

type PurchaseMessage = { kind: 'success' | 'error'; text: string };

function userCancelled(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'userCancelled' in error && error.userCancelled === true;
}

export default function PlansPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<PurchaseMessage | null>(null);
  const { currentOffering, error, isClassBudActive, isConfigured, isLoading, purchasePackage, refresh, restorePurchases } = useSubscriptions();
  const plans = (currentOffering?.availablePackages ?? []).filter((plan) => plan.product.identifier === 'monthly');

  const handlePurchase = async (plan: PurchasesPackage) => {
    if (purchasingPlanId) return;
    setPurchasingPlanId(plan.identifier);
    setPurchaseMessage(null);
    try {
      await purchasePackage(plan);
      await refresh();
      setPurchaseMessage({ kind: 'success', text: 'Purchase received. Access may be pending; retry shortly.' });
    } catch (purchaseError) {
      if (userCancelled(purchaseError)) return;
      setPurchaseMessage({ kind: 'error', text: purchaseError instanceof Error ? purchaseError.message : 'Could not complete the purchase.' });
    } finally {
      setPurchasingPlanId(null);
    }
  };

  const handleRestorePurchases = async () => {
    if (purchasingPlanId) return;
    setPurchasingPlanId('restore');
    setPurchaseMessage(null);
    try {
      const customerInfo = await restorePurchases();
      await refresh();
      setPurchaseMessage(customerInfo.entitlements.active[CLASS_BUD_ENTITLEMENT]
        ? { kind: 'success', text: 'Purchases restored. Access may be pending; retry shortly.' }
        : { kind: 'error', text: 'No active class_bud purchase was found.' });
    } catch (restoreError) {
      setPurchaseMessage({ kind: 'error', text: restoreError instanceof Error ? restoreError.message : 'Could not restore purchases.' });
    } finally {
      setPurchasingPlanId(null);
    }
  };

  if (!isLoaded) return <View style={styles.loading}><ActivityIndicator size="large" color="#890620" /></View>;
  if (!isSignedIn) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>cbud.</Text>
          <Text style={styles.heading}>plans</Text>
        </View>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator>
          {Platform.OS === 'web' ? (
            <Text style={styles.helpText}>Purchases are available in the iOS or Android app.</Text>
          ) : !isConfigured ? (
            <Text style={styles.helpText}>Plans will appear after RevenueCat is configured for this build.</Text>
          ) : isLoading ? <ActivityIndicator color="#890620" size="small" /> : plans.length ? plans.map((plan) => {
            const isCurrentPlan = isClassBudActive;
            const isPurchasing = purchasingPlanId === plan.identifier;
            return <View key={plan.identifier} style={styles.plan}>
              <View style={styles.planCopy}>
                <Text style={styles.planTitle}>{plan.product.title}</Text>
                <Text style={styles.planDescription}>{plan.product.description}</Text>
                <Text style={styles.planPrice}>{plan.product.priceString} / month</Text>
              </View>
              <Pressable accessibilityLabel={`${isCurrentPlan ? 'Current' : 'Choose'} ${plan.product.title} plan`} disabled={isCurrentPlan || Boolean(purchasingPlanId)} onPress={() => void handlePurchase(plan)} style={[styles.primaryButton, (isCurrentPlan || Boolean(purchasingPlanId)) && styles.buttonDisabled]}>
                {isPurchasing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>{isCurrentPlan ? 'current plan' : 'choose monthly plan'}</Text>}
              </Pressable>
            </View>;
          }) : <Text style={styles.helpText}>The monthly offering is unavailable. Check RevenueCat offering configuration.</Text>}
          {isConfigured && Platform.OS !== 'web' ? <Pressable accessibilityLabel="Restore purchases" disabled={Boolean(purchasingPlanId)} onPress={() => void handleRestorePurchases()} style={[styles.secondaryButton, Boolean(purchasingPlanId) && styles.secondaryButtonDisabled]}>
            {purchasingPlanId === 'restore' ? <ActivityIndicator color="#890620" size="small" /> : <Text style={styles.secondaryButtonText}>restore purchases</Text>}
          </Pressable> : null}
          {error || purchaseMessage ? <Text accessibilityLiveRegion="polite" style={error || purchaseMessage?.kind === 'error' ? styles.errorText : styles.successText}>{error ?? purchaseMessage?.text}</Text> : null}
        </ScrollView>
        <Pressable accessibilityLabel="Go back to settings" onPress={() => router.canGoBack() ? router.back() : router.replace('/preferences')} style={styles.backButton}><Text style={styles.backText}>back</Text></Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ebd4cb', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#ebd4cb', flex: 1, justifyContent: 'center' },
  page: { flex: 1, gap: 14, padding: 28 },
  header: { gap: 4 },
  wordmark: { color: '#890620', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginBottom: 4 },
  heading: { color: '#2c0703', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  list: { gap: 12, paddingBottom: 8 },
  plan: { backgroundColor: '#fff8f5', borderColor: '#cda49b', borderRadius: 16, borderWidth: 1, gap: 14, padding: 18 },
  planCopy: { gap: 3 },
  planTitle: { color: '#2c0703', fontSize: 19, fontWeight: '700' },
  planDescription: { color: '#79534c', fontSize: 14, lineHeight: 19 },
  planPrice: { color: '#890620', fontSize: 17, fontWeight: '800', marginTop: 3 },
  helpText: { color: '#79534c', fontSize: 14, lineHeight: 20 },
  primaryButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', borderColor: '#890620', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  secondaryButtonText: { color: '#890620', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { backgroundColor: '#bd8d87' },
  secondaryButtonDisabled: { borderColor: '#bd8d87' },
  errorText: { color: '#890620', fontSize: 13, lineHeight: 18 },
  successText: { color: '#386641', fontSize: 13, lineHeight: 18 },
  backButton: { alignItems: 'center', backgroundColor: '#890620', borderRadius: 12, paddingVertical: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
