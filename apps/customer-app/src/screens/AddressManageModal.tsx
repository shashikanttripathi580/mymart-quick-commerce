import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CustomerAddress,
  isValidIndianMobile,
  isValidIndianPincode,
  normalizeIndianMobile,
  formatIndianAddress,
  INDIAN_STATES,
} from '@mymart/shared';
import { getCustomerAddresses, addCustomerAddress, deleteCustomerAddress, getStoreSettings } from '../lib/api';

interface AddressManageModalProps {
  onClose: () => void;
  onSelectAddress?: (address: CustomerAddress) => void;
}

export const AddressManageModal: React.FC<AddressManageModalProps> = ({
  onClose,
  onSelectAddress,
}) => {
  const queryClient = useQueryClient();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560038');
  const [isDefault, setIsDefault] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['customer-addresses'],
    queryFn: getCustomerAddresses,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);

      if (!fullName.trim()) throw new Error('Please enter recipient full name');
      if (!isValidIndianMobile(phone)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number');
      }
      if (!houseNumber.trim()) throw new Error('Please enter House/Flat number');
      if (!street.trim()) throw new Error('Please enter Street name');
      if (!area.trim()) throw new Error('Please enter Area / Locality');
      if (!isValidIndianPincode(pincode)) {
        throw new Error('Please enter a valid 6-digit PIN code');
      }

      // Check PIN code serviceability
      const isServiceable = storeSettings?.serviceable_pincodes?.includes(pincode.trim());
      if (!isServiceable) {
        throw new Error(
          `PIN code ${pincode} is currently not in our quick commerce delivery zone.`
        );
      }

      return addCustomerAddress({
        full_name: fullName.trim(),
        phone: normalizeIndianMobile(phone),
        house_number: houseNumber.trim(),
        street: street.trim(),
        area: area.trim(),
        landmark: landmark.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        is_default: isDefault,
      });
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      setIsAddingNew(false);
      if (onSelectAddress) {
        onSelectAddress(newAddress);
      }
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Failed to save address');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomerAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isAddingNew ? 'Add New Delivery Address' : 'Saved Delivery Addresses'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {isAddingNew ? (
            <View style={styles.formContainer}>
              {formError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Recipient Name *</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Rahul Sharma"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>10-Digit Mobile Number *</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="9876543210"
                  style={styles.input}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>House/Flat No *</Text>
                  <TextInput
                    value={houseNumber}
                    onChangeText={setHouseNumber}
                    placeholder="Apt 402, Block B"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>6-Digit PIN Code *</Text>
                  <TextInput
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="560038"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Street / Building *</Text>
                <TextInput
                  value={street}
                  onChangeText={setStreet}
                  placeholder="12th Main Road"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Area / Colony *</Text>
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="Indiranagar HAL 2nd Stage"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Landmark (Optional)</Text>
                <TextInput
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="Near Metro Station or Police Station"
                  style={styles.input}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="Bengaluru"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    value={state}
                    onChangeText={setState}
                    placeholder="Karnataka"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  onPress={() => setIsDefault(!isDefault)}
                  style={[styles.checkbox, isDefault && styles.checkboxChecked]}
                >
                  {isDefault && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Set as Default Delivery Address</Text>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  onPress={() => setIsAddingNew(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => addMutation.mutate()}
                  disabled={addMutation.isPending}
                  style={styles.saveBtn}
                >
                  {addMutation.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Address</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <TouchableOpacity
                onPress={() => {
                  setFormError(null);
                  setIsAddingNew(true);
                }}
                style={styles.addNewButton}
              >
                <Text style={styles.addNewButtonText}>+ Add New Address</Text>
              </TouchableOpacity>

              {isLoading ? (
                <ActivityIndicator color="#16a34a" style={{ marginTop: 20 }} />
              ) : addresses && addresses.length > 0 ? (
                addresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (onSelectAddress) {
                        onSelectAddress(addr);
                        onClose();
                      }
                    }}
                    style={styles.addressCard}
                  >
                    <View style={styles.addressCardHeader}>
                      <Text style={styles.cardName}>{addr.full_name}</Text>
                      {addr.is_default && (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>DEFAULT</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.cardPhone}>📱 +91 {addr.phone}</Text>
                    <Text style={styles.cardFullAddress}>
                      {formatIndianAddress(addr)}
                    </Text>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        onPress={() => deleteMutation.mutate(addr.id)}
                        style={styles.deleteBtn}
                      >
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyAddress}>
                  <Text style={styles.emptyAddressText}>No saved addresses found.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '60%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    gap: 12,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#16a34a',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorText: {
    color: '#e11d48',
    fontSize: 11,
    fontWeight: '700',
  },
  listContainer: {
    gap: 12,
  },
  addNewButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  addNewButtonText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '900',
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  defaultPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultPillText: {
    color: '#15803d',
    fontSize: 9,
    fontWeight: '900',
  },
  cardPhone: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  cardFullAddress: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtnText: {
    color: '#e11d48',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyAddress: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyAddressText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});
