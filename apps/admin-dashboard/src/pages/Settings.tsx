import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Store,
  Phone,
  Mail,
  Truck,
  MapPin,
} from 'lucide-react';
import {
  rupeesToPaise,
  paiseToRupeesNumber,
  isValidIndianPincode,
  StoreSettings,
} from '@mymart/shared';
import { getStoreSettings, updateStoreSettings } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();

  const [storeName, setStoreName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState<number | ''>(25);
  const [minOrderRupees, setMinOrderRupees] = useState<number | ''>(99);
  const [freeDeliveryThresholdRupees, setFreeDeliveryThresholdRupees] = useState<number | ''>(249);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [serviceablePincodes, setServiceablePincodes] = useState<string[]>([]);
  const [storeAddress, setStoreAddress] = useState('');

  const [newPincodeInput, setNewPincodeInput] = useState('');
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  });

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name);
      setLogoUrl(settings.logo_url);
      setSupportPhone(settings.support_phone);
      setSupportEmail(settings.support_email);
      setDeliveryFeeRupees(paiseToRupeesNumber(settings.delivery_fee_paise));
      setMinOrderRupees(paiseToRupeesNumber(settings.minimum_order_paise));
      setFreeDeliveryThresholdRupees(paiseToRupeesNumber(settings.free_delivery_threshold_paise));
      setIsStoreOpen(settings.is_store_open);
      setServiceablePincodes(settings.serviceable_pincodes || []);
      setStoreAddress(settings.store_address);
    }
  }, [settings]);

  const handleAddPincode = () => {
    setPincodeError(null);
    const cleaned = newPincodeInput.trim();
    if (!isValidIndianPincode(cleaned)) {
      setPincodeError('Please enter a valid 6-digit Indian PIN code (e.g. 560038)');
      return;
    }
    if (serviceablePincodes.includes(cleaned)) {
      setPincodeError('PIN code is already in the serviceable list');
      return;
    }

    setServiceablePincodes([...serviceablePincodes, cleaned]);
    setNewPincodeInput('');
  };

  const handleRemovePincode = (pincodeToRemove: string) => {
    setServiceablePincodes(serviceablePincodes.filter((pin) => pin !== pincodeToRemove));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaveError(null);
      setSaveSuccess(false);

      if (!storeName.trim()) throw new Error('Store name cannot be empty');

      const payload: Partial<StoreSettings> = {
        store_name: storeName.trim(),
        logo_url: logoUrl.trim(),
        support_phone: supportPhone.trim(),
        support_email: supportEmail.trim(),
        delivery_fee_paise: rupeesToPaise(deliveryFeeRupees),
        minimum_order_paise: rupeesToPaise(minOrderRupees),
        free_delivery_threshold_paise: rupeesToPaise(freeDeliveryThresholdRupees),
        is_store_open: isStoreOpen,
        serviceable_pincodes: serviceablePincodes,
        store_address: storeAddress.trim(),
      };

      return updateStoreSettings(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || 'Failed to update store settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
        <p className="text-sm font-semibold">Loading store settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Store & Delivery Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure order rules, delivery fees, customer contact, and delivery PIN codes
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Settings</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Store settings updated successfully and broadcast to all connected apps!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Master Store Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              Store Open / Closed Master Switch
            </h2>
            <p className="text-xs text-slate-500 max-w-lg">
              When closed, customer mobile applications show a &quot;Store Temporarily Closed&quot; banner and disable the checkout button.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isStoreOpen ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isStoreOpen ? 'Open (Accepting Orders)' : 'Closed'}
            </span>
            <button
              type="button"
              onClick={() => setIsStoreOpen(!isStoreOpen)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isStoreOpen ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isStoreOpen ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* General Brand Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            Brand & Support Info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Store Name
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="MyMart Quick Commerce"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Support Mobile Number (for Customers)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Support Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@mymartdelivery.in"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Physical Store / Warehouse Address
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Plot 42, Green Glen Layout, Bellandur, Bengaluru - 560103"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <ImageUploader
              value={logoUrl}
              onChange={(url) => setLogoUrl(url)}
              label="Store Brand Logo"
            />
          </div>
        </div>

        {/* Pricing & Delivery Charges */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            Delivery Fee & Order Constraints
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Standard Delivery Charge (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={deliveryFeeRupees}
                onChange={(e) =>
                  setDeliveryFeeRupees(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="25"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Stored as: {rupeesToPaise(deliveryFeeRupees)} paise
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minimum Order Value (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minOrderRupees}
                onChange={(e) =>
                  setMinOrderRupees(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="99"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Stored as: {rupeesToPaise(minOrderRupees)} paise
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Free Delivery Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={freeDeliveryThresholdRupees}
                onChange={(e) =>
                  setFreeDeliveryThresholdRupees(
                    e.target.value === '' ? '' : parseFloat(e.target.value)
                  )
                }
                placeholder="249"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Stored as: {rupeesToPaise(freeDeliveryThresholdRupees)} paise
              </span>
            </div>
          </div>
        </div>

        {/* Serviceable PIN Codes */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Serviceable Postal PIN Codes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only delivery addresses inside these 6-digit postal areas will be permitted to place orders.
            </p>
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              maxLength={6}
              value={newPincodeInput}
              onChange={(e) => setNewPincodeInput(e.target.value)}
              placeholder="Enter 6-digit PIN (e.g. 560038)"
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPincode();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddPincode}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {pincodeError && (
            <p className="text-xs text-rose-600 font-medium">{pincodeError}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {serviceablePincodes.map((pin) => (
              <span
                key={pin}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-mono font-bold"
              >
                {pin}
                <button
                  type="button"
                  onClick={() => handleRemovePincode(pin)}
                  className="p-0.5 hover:bg-emerald-200 text-emerald-700 rounded-full transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
