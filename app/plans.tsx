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
  const { currentOffering, customerInfo, error, isClassBudActive, isConfigured, isLoading, purchasePackage, restorePurchases } = useSubscriptions();
  const plans = currentOffering?.availablePackages ?? [];

  const handlePurchase = async (plan: PurchasesPackage) => {
    if (purchasingPlanId) return;

    setPurchasingPlanId(plan.identifier);
    setPurchaseMessage(null);
    try {
      const customerInfo = await purchasePackage(plan);
      if (!customerInfo.entitlements.active[CLASS_BUD_ENTITLEMENT]) {
        setPurchaseMessage({ kind: 'error', text: 'Your purchase completed, but access could not be confirmed yet.' });
        return;
      }
      setPurchaseMessage({ kind: 'success', text: 'plan updated' });
    } catch (error) {
      if (userCancelled(error)) return;
      setPurchaseMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not complete the purchase.' });
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
      setPurchaseMessage({ kind: 'success', text: customerInfo.activeSubscriptions.length ? 'purchases restored' : 'no active purchases found' });
    } catch (error) {
      setPurchaseMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not restore purchases.' });
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
          <Text style={styles.subtitle}>choose the plan that works for you</Text>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator>
          {Platform.OS === 'web' ? (
            <Text style={styles.helpText}>plans are available in the iOS or Android app.</Text>
          ) : !isConfigured ? (
            <Text style={styles.helpText}>plans will appear after RevenueCat is configured for this build.</Text>
          ) : isLoading ? (
            <ActivityIndicator color="#890620" size="small" />
          ) : plans.length ? plans.map((plan) => {
            const isCurrentPlan = isClassBudActive && customerInfo?.activeSubscriptions.includes(plan.product.identifier);
            const isPurchasing = purchasingPlanId === plan.identifier;
            return (
              <View key={plan.identifier} style={styles.plan}>
                <View style={styles.planCopy}>
                  <Text style={styles.planTitle}>{plan.product.title}</Text>
                  <Text style={styles.planDescription}>{plan.product.description}</Text>
                  <Text style={styles.planPrice}>{plan.product.priceString}</Text>
                </View>
                <Pressable
                  accessibilityLabel={`${isCurrentPlan ? 'Current' : 'Choose'} ${plan.product.title} plan`}
                  disabled={isCurrentPlan || Boolean(purchasingPlanId)}
                  onPress={() => void handlePurchase(plan)}
                  style={[styles.primaryButton, (isCurrentPlan || Boolean(purchasingPlanId)) && styles.buttonDisabled]}
                >
                  {isPurchasing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>{isCurrentPlan ? 'current plan' : 'choose plan'}</Text>}
                </Pressable>
              </View>
            );
          }) : <Text style={styles.helpText}>no plans are available right now.</Text>}

          {isConfigured && Platform.OS !== 'web' ? (
            <>
            <Pressable accessibilityLabel="Restore purchases" disabled={Boolean(purchasingPlanId)} onPress={() => void handleRestorePurchases()} style={[styles.secondaryButton, Boolean(purchasingPlanId) && styles.secondaryButtonDisabled]}>
              {purchasingPlanId === 'restore' ? <ActivityIndicator color="#890620" size="small" /> : <Text style={styles.secondaryButtonText}>restore purchases</Text>}
            </Pressable>
            </>
          ) : null}
          {error || purchaseMessage ? <Text accessibilityLiveRegion="polite" style={error || purchaseMessage?.kind === 'error' ? styles.errorText : styles.successText}>{error ?? purchaseMessage?.text}</Text> : null}
        </ScrollView>

        <Pressable
          accessibilityLabel="Go back to settings"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/preferences')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>back</Text>
        </Pressable>
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
  subtitle: { color: '#79534c', fontSize: 14 },
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
