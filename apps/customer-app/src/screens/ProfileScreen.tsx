import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '../context/AuthContext';
import { getStoreSettings } from '../lib/api';

interface ProfileScreenProps {
  onOpenOrders: () => void;
  onOpenAddresses: () => void;
  onOpenAuth: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenOrders,
  onOpenAddresses,
  onOpenAuth,
}) => {
  const { user, profile, isAuthenticated, signOut } = useCustomerAuth();

  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  });

  const handleCallSupport = () => {
    const phone = storeSettings?.support_phone || '+919876543210';
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Customer Care', `Reach us at: ${phone}`);
    });
  };

  const handleEmailSupport = () => {
    const email = storeSettings?.support_email || 'support@mymartdelivery.in';
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Customer Care', `Email us at: ${email}`);
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* User Card */}
        <View style={styles.userCard}>
          {isAuthenticated ? (
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{profile?.full_name || 'MyMart Customer'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                {profile?.phone ? (
                  <Text style={styles.userPhone}>+91 {profile.phone}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.guestBox}>
              <Text style={styles.guestTitle}>Welcome to MyMart</Text>
              <Text style={styles.guestSubtitle}>
                Sign in to manage addresses, view order history, and save preferences.
              </Text>
              <TouchableOpacity onPress={onOpenAuth} style={styles.loginBtn}>
                <Text style={styles.loginBtnText}>Login or Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          <TouchableOpacity onPress={onOpenOrders} style={styles.menuItem}>
            <Text style={styles.menuIcon}>📦</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>My Orders</Text>
              <Text style={styles.menuSub}>Track live & past grocery deliveries</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onOpenAddresses} style={styles.menuItem}>
            <Text style={styles.menuIcon}>📍</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Saved Delivery Addresses</Text>
              <Text style={styles.menuSub}>Add or edit home, work, or apartment addresses</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Support Card */}
        <View style={styles.menuCard}>
          <Text style={styles.sectionHeading}>Help & Customer Support</Text>

          <TouchableOpacity onPress={handleCallSupport} style={styles.menuItem}>
            <Text style={styles.menuIcon}>📞</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Call Support Helpline</Text>
              <Text style={styles.menuSub}>
                {storeSettings?.support_phone || '+91 9876543210'}
              </Text>
            </View>
            <Text style={styles.menuArrow}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleEmailSupport} style={styles.menuItem}>
            <Text style={styles.menuIcon}>✉️</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Email Support</Text>
              <Text style={styles.menuSub}>
                {storeSettings?.support_email || 'support@mymartdelivery.in'}
              </Text>
            </View>
            <Text style={styles.menuArrow}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Option */}
        {isAuthenticated && (
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Log Out from Account</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>MyMart Quick Commerce v1.0.0</Text>
          <Text style={styles.footerSub}>Superfast 10-15 minute grocery deliveries</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  guestBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  guestSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  loginBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  menuSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  menuArrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  logoutBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  footerSub: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 2,
  },
});
